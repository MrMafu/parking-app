import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { createRefundSchema } from "../validators/refund-schema";
import {
  listRefunds,
  getRefundById,
  getRefundByPaymentId,
  createRefund,
} from "../services/refund-service";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const refunds = new Hono<AuthEnv>();

// GET /refunds
refunds.get(
  "/",
  requireAuth,
  requirePermission("refunds.view"),
  async (c) => {
    const data = await listRefunds();
    return c.json({ message: "Refunds retrieved", data });
  }
);

// GET /refunds/:id
refunds.get(
  "/:id",
  requireAuth,
  requirePermission("refunds.view"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const refund = await getRefundById(id);
    if (!refund) return c.json({ message: "Refund not found" }, 404);

    return c.json({ message: "Refund retrieved", data: refund });
  }
);

// GET /refunds/by-payment/:paymentId
refunds.get(
  "/by-payment/:paymentId",
  requireAuth,
  requirePermission("refunds.view"),
  async (c) => {
    const paymentId = Number(c.req.param("paymentId"));
    if (isNaN(paymentId))
      return c.json({ message: "Invalid payment ID" }, 400);

    const refund = await getRefundByPaymentId(paymentId);
    if (!refund) return c.json({ message: "Refund not found" }, 404);

    return c.json({ message: "Refund retrieved", data: refund });
  }
);

// POST /refunds
refunds.post(
  "/",
  requireAuth,
  requirePermission("refunds.manage"),
  async (c) => {
    const body = await c.req.json();
    const parsed = createRefundSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    try {
      const authUser = c.get("authUser");
      const refund = await createRefund({
        ...parsed.data,
        processedById: Number(authUser.userId),
      });
      await logActivity(
        Number(authUser.userId),
        "refunds.create",
        `Processed refund #${refund.id} for payment #${parsed.data.paymentId}, amount: ${parsed.data.amountCents} cents`
      );
      return c.json({ message: "Refund processed", data: refund }, 201);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found")) {
        return c.json({ message: msg }, 404);
      }
      if (
        msg.includes("only refund") ||
        msg.includes("already exists") ||
        msg.includes("exceeds")
      ) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

export default refunds;
