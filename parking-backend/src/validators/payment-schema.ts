import { z } from "zod";

export const createPaymentSchema = z.object({
  transactionId: z.number().int().positive("Transaction ID must be a positive integer"),
  paymentMethod: z.enum(["Qris"]),
});

export const completePaymentSchema = z.object({
  providerReference: z.string().optional(),
});
