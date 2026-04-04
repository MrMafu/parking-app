import { z } from "zod";

const rateTypeValues = ["Hourly", "Daily", "Flat"] as const;

export const createRateSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    vehicleTypeId: z.number().int().positive("Vehicle type ID must be a positive integer"),
    rateType: z.enum(rateTypeValues, { message: "Invalid rate type" }),
    priceCents: z.number().int().nonnegative("Price must be a non-negative integer"),
    graceMinutes: z.number().int().nonnegative("Grace minutes must be non-negative").default(0),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date(),
  })
  .refine((d) => d.validTo > d.validFrom, {
    message: "validTo must be after validFrom",
    path: ["validTo"],
  });

export const updateRateSchema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    vehicleTypeId: z.number().int().positive("Vehicle type ID must be a positive integer").optional(),
    rateType: z.enum(rateTypeValues, { message: "Invalid rate type" }).optional(),
    priceCents: z.number().int().nonnegative("Price must be a non-negative integer").optional(),
    graceMinutes: z.number().int().nonnegative("Grace minutes must be non-negative").optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
  })
  .refine(
    (d) => {
      if (d.validFrom && d.validTo) return d.validTo > d.validFrom;
      return true;
    },
    { message: "validTo must be after validFrom", path: ["validTo"] }
  );