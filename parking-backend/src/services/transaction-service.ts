import { prisma } from "../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import type { TransactionStatus } from "../../generated/prisma/enums";

export type TransactionDetail = {
  id: number;
  attendant: { id: number; fullname: string; username: string } | null;
  vehicle: {
    id: number;
    licensePlate: string;
    color: string;
    ownerName: string;
    vehicleType: { id: number; name: string };
  };
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
  entryTime: true,
  exitTime: true,
  durationMinutes: true,
  amountCents: true,
  rateSnapshot: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  attendant: { select: { id: true, fullname: true, username: true } },
  vehicle: {
    select: {
      id: true,
      licensePlate: true,
      color: true,
      ownerName: true,
      vehicleType: { select: { id: true, name: true } },
    },
  },
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
  vehicleId?: number;
}): Promise<TransactionDetail[]> {
  return prisma.transaction.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.areaId && { areaId: filters.areaId }),
      ...(filters?.vehicleId && { vehicleId: filters.vehicleId }),
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
 * Create a new transaction (vehicle entry).
 * Validates parking area capacity before allowing entry.
 */
export async function createTransaction(data: {
  vehicleId: number;
  areaId: number;
  attendantId: number;
}): Promise<TransactionDetail> {
  return prisma.$transaction(async (tx): Promise<TransactionDetail> => {
    // Check for existing open transaction for this vehicle
    const existing = await tx.transaction.findFirst({
      where: { vehicleId: data.vehicleId, status: "Open" },
    });
    if (existing) {
      throw new Error("Vehicle already has an open transaction");
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

    // Find applicable rate for this vehicle type
    const vehicle = await tx.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: { vehicleTypeId: true },
    });
    if (!vehicle) throw new Error("Vehicle not found");

    const now = new Date();
    const rate = await tx.rate.findFirst({
      where: {
        vehicleTypeId: vehicle.vehicleTypeId,
        validFrom: { lte: now },
        validTo: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    return tx.transaction.create({
      data: {
        vehicleId: data.vehicleId,
        areaId: data.areaId,
        attendantId: data.attendantId,
        rateId: rate?.id ?? null,
        rateSnapshot: rate
          ? {
              id: rate.id,
              name: rate.name,
              rateType: rate.rateType,
              priceCents: rate.priceCents,
              graceMinutes: rate.graceMinutes,
            }
          : Prisma.DbNull,
        entryTime: now,
        status: "Open",
      },
      select: transactionSelect,
    });
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
 * Exit a vehicle — calculate charges and move to AwaitingPayment.
 */
export async function exitTransaction(id: number): Promise<TransactionDetail> {
  return prisma.$transaction(async (tx): Promise<TransactionDetail> => {
    const txn = await tx.transaction.findUnique({
      where: { id },
      select: { id: true, status: true, entryTime: true, rateSnapshot: true },
    });
    if (!txn) throw new Error("Transaction not found");
    if (txn.status !== "Open") throw new Error("Transaction is not open");

    const now = new Date();
    const durationMinutes = Math.round(
      (now.getTime() - txn.entryTime.getTime()) / 60000
    );

    const rateSnapshot = txn.rateSnapshot as {
      rateType: string;
      priceCents: number;
      graceMinutes: number;
    } | null;

    const amountCents = calculateAmount(rateSnapshot, durationMinutes);

    return tx.transaction.update({
      where: { id },
      data: {
        exitTime: now,
        durationMinutes,
        amountCents,
        status: "AwaitingPayment",
      },
      select: transactionSelect,
    });
  });
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
