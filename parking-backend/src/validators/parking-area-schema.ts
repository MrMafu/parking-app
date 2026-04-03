import { z } from "zod";

const parkingAreaStatusValues = ["Open", "Closed", "Maintenance"] as const;

export const createParkingAreaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  capacity: z.number().int().positive("Capacity must be a positive integer"),
  location: z.string().optional(),
  status: z.enum(parkingAreaStatusValues).optional().default("Open"),
});

export const updateParkingAreaSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  capacity: z.number().int().positive("Capacity must be a positive integer").optional(),
  location: z.string().optional(),
  status: z.enum(parkingAreaStatusValues).optional(),
});