import { prisma } from "../lib/prisma.js";

export type RefundDetail = {
  id: number;
  paymentId: number;
  amountCents: number;
  reason: string;
  processedBy: { id: number; fullname: string; username: string } | null;
  processedAt: Date;
  payment: {
    id: number;
    transactionId: number;
    paymentMethod: string;
    status: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

const refundSelect = {
  id: true,
  paymentId: true,
  amountCents: true,
  reason: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
  processedBy: { select: { id: true, fullname: true, username: true } },
  payment: {
    select: {
      id: true,
      transactionId: true,
      paymentMethod: true,
      status: true,
    },
  },
} as const;

export async function listRefunds(): Promise<RefundDetail[]> {
  return prisma.refund.findMany({
    select: refundSelect,
    orderBy: { id: "desc" },
  });
}

export async function getRefundById(
  id: number
): Promise<RefundDetail | null> {
  return prisma.refund.findUnique({
    where: { id },
    select: refundSelect,
  });
}

export async function getRefundByPaymentId(
  paymentId: number
): Promise<RefundDetail | null> {
  return prisma.refund.findUnique({
    where: { paymentId },
    select: refundSelect,
  });
}

/**
 * Process a refund for a completed payment.
 */
export async function createRefund(data: {
  paymentId: number;
  amountCents: number;
  reason: string;
  processedById?: number;
}): Promise<RefundDetail> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: data.paymentId },
      select: {
        id: true,
        status: true,
        transaction: { select: { amountCents: true } },
      },
    });
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "Completed") {
      throw new Error("Can only refund a completed payment");
    }

    // Check no existing refund
    const existing = await tx.refund.findUnique({
      where: { paymentId: data.paymentId },
    });
    if (existing) throw new Error("Refund already exists for this payment");

    // Validate refund amount doesn't exceed payment
    const maxAmount = payment.transaction.amountCents ?? 0;
    if (data.amountCents > maxAmount) {
      throw new Error("Refund amount exceeds payment amount");
    }

    return tx.refund.create({
      data: {
        paymentId: data.paymentId,
        amountCents: data.amountCents,
        reason: data.reason,
        processedById: data.processedById ?? null,
        processedAt: new Date(),
      },
      select: refundSelect,
    });
  });
}
