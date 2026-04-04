import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import {
  createParkingAreaSchema,
  updateParkingAreaSchema,
} from "../validators/parking-area-schema";
import {
  listParkingAreas,
  getParkingAreaById,
  createParkingArea,
  updateParkingArea,
  deleteParkingArea,
} from "../services/parking-area-service";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const parkingAreas = new Hono<AuthEnv>();

// GET /parking-areas
parkingAreas.get(
  "/",
  requireAuth,
  requirePermission("parking_areas.view"),
  async (c) => {
    const data = await listParkingAreas();
    return c.json({ message: "Parking areas retrieved", data });
  }
);

// GET /parking-areas/:id
parkingAreas.get(
  "/:id",
  requireAuth,
  requirePermission("parking_areas.view"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const area = await getParkingAreaById(id);
    if (!area) return c.json({ message: "Parking area not found" }, 404);

    return c.json({ message: "Parking area retrieved", data: area });
  }
);

// POST /parking-areas
parkingAreas.post(
  "/",
  requireAuth,
  requirePermission("parking_areas.create"),
  async (c) => {
    const body = await c.req.json();
    const parsed = createParkingAreaSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    const authUser = c.get("authUser");
    const area = await createParkingArea(parsed.data);
    await logActivity(
      Number(authUser.userId),
      "parking_areas.create",
      `Created parking area: ${area.name} (id: ${area.id})`
    );
    return c.json({ message: "Parking area created", data: area }, 201);
  }
);

// PATCH /parking-areas/:id
parkingAreas.patch(
  "/:id",
  requireAuth,
  requirePermission("parking_areas.update"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const body = await c.req.json();
    const parsed = updateParkingAreaSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    try {
      const authUser = c.get("authUser");
      const area = await updateParkingArea(id, parsed.data);
      await logActivity(
        Number(authUser.userId),
        "parking_areas.update",
        `Updated parking area id: ${id}`
      );
      return c.json({ message: "Parking area updated", data: area });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Record to update not found")) {
        return c.json({ message: "Parking area not found" }, 404);
      }
      throw error;
    }
  }
);

// DELETE /parking-areas/:id
parkingAreas.delete(
  "/:id",
  requireAuth,
  requirePermission("parking_areas.delete"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    try {
      const authUser = c.get("authUser");
      await deleteParkingArea(id);
      await logActivity(
        Number(authUser.userId),
        "parking_areas.delete",
        `Deleted parking area id: ${id}`
      );
      return c.json({ message: "Parking area deleted" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Record to delete does not exist")) {
        return c.json({ message: "Parking area not found" }, 404);
      }
      if (msg.includes("Foreign key constraint")) {
        return c.json(
          { message: "Cannot delete parking area with existing transactions" },
          409
        );
      }
      throw error;
    }
  }
);

export default parkingAreas;