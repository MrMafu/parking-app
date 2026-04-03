import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import {
  createVehicleTypeSchema,
  updateVehicleTypeSchema,
} from "../validators/vehicle-type-schema";
import {
  listVehicleTypes,
  getVehicleTypeById,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType,
} from "../services/vehicle-type-service";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const vehicleTypes = new Hono<AuthEnv>();

// GET /vehicle-types
vehicleTypes.get(
  "/",
  requireAuth,
  requirePermission("vehicles.view"),
  async (c) => {
    const data = await listVehicleTypes();
    return c.json({ message: "Vehicle types retrieved", data });
  }
);

// GET /vehicle-types/:id
vehicleTypes.get(
  "/:id",
  requireAuth,
  requirePermission("vehicles.view"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const vehicleType = await getVehicleTypeById(id);
    if (!vehicleType) return c.json({ message: "Vehicle type not found" }, 404);

    return c.json({ message: "Vehicle type retrieved", data: vehicleType });
  }
);

// POST /vehicle-types
vehicleTypes.post(
  "/",
  requireAuth,
  requirePermission("vehicles.create"),
  async (c) => {
    const body = await c.req.json();
    const parsed = createVehicleTypeSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    try {
      const authUser = c.get("authUser");
      const vehicleType = await createVehicleType(parsed.data);
      await logActivity(
        Number(authUser.userId),
        "vehicle_types.create",
        `Created vehicle type: ${vehicleType.name} (id: ${vehicleType.id})`
      );
      return c.json({ message: "Vehicle type created", data: vehicleType }, 201);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Unique constraint")) {
        return c.json({ message: "Vehicle type name already exists" }, 409);
      }
      throw error;
    }
  }
);

// PATCH /vehicle-types/:id
vehicleTypes.patch(
  "/:id",
  requireAuth,
  requirePermission("vehicles.update"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const body = await c.req.json();
    const parsed = updateVehicleTypeSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    try {
      const authUser = c.get("authUser");
      const vehicleType = await updateVehicleType(id, parsed.data);
      await logActivity(
        Number(authUser.userId),
        "vehicle_types.update",
        `Updated vehicle type id: ${id}`
      );
      return c.json({ message: "Vehicle type updated", data: vehicleType });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Record to update not found")) {
        return c.json({ message: "Vehicle type not found" }, 404);
      }
      if (msg.includes("Unique constraint")) {
        return c.json({ message: "Vehicle type name already exists" }, 409);
      }
      throw error;
    }
  }
);

// DELETE /vehicle-types/:id
vehicleTypes.delete(
  "/:id",
  requireAuth,
  requirePermission("vehicles.delete"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    try {
      const authUser = c.get("authUser");
      await deleteVehicleType(id);
      await logActivity(
        Number(authUser.userId),
        "vehicle_types.delete",
        `Deleted vehicle type id: ${id}`
      );
      return c.json({ message: "Vehicle type deleted" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Record to delete does not exist")) {
        return c.json({ message: "Vehicle type not found" }, 404);
      }
      if (msg.includes("Foreign key constraint")) {
        return c.json(
          { message: "Cannot delete vehicle type with existing vehicles or rates" },
          409
        );
      }
      throw error;
    }
  }
);

export default vehicleTypes;
