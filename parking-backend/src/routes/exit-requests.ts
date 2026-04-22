import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth.js";
import { rfidExitSchema } from "../validators/transaction-schema.js";
import { rfidExit } from "../services/transaction-service.js";
import { logActivity } from "../lib/activity-log.js";
import { prisma } from "../lib/prisma.js";
import type { AuthEnv } from "../types/auth.js";

const exitRequests = new Hono<AuthEnv>();

// POST /exit-requests  (public)
exitRequests.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = rfidExitSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  const rec = await prisma.exitRequest.create({ data: { tagId: parsed.data.tagId } });
  return c.json({ message: "Exit request created", data: rec }, 201);
});

// GET /exit-requests  (authenticated) - list pending requests
exitRequests.get("/", requireAuth, requirePermission("transactions.view"), async (c) => {
  const rows = await prisma.exitRequest.findMany({ orderBy: { id: "desc" } });
  return c.json({ message: "Exit requests retrieved", data: rows });
});

// POST /exit-requests/:id/approve  (authenticated)
exitRequests.post(
  "/:id/approve",
  requireAuth,
  requirePermission("transactions.create"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const req = await prisma.exitRequest.findUnique({ where: { id } });
    if (!req) return c.json({ message: "Exit request not found" }, 404);

    try {
      const authUser = c.get("authUser");
      // Create real exit using existing service
      const txn = await rfidExit({ tagId: req.tagId });
      // remove request
      await prisma.exitRequest.delete({ where: { id } });
      await logActivity(Number(authUser.userId), "transactions.rfid-exit.approve", `Approved exit request #${id} — transaction #${txn.id}`);
      return c.json({ message: "Exit approved", data: txn });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("No open transaction found")) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

// POST /exit-requests/:id/reject  (authenticated)
exitRequests.post(
  "/:id/reject",
  requireAuth,
  requirePermission("transactions.update"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const req = await prisma.exitRequest.findUnique({ where: { id } });
    if (!req) return c.json({ message: "Exit request not found" }, 404);

    const authUser = c.get("authUser");
    await prisma.exitRequest.delete({ where: { id } });
    await logActivity(Number(authUser.userId), "transactions.rfid-exit.reject", `Rejected exit request #${id} (tag: ${req.tagId})`);
    return c.json({ message: "Exit request rejected" });
  }
);

export default exitRequests;
