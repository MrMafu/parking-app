import { prisma } from "../lib/prisma.js";
import type { RateType } from "../../generated/prisma/enums.js";

export type RateDetail = {
  id: number;
  name: string;
  rateType: RateType;
  priceCents: number;
  graceMinutes: number;
  validFrom: Date;
  validTo: Date;
  vehicleType: { id: number; name: string };
  createdAt: Date;
  updatedAt: Date;
};

const rateSelect = {
  id: true,
  name: true,
  rateType: true,
  priceCents: true,
  graceMinutes: true,
  validFrom: true,
  validTo: true,
  createdAt: true,
  updatedAt: true,
  vehicleType: { select: { id: true, name: true } },
} as const;

export async function listRates(): Promise<RateDetail[]> {
  return prisma.rate.findMany({
    select: rateSelect,
    orderBy: { id: "asc" },
  });
}

export async function getRateById(id: number): Promise<RateDetail | null> {
  return prisma.rate.findUnique({
    where: { id },
    select: rateSelect,
  });
}

export async function createRate(data: {
  name: string;
  vehicleTypeId: number;
  rateType: RateType;
  priceCents: number;
  graceMinutes?: number;
  validFrom: Date;
  validTo: Date;
}): Promise<RateDetail> {
  return prisma.rate.create({
    data,
    select: rateSelect,
  });
}

export async function updateRate(
  id: number,
  data: {
    name?: string;
    vehicleTypeId?: number;
    rateType?: RateType;
    priceCents?: number;
    graceMinutes?: number;
    validFrom?: Date;
    validTo?: Date;
  }
): Promise<RateDetail> {
  return prisma.rate.update({
    where: { id },
    data,
    select: rateSelect,
  });
}

export async function deleteRate(id: number): Promise<void> {
  await prisma.rate.delete({ where: { id } });
}