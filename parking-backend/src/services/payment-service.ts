import { prisma } from "../lib/prisma";
import type { PaymentMethod, PaymentStatus } from "../../generated/prisma/enums";

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
    vehicle: { id: number; licensePlate: string };
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
      vehicle: { select: { id: true, licensePlate: true } },
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

/**
 * Create a payment for a transaction that is AwaitingPayment.
 */
export async function createPayment(data: {
  transactionId: number;
  paymentMethod: PaymentMethod;
  providerReference?: string;
}): Promise<PaymentDetail> {
  return prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.findUnique({
      where: { id: data.transactionId },
      select: { id: true, status: true },
    });
    if (!txn) throw new Error("Transaction not found");
    if (txn.status !== "AwaitingPayment") {
      throw new Error("Transaction is not awaiting payment");
    }

    // Check no existing payment
    const existing = await tx.payment.findUnique({
      where: { transactionId: data.transactionId },
    });
    if (existing) throw new Error("Payment already exists for this transaction");

    return tx.payment.create({
      data: {
        transactionId: data.transactionId,
        paymentMethod: data.paymentMethod,
        providerReference: data.providerReference ?? null,
        status: "Pending",
      },
      select: paymentSelect,
    });
  });
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
