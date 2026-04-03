import { z } from "zod";

export const createVehicleSchema = z.object({
  licensePlate: z.string().min(1, "License plate is required"),
  vehicleTypeId: z.number().int().positive("Vehicle type ID must be a positive integer"),
  color: z.string().min(1, "Color is required"),
  ownerName: z.string().min(1, "Owner name is required"),
});

export const updateVehicleSchema = z.object({
  licensePlate: z.string().min(1, "License plate is required").optional(),
  vehicleTypeId: z.number().int().positive("Vehicle type ID must be a positive integer").optional(),
  color: z.string().min(1, "Color is required").optional(),
  ownerName: z.string().min(1, "Owner name is required").optional(),
});