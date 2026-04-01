import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { createUserSchema, updateUserSchema } from "../validators/user-schema";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../services/user-service";
import type { AuthEnv } from "../types/auth";

const users = new Hono<AuthEnv>();

// GET /users — list all users
users.get("/", requireAuth, requirePermission("users.view"), async (c) => {
  const data = await listUsers();
  return c.json({ message: "Users retrieved", data });
});

// GET /users/:id — get single user
users.get("/:id", requireAuth, requirePermission("users.view"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid user ID" }, 400);

  const user = await getUserById(id);
  if (!user) return c.json({ message: "User not found" }, 404);

  return c.json({ message: "User retrieved", data: user });
});

// POST /users — create user
users.post("/", requireAuth, requirePermission("users.create"), async (c) => {
  const body = await c.req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  try {
    const user = await createUser(parsed.data);
    return c.json({ message: "User created", data: user }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create user";
    // Unique constraint violations
    if (msg.includes("Unique constraint")) {
      return c.json({ message: "Username or email already exists" }, 409);
    }
    throw error;
  }
});

// PATCH /users/:id — update user
users.patch("/:id", requireAuth, requirePermission("users.update"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid user ID" }, 400);

  const body = await c.req.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  try {
    const user = await updateUser(id, parsed.data);
    return c.json({ message: "User updated", data: user });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Record to update not found")) {
      return c.json({ message: "User not found" }, 404);
    }
    if (msg.includes("Unique constraint")) {
      return c.json({ message: "Username or email already exists" }, 409);
    }
    throw error;
  }
});

// DELETE /users/:id — soft-delete user (set isActive = false)
users.delete("/:id", requireAuth, requirePermission("users.delete"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid user ID" }, 400);

  try {
    await deleteUser(id);
    return c.json({ message: "User deactivated" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Record to update not found")) {
      return c.json({ message: "User not found" }, 404);
    }
    throw error;
  }
});

export default users;