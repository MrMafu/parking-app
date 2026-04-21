import { prisma } from "../lib/prisma.js";

export type ReceiptDetail = {
  id: number;
  transactionId: number;
  paymentId: number;
  receiptData: unknown;
  printedBy: { id: number; fullname: string; username: string } | null;
  printedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const receiptSelect = {
  id: true,
  transactionId: true,
  paymentId: true,
  receiptData: true,
  printedAt: true,
  createdAt: true,
  updatedAt: true,
  printedBy: { select: { id: true, fullname: true, username: true } },
} as const;

export async function listReceipts(): Promise<ReceiptDetail[]> {
  return prisma.receipt.findMany({
    select: receiptSelect,
    orderBy: { id: "desc" },
  });
}

export async function getReceiptById(
  id: number
): Promise<ReceiptDetail | null> {
  return prisma.receipt.findUnique({
    where: { id },
    select: receiptSelect,
  });
}

export async function getReceiptByTransactionId(
  transactionId: number
): Promise<ReceiptDetail | null> {
  return prisma.receipt.findFirst({
    where: { transactionId },
    select: receiptSelect,
    orderBy: { id: "desc" },
  });
}

/**
 * Generate a receipt for a completed payment.
 */
export async function createReceipt(data: {
  transactionId: number;
  paymentId: number;
  printedById?: number;
}): Promise<ReceiptDetail> {
  return prisma.$transaction(async (tx) => {
    // Verify payment exists and is completed
    const payment = await tx.payment.findUnique({
      where: { id: data.paymentId },
      select: {
        id: true,
        status: true,
        transactionId: true,
        paymentMethod: true,
        processedAt: true,
      },
    });
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "Completed") {
      throw new Error("Payment is not completed");
    }
    if (payment.transactionId !== data.transactionId) {
      throw new Error("Payment does not belong to this transaction");
    }

    // Fetch transaction details for receipt data
    const txn = await tx.transaction.findUnique({
      where: { id: data.transactionId },
      select: {
        id: true,
        tagId: true,
        entryTime: true,
        exitTime: true,
        durationMinutes: true,
        amountCents: true,
        rateSnapshot: true,
        parkingArea: { select: { name: true } },
      },
    });
    if (!txn) throw new Error("Transaction not found");

    const receiptData = {
      transactionId: txn.id,
      tagId: txn.tagId,
      parkingArea: txn.parkingArea.name,
      entryTime: txn.entryTime.toISOString(),
      exitTime: txn.exitTime?.toISOString() ?? null,
      durationMinutes: txn.durationMinutes,
      amountCents: txn.amountCents,
      rateSnapshot: txn.rateSnapshot,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.processedAt?.toISOString() ?? null,
      receiptNumber: `RCP-${Date.now()}`,
    };

    return tx.receipt.create({
      data: {
        transactionId: data.transactionId,
        paymentId: data.paymentId,
        receiptData,
        printedById: data.printedById ?? null,
        printedAt: new Date(),
      },
      select: receiptSelect,
    });
  });
}
