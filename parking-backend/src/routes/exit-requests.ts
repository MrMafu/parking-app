import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth.js";
import { rfidExitSchema } from "../validators/transaction-schema.js";
import { rfidExit } from "../services/transaction-service.js";
import { logActivity } from "../lib/activity-log.js";
import type { AuthEnv } from "../types/auth.js";

type ExitRequest = {
  id: number;
  tagId: string;
  createdAt: string;
};

const store: ExitRequest[] = [];
let nextId = 1;

const exitRequests = new Hono<AuthEnv>();

// POST /exit-requests  (public)
exitRequests.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = rfidExitSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  const req = {
    id: nextId++,
    tagId: parsed.data.tagId,
    createdAt: new Date().toISOString(),
  } as ExitRequest;

  store.push(req);

  return c.json({ message: "Exit request created", data: req }, 201);
});

// GET /exit-requests  (authenticated) - list pending requests
exitRequests.get("/", requireAuth, requirePermission("transactions.view"), async (c) => {
  return c.json({ message: "Exit requests retrieved", data: store.slice().reverse() });
});

// POST /exit-requests/:id/approve  (authenticated)
exitRequests.post(
  "/:id/approve",
  requireAuth,
  requirePermission("transactions.create"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const idx = store.findIndex((r) => r.id === id);
    if (idx === -1) return c.json({ message: "Exit request not found" }, 404);

    const req = store[idx];

    try {
      const authUser = c.get("authUser");
      // Create real exit using existing service
      const txn = await rfidExit({ tagId: req.tagId });
      // remove request
      store.splice(idx, 1);
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

    const idx = store.findIndex((r) => r.id === id);
    if (idx === -1) return c.json({ message: "Exit request not found" }, 404);

    const req = store[idx];
    const authUser = c.get("authUser");
    store.splice(idx, 1);
    await logActivity(Number(authUser.userId), "transactions.rfid-exit.reject", `Rejected exit request #${id} (tag: ${req.tagId})`);
    return c.json({ message: "Exit request rejected" });
  }
);

export default exitRequests;
