import { z } from "zod";

export const createTransactionSchema = z.object({
  vehicleId: z.number().int().positive("Vehicle ID must be a positive integer"),
  areaId: z.number().int().positive("Parking area ID must be a positive integer"),
});

export const rfidEntrySchema = z.object({
  tagId: z.string().min(4, "Tag ID must be at least 4 characters"),
  areaId: z.number().int().positive("Parking area ID must be a positive integer"),
});

export const rfidExitSchema = z.object({
  tagId: z.string().min(4, "Tag ID must be at least 4 characters"),
  vehicleTypeId: z.number().int().positive("Vehicle type ID must be a positive integer"),
});

export const listTransactionsSchema = z.object({
  status: z.enum(["Open", "AwaitingPayment", "Closed", "Cancelled"]).optional(),
  areaId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
});
