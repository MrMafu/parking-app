import { prisma } from "../lib/prisma";
import type { ParkingAreaStatus } from "../../generated/prisma/enums";

export type ParkingAreaDetail = {
  id: number;
  name: string;
  capacity: number;
  occupied: number;
  location: string | null;
  status: ParkingAreaStatus;
  vehicleTypeId: number;
  vehicleType: { id: number; name: string };
  createdAt: Date;
  updatedAt: Date;
};

const parkingAreaSelect = {
  id: true,
  name: true,
  capacity: true,
  location: true,
  status: true,
  vehicleTypeId: true,
  vehicleType: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

async function withOccupied(area: Omit<ParkingAreaDetail, "occupied">): Promise<ParkingAreaDetail> {
  const occupied = await prisma.transaction.count({
    where: { areaId: area.id, status: "Open" },
  });
  return { ...area, occupied };
}

export async function listParkingAreas(): Promise<ParkingAreaDetail[]> {
  const areas = await prisma.parkingArea.findMany({
    select: parkingAreaSelect,
    orderBy: { id: "asc" },
  });
  return Promise.all(areas.map(withOccupied));
}

export async function getParkingAreaById(
  id: number
): Promise<ParkingAreaDetail | null> {
  const area = await prisma.parkingArea.findUnique({
    where: { id },
    select: parkingAreaSelect,
  });
  if (!area) return null;
  return withOccupied(area);
}

export async function createParkingArea(data: {
  name: string;
  capacity: number;
  vehicleTypeId: number;
  location?: string | null;
  status?: ParkingAreaStatus;
}): Promise<ParkingAreaDetail> {
  const area = await prisma.parkingArea.create({
    data,
    select: parkingAreaSelect,
  });
  return withOccupied(area);
}

export async function updateParkingArea(
  id: number,
  data: {
    name?: string;
    capacity?: number;
    vehicleTypeId?: number;
    location?: string | null;
    status?: ParkingAreaStatus;
  }
): Promise<ParkingAreaDetail> {
  const area = await prisma.parkingArea.update({
    where: { id },
    data,
    select: parkingAreaSelect,
  });
  return withOccupied(area);
}

export async function deleteParkingArea(id: number): Promise<void> {
  await prisma.parkingArea.delete({ where: { id } });
}