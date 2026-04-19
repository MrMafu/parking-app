import { prisma } from "../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import type { TransactionStatus } from "../../generated/prisma/enums";

export type TransactionDetail = {
  id: number;
  attendant: { id: number; fullname: string; username: string } | null;
  tagId: string | null;
  parkingArea: { id: number; name: string };
  rate: { id: number; name: string; rateType: string; priceCents: number } | null;
  rateSnapshot: unknown;
  entryTime: Date;
  exitTime: Date | null;
  durationMinutes: number | null;
  amountCents: number | null;
  status: TransactionStatus;
  payment: {
    id: number;
    paymentMethod: string;
    status: string;
    processedAt: Date | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

const transactionSelect = {
  id: true,
  tagId: true,
  entryTime: true,
  exitTime: true,
  durationMinutes: true,
  amountCents: true,
  rateSnapshot: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  attendant: { select: { id: true, fullname: true, username: true } },
  parkingArea: { select: { id: true, name: true } },
  rate: { select: { id: true, name: true, rateType: true, priceCents: true } },
  payment: {
    select: {
      id: true,
      paymentMethod: true,
      status: true,
      processedAt: true,
    },
  },
} as const;

export async function listTransactions(filters?: {
  status?: TransactionStatus;
  areaId?: number;
}): Promise<TransactionDetail[]> {
  return prisma.transaction.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.areaId && { areaId: filters.areaId }),
    },
    select: transactionSelect,
    orderBy: { id: "desc" },
  });
}

export async function getTransactionById(
  id: number
): Promise<TransactionDetail | null> {
  return prisma.transaction.findUnique({
    where: { id },
    select: transactionSelect,
  });
}

/**
 * Find an open or awaiting-payment transaction by RFID tag ID.
 */
export async function getTransactionByTagId(
  tagId: string
): Promise<TransactionDetail | null> {
  return prisma.transaction.findFirst({
    where: {
      tagId,
      status: { in: ["Open", "AwaitingPayment"] },
    },
    select: transactionSelect,
    orderBy: { id: "desc" },
  });
}

/**
 * Calculate the amount for a transaction based on the rate snapshot.
 */
export function calculateAmount(
  rateSnapshot: { rateType: string; priceCents: number; graceMinutes: number } | null,
  durationMinutes: number
): number {
  if (!rateSnapshot) return 0;

  const billableMinutes = Math.max(0, durationMinutes - rateSnapshot.graceMinutes);
  if (billableMinutes === 0) return 0;

  switch (rateSnapshot.rateType) {
    case "Hourly": {
      const hours = Math.ceil(billableMinutes / 60);
      return hours * rateSnapshot.priceCents;
    }
    case "Daily": {
      const days = Math.ceil(billableMinutes / (60 * 24));
      return days * rateSnapshot.priceCents;
    }
    case "Flat":
      return rateSnapshot.priceCents;
    default:
      return 0;
  }
}

/**
 * Cancel a transaction.
 */
export async function cancelTransaction(id: number): Promise<TransactionDetail> {
  const txn = await prisma.transaction.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!txn) throw new Error("Transaction not found");
  if (txn.status === "Closed") throw new Error("Cannot cancel a closed transaction");
  if (txn.status === "Cancelled") throw new Error("Transaction is already cancelled");

  return prisma.transaction.update({
    where: { id },
    data: { status: "Cancelled" },
    select: transactionSelect,
  });
}

/**
 * Create a new RFID-based transaction (tag entry).
 * No vehicle registration needed — just tag ID and parking area.
 * Rate is not assigned at entry; it will be assigned at exit when vehicle type is selected.
 */
export async function rfidEntry(data: {
  tagId: string;
  areaId: number;
  attendantId?: number;
}): Promise<TransactionDetail> {
  return prisma.$transaction(async (tx): Promise<TransactionDetail> => {
    // Check for existing open or awaiting-payment transaction for this tag
    const existing = await tx.transaction.findFirst({
      where: { tagId: data.tagId, status: { in: ["Open", "AwaitingPayment"] } },
    });
    if (existing) {
      throw new Error("Tag already has an open transaction");
    }

    // Check parking area exists, is open, and has capacity
    const area = await tx.parkingArea.findUnique({
      where: { id: data.areaId },
    });
    if (!area) throw new Error("Parking area not found");
    if (area.status !== "Open") throw new Error("Parking area is not open");

    const occupied = await tx.transaction.count({
      where: { areaId: data.areaId, status: "Open" },
    });
    if (occupied >= area.capacity) {
      throw new Error("Parking area is full");
    }

    const now = new Date();

    return tx.transaction.create({
      data: {
        tagId: data.tagId,
        areaId: data.areaId,
        attendantId: data.attendantId ?? null,
        entryTime: now,
        status: "Open",
      },
      select: transactionSelect,
    });
  });
}

/**
 * RFID exit — scan tag, look up rate from parking area's vehicle type, calculate charges.
 * Moves transaction from Open to AwaitingPayment.
 */
export async function rfidExit(data: {
  tagId: string;
}): Promise<TransactionDetail> {
  return prisma.$transaction(async (tx): Promise<TransactionDetail> => {
    const txn = await tx.transaction.findFirst({
      where: { tagId: data.tagId, status: "Open" },
      select: { id: true, status: true, entryTime: true, areaId: true },
    });
    if (!txn) throw new Error("No open transaction found for this tag");

    // Get vehicle type from the parking area
    const area = await tx.parkingArea.findUnique({
      where: { id: txn.areaId },
      select: { vehicleTypeId: true },
    });
    if (!area) throw new Error("Parking area not found");

    const now = new Date();
    const durationMinutes = Math.round(
      (now.getTime() - txn.entryTime.getTime()) / 60000
    );

    // Find applicable rate for the area's vehicle type
    const rate = await tx.rate.findFirst({
      where: {
        vehicleTypeId: area.vehicleTypeId,
        validFrom: { lte: now },
        validTo: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    const rateSnapshot = rate
      ? {
          id: rate.id,
          name: rate.name,
          rateType: rate.rateType,
          priceCents: rate.priceCents,
          graceMinutes: rate.graceMinutes,
        }
      : null;

    const amountCents = calculateAmount(
      rateSnapshot,
      durationMinutes
    );

    return tx.transaction.update({
      where: { id: txn.id },
      data: {
        exitTime: now,
        durationMinutes,
        amountCents,
        rateId: rate?.id ?? null,
        rateSnapshot: rateSnapshot ?? Prisma.DbNull,
        status: "AwaitingPayment",
      },
      select: transactionSelect,
    });
  });
}
