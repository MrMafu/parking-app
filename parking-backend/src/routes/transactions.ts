import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import {
  rfidEntrySchema,
  rfidExitSchema,
  listTransactionsSchema,
} from "../validators/transaction-schema";
import {
  listTransactions,
  getTransactionById,
  getTransactionByTagId,
  rfidEntry,
  rfidExit,
  closeTransaction,
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

// POST /transactions/:id/close — force-close a transaction (no payment)
transactions.post(
  "/:id/close",
  requireAuth,
  requirePermission("transactions.update"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    try {
      const authUser = c.get("authUser");
      const txn = await closeTransaction(id);
      await logActivity(
        Number(authUser.userId),
        "transactions.close",
        `Closed transaction #${id} (no payment)`
      );
      return c.json({ message: "Transaction closed", data: txn });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found") || msg.includes("Transaction not found")) {
        return c.json({ message: msg }, 404);
      }
      if (msg.includes("already closed")) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

// GET /transactions/by-tag/:tagId — find active transaction by RFID tag
// Must be before /:id to avoid route conflict
transactions.get(
  "/by-tag/:tagId",
  requireAuth,
  requirePermission("transactions.view"),
  async (c) => {
    const tagId = c.req.param("tagId");
    if (!tagId || tagId.length < 4) {
      return c.json({ message: "Invalid tag ID" }, 400);
    }

    const txn = await getTransactionByTagId(tagId);
    if (!txn) {
      return c.json({ message: "No active transaction found for this tag" }, 404);
    }

    return c.json({ message: "Transaction retrieved", data: txn });
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

// POST /transactions/rfid-entry — RFID tag entry
transactions.post(
  "/rfid-entry",
  requireAuth,
  requirePermission("transactions.create"),
  async (c) => {
    const body = await c.req.json();
    const parsed = rfidEntrySchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    try {
      const authUser = c.get("authUser");
      const txn = await rfidEntry({
        ...parsed.data,
        attendantId: Number(authUser.userId),
      });
      await logActivity(
        Number(authUser.userId),
        "transactions.rfid-entry",
        `RFID entry: transaction #${txn.id}, tag ${parsed.data.tagId}, area #${parsed.data.areaId}`
      );
      return c.json({ message: "RFID entry created", data: txn }, 201);
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

// POST /transactions/rfid-exit — RFID tag exit with vehicle type assignment
transactions.post(
  "/rfid-exit",
  requireAuth,
  requirePermission("transactions.update"),
  async (c) => {
    const body = await c.req.json();
    const parsed = rfidExitSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    try {
      const authUser = c.get("authUser");
      const txn = await rfidExit({ tagId: parsed.data.tagId });
      await logActivity(
        Number(authUser.userId),
        "transactions.rfid-exit",
        `RFID exit: transaction #${txn.id}, tag ${parsed.data.tagId}, amount: ${txn.amountCents} cents, duration: ${txn.durationMinutes} min`
      );
      const msg = txn.status === "AwaitingPayment"
        ? "RFID exit processed, awaiting payment"
        : "RFID exit processed, closed (no payment required)";
      return c.json({ message: msg, data: txn });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("No open transaction")) {
        return c.json({ message: msg }, 404);
      }
      throw error;
    }
  }
);

export default transactions;
