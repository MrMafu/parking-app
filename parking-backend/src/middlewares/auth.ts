import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyAccessToken } from "../lib/jwt";
import type { AuthEnv } from "../types/auth";
import { prisma } from "../lib/prisma";

export function requirePermission(permission: string) {
  return async (c: Context<AuthEnv>, next: Next) => {
    const authUser = c.get("authUser");

    const rolePerms = await prisma.rolePermission.findMany({
      where: { roleId: authUser.roleId },
      include: { permission: true },
    });

    const hasPermission = rolePerms.some(
      (rp: { permission: { name: string } }) => rp.permission.name === permission
    );

    if (!hasPermission) {
      return c.json({ message: "Forbidden" }, 403);
    }

    await next();
  };
}

export async function requireAuth(c: Context<AuthEnv>, next: Next) {
  const token = getCookie(c, "auth_token");

  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const user = await verifyAccessToken(token);
    c.set("authUser", user);
    await next();
  } catch {
    return c.json({ message: "Unauthorized" }, 401);
  }
}