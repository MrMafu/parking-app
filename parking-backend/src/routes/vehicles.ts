import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { createVehicleSchema, updateVehicleSchema } from "../validators/vehicle-schema";
import {
  listVehicles,
  getVehicleById,
  getVehicleByLicensePlate,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "../services/vehicle-service";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const vehicles = new Hono<AuthEnv>();

// GET /vehicles
vehicles.get("/", requireAuth, requirePermission("vehicles.view"), async (c) => {
  const data = await listVehicles();
  return c.json({ message: "Vehicles retrieved", data });
});

// GET /vehicles/by-plate/:licensePlate
vehicles.get(
  "/by-plate/:licensePlate",
  requireAuth,
  requirePermission("vehicles.view"),
  async (c) => {
    const licensePlate = c.req.param("licensePlate");
    if (!licensePlate) return c.json({ message: "License plate is required" }, 400);
    const vehicle = await getVehicleByLicensePlate(licensePlate);
    if (!vehicle) return c.json({ message: "Vehicle not found" }, 404);
    return c.json({ message: "Vehicle retrieved", data: vehicle });
  }
);

// GET /vehicles/:id
vehicles.get("/:id", requireAuth, requirePermission("vehicles.view"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

  const vehicle = await getVehicleById(id);
  if (!vehicle) return c.json({ message: "Vehicle not found" }, 404);

  return c.json({ message: "Vehicle retrieved", data: vehicle });
});

// POST /vehicles
vehicles.post("/", requireAuth, requirePermission("vehicles.create"), async (c) => {
  const body = await c.req.json();
  const parsed = createVehicleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  try {
    const authUser = c.get("authUser");
    const vehicle = await createVehicle({
      ...parsed.data,
      registeredById: Number(authUser.userId),
    });
    await logActivity(
      Number(authUser.userId),
      "vehicles.create",
      `Registered vehicle: ${vehicle.licensePlate} (id: ${vehicle.id})`
    );
    return c.json({ message: "Vehicle created", data: vehicle }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unique constraint")) {
      return c.json({ message: "License plate already registered" }, 409);
    }
    if (msg.includes("Foreign key constraint")) {
      return c.json({ message: "Invalid vehicle type ID" }, 400);
    }
    throw error;
  }
});

// PATCH /vehicles/:id
vehicles.patch("/:id", requireAuth, requirePermission("vehicles.update"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

  const body = await c.req.json();
  const parsed = updateVehicleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  try {
    const authUser = c.get("authUser");
    const vehicle = await updateVehicle(id, parsed.data);
    await logActivity(
      Number(authUser.userId),
      "vehicles.update",
      `Updated vehicle id: ${id}`
    );
    return c.json({ message: "Vehicle updated", data: vehicle });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Record to update not found")) {
      return c.json({ message: "Vehicle not found" }, 404);
    }
    if (msg.includes("Unique constraint")) {
      return c.json({ message: "License plate already registered" }, 409);
    }
    if (msg.includes("Foreign key constraint")) {
      return c.json({ message: "Invalid vehicle type ID" }, 400);
    }
    throw error;
  }
});

// DELETE /vehicles/:id
vehicles.delete("/:id", requireAuth, requirePermission("vehicles.delete"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

  try {
    const authUser = c.get("authUser");
    await deleteVehicle(id);
    await logActivity(
      Number(authUser.userId),
      "vehicles.delete",
      `Deleted vehicle id: ${id}`
    );
    return c.json({ message: "Vehicle deleted" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Record to delete does not exist")) {
      return c.json({ message: "Vehicle not found" }, 404);
    }
    if (msg.includes("Foreign key constraint")) {
      return c.json({ message: "Cannot delete vehicle with existing transactions" }, 409);
    }
    throw error;
  }
});

export default vehicles;