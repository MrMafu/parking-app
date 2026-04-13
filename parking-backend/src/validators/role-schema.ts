import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  permissionIds: z.array(z.number().int().positive()).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional(),
  permissionIds: z.array(z.number().int().positive()).optional(),
});
