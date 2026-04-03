import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { createRateSchema, updateRateSchema } from "../validators/rate-schema";
import {
  listRates,
  getRateById,
  createRate,
  updateRate,
  deleteRate,
} from "../services/rate-service";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const rates = new Hono<AuthEnv>();

// GET /rates
rates.get("/", requireAuth, requirePermission("rates.view"), async (c) => {
  const data = await listRates();
  return c.json({ message: "Rates retrieved", data });
});

// GET /rates/:id
rates.get("/:id", requireAuth, requirePermission("rates.view"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

  const rate = await getRateById(id);
  if (!rate) return c.json({ message: "Rate not found" }, 404);

  return c.json({ message: "Rate retrieved", data: rate });
});

// POST /rates
rates.post("/", requireAuth, requirePermission("rates.create"), async (c) => {
  const body = await c.req.json();
  const parsed = createRateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  try {
    const authUser = c.get("authUser");
    const rate = await createRate(parsed.data);
    await logActivity(
      Number(authUser.userId),
      "rates.create",
      `Created rate: ${rate.name} (id: ${rate.id})`
    );
    return c.json({ message: "Rate created", data: rate }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Foreign key constraint")) {
      return c.json({ message: "Invalid vehicle type ID" }, 400);
    }
    throw error;
  }
});

// PATCH /rates/:id
rates.patch("/:id", requireAuth, requirePermission("rates.update"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

  const body = await c.req.json();
  const parsed = updateRateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  try {
    const authUser = c.get("authUser");
    const rate = await updateRate(id, parsed.data);
    await logActivity(
      Number(authUser.userId),
      "rates.update",
      `Updated rate id: ${id}`
    );
    return c.json({ message: "Rate updated", data: rate });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Record to update not found")) {
      return c.json({ message: "Rate not found" }, 404);
    }
    if (msg.includes("Foreign key constraint")) {
      return c.json({ message: "Invalid vehicle type ID" }, 400);
    }
    throw error;
  }
});

// DELETE /rates/:id
rates.delete("/:id", requireAuth, requirePermission("rates.delete"), async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

  try {
    const authUser = c.get("authUser");
    await deleteRate(id);
    await logActivity(
      Number(authUser.userId),
      "rates.delete",
      `Deleted rate id: ${id}`
    );
    return c.json({ message: "Rate deleted" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Record to delete does not exist")) {
      return c.json({ message: "Rate not found" }, 404);
    }
    if (msg.includes("Foreign key constraint")) {
      return c.json({ message: "Cannot delete rate with existing transactions" }, 409);
    }
    throw error;
  }
});

export default rates;