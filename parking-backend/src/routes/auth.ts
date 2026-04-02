import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { loginSchema } from "../validators/auth-schema";
import { loginUser, getPublicUserById } from "../services/auth-service";
import { requireAuth } from "../middlewares/auth";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const auth = new Hono<AuthEnv>();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Lax" as const,
  path: "/",
  maxAge: 3600, // 1 hour
};

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        message: "Validation failed",
        errors: parsed.error.flatten(),
      },
      400
    );
  }

  try {
    const result = await loginUser(parsed.data.username, parsed.data.password, parsed.data.source);

    setCookie(c, "auth_token", result.accessToken, cookieOptions);

    return c.json(
      {
        message: "Login successful",
        data: { user: result.user },
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        message: error instanceof Error ? error.message : "Login failed",
      },
      401
    );
  }
});

auth.get("/me", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const userId = Number(authUser.userId);

  const user = await getPublicUserById(userId);

  if (!user) {
    return c.json({ message: "User not found" }, 404);
  }

  return c.json({
    message: "Authenticated user",
    data: user,
  });
});

auth.post("/logout", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  await logActivity(Number(authUser.userId), "logout");

  deleteCookie(c, "auth_token", {
    path: "/",
  });

  return c.json({
    message: "Logout successful",
  });
});

export default auth;