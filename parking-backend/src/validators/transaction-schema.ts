import { z } from "zod";

export const createTransactionSchema = z.object({
  vehicleId: z.number().int().positive("Vehicle ID must be a positive integer"),
  areaId: z.number().int().positive("Parking area ID must be a positive integer"),
});

export const listTransactionsSchema = z.object({
  status: z.enum(["Open", "AwaitingPayment", "Closed", "Cancelled"]).optional(),
  areaId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
});
