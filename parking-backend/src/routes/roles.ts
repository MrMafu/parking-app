import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { createRoleSchema, updateRoleSchema } from "../validators/role-schema";
import {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
} from "../services/role-service";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const roles = new Hono<AuthEnv>();

// GET /roles — list all roles with their permissions
roles.get("/", requireAuth, requirePermission("roles.view"), async (c) => {
  const data = await listRoles();
  return c.json({ message: "Roles retrieved", data });
});

// GET /roles/permissions — list all available permissions
roles.get("/permissions", requireAuth, requirePermission("roles.view"), async (c) => {
  const data = await listPermissions();
  return c.json({ message: "Permissions retrieved", data });
});

// GET /roles/:id — get single role
roles.get("/:id", requireAuth, requirePermission("roles.view"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid role ID" }, 400);

  const role = await getRoleById(id);
  if (!role) return c.json({ message: "Role not found" }, 404);

  return c.json({ message: "Role retrieved", data: role });
});

// POST /roles — create role
roles.post("/", requireAuth, requirePermission("roles.manage"), async (c) => {
  const body = await c.req.json();
  const parsed = createRoleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  try {
    const authUser = c.get("authUser");
    const role = await createRole(parsed.data);
    await logActivity(Number(authUser.userId), "roles.create", `Created role: ${role.name} (id: ${role.id})`);
    return c.json({ message: "Role created", data: role }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create role";
    if (msg.includes("Unique constraint")) {
      return c.json({ message: "Role name already exists" }, 409);
    }
    throw error;
  }
});

// PATCH /roles/:id — update role
roles.patch("/:id", requireAuth, requirePermission("roles.manage"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid role ID" }, 400);

  const body = await c.req.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  try {
    const authUser = c.get("authUser");
    const role = await updateRole(id, parsed.data);
    await logActivity(Number(authUser.userId), "roles.update", `Updated role id: ${id}`);
    return c.json({ message: "Role updated", data: role });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Record to update not found")) {
      return c.json({ message: "Role not found" }, 404);
    }
    if (msg.includes("Unique constraint")) {
      return c.json({ message: "Role name already exists" }, 409);
    }
    throw error;
  }
});

// DELETE /roles/:id — delete role
roles.delete("/:id", requireAuth, requirePermission("roles.manage"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid role ID" }, 400);

  try {
    const authUser = c.get("authUser");
    await deleteRole(id);
    await logActivity(Number(authUser.userId), "roles.delete", `Deleted role id: ${id}`);
    return c.json({ message: "Role deleted" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Record to delete does not exist")) {
      return c.json({ message: "Role not found" }, 404);
    }
    if (msg.includes("Foreign key constraint")) {
      return c.json({ message: "Cannot delete role that is assigned to users" }, 409);
    }
    throw error;
  }
});

export default roles;
