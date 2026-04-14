import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import {
  createTransactionSchema,
  listTransactionsSchema,
} from "../validators/transaction-schema";
import {
  listTransactions,
  getTransactionById,
  createTransaction,
  exitTransaction,
  cancelTransaction,
} from "../services/transaction-service";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const transactions = new Hono<AuthEnv>();

// GET /transactions
transactions.get(
  "/",
  requireAuth,
  requirePermission("transactions.view"),
  async (c) => {
    const query = c.req.query();
    const parsed = listTransactionsSchema.safeParse(query);
    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }
    const data = await listTransactions(parsed.data);
    return c.json({ message: "Transactions retrieved", data });
  }
);

// GET /transactions/:id
transactions.get(
  "/:id",
  requireAuth,
  requirePermission("transactions.view"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const txn = await getTransactionById(id);
    if (!txn) return c.json({ message: "Transaction not found" }, 404);

    return c.json({ message: "Transaction retrieved", data: txn });
  }
);

// POST /transactions — vehicle entry
transactions.post(
  "/",
  requireAuth,
  requirePermission("transactions.create"),
  async (c) => {
    const body = await c.req.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    try {
      const authUser = c.get("authUser");
      const txn = await createTransaction({
        ...parsed.data,
        attendantId: Number(authUser.userId),
      });
      await logActivity(
        Number(authUser.userId),
        "transactions.create",
        `Vehicle entry: transaction #${txn.id}, vehicle #${parsed.data.vehicleId}, area #${parsed.data.areaId}`
      );
      return c.json({ message: "Transaction created", data: txn }, 201);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (
        msg.includes("already has an open transaction") ||
        msg.includes("Parking area is full")
      ) {
        return c.json({ message: msg }, 409);
      }
      if (
        msg.includes("not found") ||
        msg.includes("not open")
      ) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

// POST /transactions/:id/exit — vehicle exit
transactions.post(
  "/:id/exit",
  requireAuth,
  requirePermission("transactions.update"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    try {
      const authUser = c.get("authUser");
      const txn = await exitTransaction(id);
      await logActivity(
        Number(authUser.userId),
        "transactions.exit",
        `Vehicle exit: transaction #${id}, amount: ${txn.amountCents} cents, duration: ${txn.durationMinutes} min`
      );
      return c.json({ message: "Vehicle exited, awaiting payment", data: txn });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found")) {
        return c.json({ message: msg }, 404);
      }
      if (msg.includes("not open")) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

// POST /transactions/:id/cancel
transactions.post(
  "/:id/cancel",
  requireAuth,
  requirePermission("transactions.update"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    try {
      const authUser = c.get("authUser");
      const txn = await cancelTransaction(id);
      await logActivity(
        Number(authUser.userId),
        "transactions.cancel",
        `Cancelled transaction #${id}`
      );
      return c.json({ message: "Transaction cancelled", data: txn });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found")) {
        return c.json({ message: msg }, 404);
      }
      if (msg.includes("Cannot cancel") || msg.includes("already cancelled")) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

export default transactions;
