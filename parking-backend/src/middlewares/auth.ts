import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyAccessToken } from "../lib/jwt";
import type { AuthUser } from "../types/auth";

export async function requireAuth(c: Context, next: Next) {
  const token = getCookie(c, "auth_token");

  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const user = await verifyAccessToken(token);
    c.set("authUser", user as AuthUser);
    await next();
  } catch {
    return c.json({ message: "Unauthorized" }, 401);
  }
}