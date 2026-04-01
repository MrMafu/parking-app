import { z } from "zod";

export const createUserSchema = z.object({
  fullname: z.string().min(1, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleId: z.number().int().positive("Role ID must be a positive integer"),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  fullname: z.string().min(1, "Full name is required").optional(),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  roleId: z.number().int().positive("Role ID must be a positive integer").optional(),
  isActive: z.boolean().optional(),
});