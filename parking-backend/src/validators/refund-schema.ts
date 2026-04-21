import { z } from "zod";

export const createRefundSchema = z.object({
  paymentId: z.number().int().positive("Payment ID must be a positive integer"),
  amountCents: z.number().int().positive("Amount must be a positive integer"),
  reason: z.string().min(1, "Reason is required"),
});
