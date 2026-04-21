import { prisma } from "../lib/prisma.js";

export type VehicleTypeDetail = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const vehicleTypeSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listVehicleTypes(): Promise<VehicleTypeDetail[]> {
  return prisma.vehicleType.findMany({
    select: vehicleTypeSelect,
    orderBy: { id: "asc" },
  });
}

export async function getVehicleTypeById(
  id: number,
): Promise<VehicleTypeDetail | null> {
  return prisma.vehicleType.findUnique({
    where: { id },
    select: vehicleTypeSelect,
  });
}

export async function createVehicleType(data: {
  name: string;
  description?: string;
}): Promise<VehicleTypeDetail> {
  return prisma.vehicleType.create({
    data,
    select: vehicleTypeSelect,
  });
}

export async function updateVehicleType(
  id: number,
  data: { name?: string; description?: string },
): Promise<VehicleTypeDetail> {
  return prisma.vehicleType.update({
    where: { id },
    data,
    select: vehicleTypeSelect,
  });
}

export async function deleteVehicleType(id: number): Promise<void> {
  const [parkingAreaCount, rateCount] = await Promise.all([
    prisma.parkingArea.count({ where: { vehicleTypeId: id } }),
    prisma.rate.count({ where: { vehicleTypeId: id } }),
  ]);

  if (parkingAreaCount > 0 || rateCount > 0) {
    throw new Error(
      `Cannot delete: ${parkingAreaCount} parking area(s) and ${rateCount} rate(s) still reference this type`,
    );
  }

  await prisma.vehicleType.delete({ where: { id } });
}