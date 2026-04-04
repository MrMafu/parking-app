import { prisma } from "../lib/prisma";

export type VehicleDetail = {
  id: number;
  licensePlate: string;
  color: string;
  ownerName: string;
  vehicleType: { id: number; name: string };
  registeredBy: { id: number; fullname: string; username: string };
  createdAt: Date;
  updatedAt: Date;
};

const vehicleSelect = {
  id: true,
  licensePlate: true,
  color: true,
  ownerName: true,
  createdAt: true,
  updatedAt: true,
  vehicleType: { select: { id: true, name: true } },
  registeredBy: { select: { id: true, fullname: true, username: true } },
} as const;

export async function listVehicles(): Promise<VehicleDetail[]> {
  return prisma.vehicle.findMany({
    select: vehicleSelect,
    orderBy: { id: "asc" },
  });
}

export async function getVehicleById(id: number): Promise<VehicleDetail | null> {
  return prisma.vehicle.findUnique({
    where: { id },
    select: vehicleSelect,
  });
}

export async function getVehicleByLicensePlate(
  licensePlate: string
): Promise<VehicleDetail | null> {
  return prisma.vehicle.findUnique({
    where: { licensePlate },
    select: vehicleSelect,
  });
}

export async function createVehicle(data: {
  licensePlate: string;
  vehicleTypeId: number;
  color: string;
  ownerName: string;
  registeredById: number;
}): Promise<VehicleDetail> {
  return prisma.vehicle.create({
    data,
    select: vehicleSelect,
  });
}

export async function updateVehicle(
  id: number,
  data: {
    licensePlate?: string;
    vehicleTypeId?: number;
    color?: string;
    ownerName?: string;
  }
): Promise<VehicleDetail> {
  return prisma.vehicle.update({
    where: { id },
    data,
    select: vehicleSelect,
  });
}

export async function deleteVehicle(id: number): Promise<void> {
  await prisma.vehicle.delete({ where: { id } });
}