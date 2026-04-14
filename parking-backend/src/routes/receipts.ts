import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { createReceiptSchema } from "../validators/receipt-schema";
import {
  listReceipts,
  getReceiptById,
  getReceiptByTransactionId,
  createReceipt,
} from "../services/receipt-service";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const receipts = new Hono<AuthEnv>();

// GET /receipts
receipts.get(
  "/",
  requireAuth,
  requirePermission("receipts.view"),
  async (c) => {
    const data = await listReceipts();
    return c.json({ message: "Receipts retrieved", data });
  }
);

// GET /receipts/:id
receipts.get(
  "/:id",
  requireAuth,
  requirePermission("receipts.view"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const receipt = await getReceiptById(id);
    if (!receipt) return c.json({ message: "Receipt not found" }, 404);

    return c.json({ message: "Receipt retrieved", data: receipt });
  }
);

// GET /receipts/by-transaction/:transactionId
receipts.get(
  "/by-transaction/:transactionId",
  requireAuth,
  requirePermission("receipts.view"),
  async (c) => {
    const transactionId = Number(c.req.param("transactionId"));
    if (isNaN(transactionId))
      return c.json({ message: "Invalid transaction ID" }, 400);

    const receipt = await getReceiptByTransactionId(transactionId);
    if (!receipt) return c.json({ message: "Receipt not found" }, 404);

    return c.json({ message: "Receipt retrieved", data: receipt });
  }
);

// POST /receipts
receipts.post(
  "/",
  requireAuth,
  requirePermission("receipts.print"),
  async (c) => {
    const body = await c.req.json();
    const parsed = createReceiptSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    try {
      const authUser = c.get("authUser");
      const receipt = await createReceipt({
        ...parsed.data,
        printedById: Number(authUser.userId),
      });
      await logActivity(
        Number(authUser.userId),
        "receipts.create",
        `Generated receipt #${receipt.id} for transaction #${parsed.data.transactionId}`
      );
      return c.json({ message: "Receipt created", data: receipt }, 201);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found")) {
        return c.json({ message: msg }, 404);
      }
      if (
        msg.includes("not completed") ||
        msg.includes("does not belong")
      ) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

export default receipts;
