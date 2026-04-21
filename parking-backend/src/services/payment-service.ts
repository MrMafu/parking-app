import { prisma } from "../lib/prisma";
import type { PaymentMethod, PaymentStatus } from "../../generated/prisma/enums";
import {
  createQrisCharge,
  getTransactionStatus,
  verifySignature,
  MIDTRANS_SERVER_KEY,
  MIDTRANS_SIMULATE,
} from "../lib/midtrans";

export type PaymentDetail = {
  id: number;
  transactionId: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  providerReference: string | null;
  processedAt: Date | null;
  transaction: {
    id: number;
    amountCents: number | null;
    status: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

const paymentSelect = {
  id: true,
  transactionId: true,
  paymentMethod: true,
  status: true,
  providerReference: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
  transaction: {
    select: {
      id: true,
      amountCents: true,
      status: true,
    },
  },
} as const;

export async function listPayments(): Promise<PaymentDetail[]> {
  return prisma.payment.findMany({
    select: paymentSelect,
    orderBy: { id: "desc" },
  });
}

export async function getPaymentById(
  id: number
): Promise<PaymentDetail | null> {
  return prisma.payment.findUnique({
    where: { id },
    select: paymentSelect,
  });
}

export async function getPaymentByTransactionId(
  transactionId: number
): Promise<PaymentDetail | null> {
  return prisma.payment.findUnique({
    where: { transactionId },
    select: paymentSelect,
  });
}

export type CreatePaymentResult = {
  payment: PaymentDetail;
  qrImageUrl: string | null;
};

/**
 * Create a payment for a transaction that is AwaitingPayment.
 * If paymentMethod is Qris, creates a Midtrans QRIS charge and returns the QR image URL.
 */
export async function createPayment(data: {
  transactionId: number;
  paymentMethod: PaymentMethod;
}): Promise<CreatePaymentResult> {
  // Validate transaction first
  const txn = await prisma.transaction.findUnique({
    where: { id: data.transactionId },
    select: { id: true, status: true, amountCents: true },
  });
  if (!txn) throw new Error("Transaction not found");
  if (txn.status !== "AwaitingPayment") {
    throw new Error("Transaction is not awaiting payment");
  }

  const existing = await prisma.payment.findUnique({
    where: { transactionId: data.transactionId },
  });
  if (existing) throw new Error("Payment already exists for this transaction");

  let providerReference: string | null = null;
  let qrImageUrl: string | null = null;

  // For QRIS, create Midtrans charge before creating DB record
  if (data.paymentMethod === "Qris") {
    const grossAmount = Math.round((txn.amountCents ?? 0) / 100);
    if (grossAmount <= 0) {
      throw new Error("Transaction amount must be greater than zero");
    }

    const orderId = `PARK-${data.transactionId}-${Date.now()}`;
    const charge = await createQrisCharge({
      orderId,
      grossAmount,
      expiryMinutes: 5,
    });

    providerReference = charge.order_id;

    // Extract QR image URL from actions (works for both gopay and qris)
    const qrAction = charge.actions?.find(
      (a) => a.name === "generate-qr-code"
    ) ?? charge.actions?.find(
      (a) => a.name === "deeplink-redirect"
    );
    qrImageUrl = qrAction?.url ?? null;
  }

  const payment = await prisma.payment.create({
    data: {
      transactionId: data.transactionId,
      paymentMethod: data.paymentMethod,
      providerReference,
      status: "Pending",
    },
    select: paymentSelect,
  });

  return { payment, qrImageUrl };
}

/**
 * Complete a payment — marks it as completed and closes the transaction.
 */
export async function completePayment(
  paymentId: number,
  providerReference?: string
): Promise<PaymentDetail> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, transactionId: true },
    });
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "Pending") {
      throw new Error("Payment is not pending");
    }

    // Close the transaction
    await tx.transaction.update({
      where: { id: payment.transactionId },
      data: { status: "Closed" },
    });

    return tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "Completed",
        processedAt: new Date(),
        ...(providerReference && { providerReference }),
      },
      select: paymentSelect,
    });
  });
}

/**
 * Fail a payment — marks it as failed, reverts transaction to AwaitingPayment.
 */
export async function failPayment(paymentId: number): Promise<PaymentDetail> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "Pending") {
    throw new Error("Payment is not pending");
  }

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: "Failed" },
    select: paymentSelect,
  });
}

/**
 * Handle Midtrans webhook notification.
 * Verifies signature, then completes or fails the payment based on transaction_status.
 */
export async function handleMidtransNotification(body: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  transaction_id: string;
  fraud_status?: string;
}): Promise<void> {
  // Verify signature
  const valid = verifySignature(
    body.order_id,
    body.status_code,
    body.gross_amount,
    MIDTRANS_SERVER_KEY!,
    body.signature_key
  );
  if (!valid) {
    throw new Error("Invalid signature");
  }

  // Find payment by providerReference (order_id)
  const payment = await prisma.payment.findFirst({
    where: { providerReference: body.order_id },
    select: { id: true, status: true, transactionId: true },
  });
  if (!payment) return; // Unknown order, ignore

  // Already processed
  if (payment.status !== "Pending") return;

  const status = body.transaction_status;

  if (status === "settlement" || status === "capture") {
    // Complete the payment
    await completePayment(payment.id, body.transaction_id);
  } else if (status === "expire" || status === "cancel" || status === "deny") {
    // Fail the payment
    await failPayment(payment.id);
  }
  // "pending" status — do nothing, payment is already Pending
}

/**
 * Check Midtrans payment status by polling their API.
 * Returns the current status string.
 */
export async function checkPaymentStatus(
  paymentId: number
): Promise<{ paymentStatus: string; midtransStatus: string | null }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, providerReference: true },
  });
  if (!payment) throw new Error("Payment not found");

  // If already completed/failed, just return current status
  if (payment.status !== "Pending" || !payment.providerReference) {
    return { paymentStatus: payment.status, midtransStatus: null };
  }

  // In simulation mode, just return current status (no Midtrans to poll)
  if (MIDTRANS_SIMULATE) {
    return { paymentStatus: payment.status, midtransStatus: "pending" };
  }

  // Poll Midtrans
  const mtStatus = await getTransactionStatus(payment.providerReference);
  const txnStatus = mtStatus.transaction_status;

  if (txnStatus === "settlement" || txnStatus === "capture") {
    await completePayment(payment.id, mtStatus.transaction_id);
    return { paymentStatus: "Completed", midtransStatus: txnStatus };
  } else if (
    txnStatus === "expire" ||
    txnStatus === "cancel" ||
    txnStatus === "deny"
  ) {
    await failPayment(payment.id);
    return { paymentStatus: "Failed", midtransStatus: txnStatus };
  }

  return { paymentStatus: "Pending", midtransStatus: txnStatus };
}

/**
 * Simulate a successful payment (for development when Midtrans is not available).
 * Only works when MIDTRANS_SIMULATE=true.
 */
export async function simulatePaymentSuccess(
  paymentId: number
): Promise<PaymentDetail> {
  if (!MIDTRANS_SIMULATE) {
    throw new Error("Simulation is not enabled");
  }
  return completePayment(paymentId, `SIM-SETTLE-${Date.now()}`);
}
