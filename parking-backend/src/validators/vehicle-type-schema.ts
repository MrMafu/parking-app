import { z } from "zod";

export const createVehicleTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const updateVehicleTypeSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
});