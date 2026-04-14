import { z } from "zod";

export const createReceiptSchema = z.object({
  transactionId: z.number().int().positive("Transaction ID must be a positive integer"),
  paymentId: z.number().int().positive("Payment ID must be a positive integer"),
});
