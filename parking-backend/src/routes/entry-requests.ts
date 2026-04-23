import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth.js";
import { rfidEntrySchema } from "../validators/transaction-schema.js";
import { rfidEntry } from "../services/transaction-service.js";
import { logActivity } from "../lib/activity-log.js";
import { prisma } from "../lib/prisma.js";
import type { AuthEnv } from "../types/auth.js";

const entryRequests = new Hono<AuthEnv>();

// POST /entry-requests  (public)
entryRequests.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = rfidEntrySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  const rec = await prisma.entryRequest.create({
    data: {
      tagId: parsed.data.tagId,
      areaId: parsed.data.areaId,
    },
  });

  return c.json({ message: "Entry request created", data: rec }, 201);
});

// GET /entry-requests  (authenticated) - list pending requests
entryRequests.get("/", requireAuth, requirePermission("transactions.view"), async (c) => {
  const rows = await prisma.entryRequest.findMany({ orderBy: { id: "desc" } });
  return c.json({ message: "Entry requests retrieved", data: rows });
});

// GET /entry-requests/:id - get single request (used by polling)
entryRequests.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);
  const req = await prisma.entryRequest.findUnique({ where: { id } });
  if (!req) return c.json({ message: "Request not found" }, 404);
  return c.json({ data: req });
});

// POST /entry-requests/:id/approve  (authenticated)
entryRequests.post(
  "/:id/approve",
  requireAuth,
  requirePermission("transactions.create"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const req = await prisma.entryRequest.findUnique({ where: { id } });
    if (!req) return c.json({ message: "Entry request not found" }, 404);

    try {
      const authUser = c.get("authUser");
      // Create real transaction using existing service
      const txn = await rfidEntry({ tagId: req.tagId, areaId: req.areaId, attendantId: Number(authUser.userId) });
      // remove request
      await prisma.entryRequest.delete({ where: { id } });
      await logActivity(Number(authUser.userId), "transactions.rfid-entry.approve", `Approved entry request #${id} — transaction #${txn.id}`);
      return c.json({ message: "Entry approved", data: txn });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("already has an open transaction") || msg.includes("Parking area is full")) {
        return c.json({ message: msg }, 409);
      }
      if (msg.includes("not found") || msg.includes("not open")) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

// POST /entry-requests/:id/reject  (authenticated)
entryRequests.post(
  "/:id/reject",
  requireAuth,
  requirePermission("transactions.update"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const req = await prisma.entryRequest.findUnique({ where: { id } });
    if (!req) return c.json({ message: "Entry request not found" }, 404);

    const authUser = c.get("authUser");
    await prisma.entryRequest.delete({ where: { id } });
    await logActivity(Number(authUser.userId), "transactions.rfid-entry.reject", `Rejected entry request #${id} (tag: ${req.tagId})`);
    return c.json({ message: "Entry request rejected" });
  }
);

export default entryRequests;
