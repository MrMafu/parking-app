import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import {
  createPaymentSchema,
  completePaymentSchema,
} from "../validators/payment-schema";
import {
  listPayments,
  getPaymentById,
  getPaymentByTransactionId,
  createPayment,
  completePayment,
  failPayment,
  handleMidtransNotification,
  checkPaymentStatus,
  simulatePaymentSuccess,
} from "../services/payment-service";
import { logActivity } from "../lib/activity-log";
import type { AuthEnv } from "../types/auth";

const payments = new Hono<AuthEnv>();

// GET /payments
payments.get(
  "/",
  requireAuth,
  requirePermission("payments.view"),
  async (c) => {
    const data = await listPayments();
    return c.json({ message: "Payments retrieved", data });
  }
);

// GET /payments/by-transaction/:transactionId
payments.get(
  "/by-transaction/:transactionId",
  requireAuth,
  requirePermission("payments.view"),
  async (c) => {
    const transactionId = Number(c.req.param("transactionId"));
    if (isNaN(transactionId))
      return c.json({ message: "Invalid transaction ID" }, 400);

    const payment = await getPaymentByTransactionId(transactionId);
    if (!payment) return c.json({ message: "Payment not found" }, 404);

    return c.json({ message: "Payment retrieved", data: payment });
  }
);

// POST /payments/notification — Midtrans webhook (no auth)
payments.post("/notification", async (c) => {
  try {
    const body = await c.req.json();
    await handleMidtransNotification(body);
    return c.json({ message: "OK" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Invalid signature")) {
      return c.json({ message: "Invalid signature" }, 403);
    }
    console.error("Midtrans notification error:", error);
    return c.json({ message: "OK" }); // Always return 200 to Midtrans
  }
});

// POST /payments/:id/simulate — simulate successful payment (dev only)
payments.post(
  "/:id/simulate",
  requireAuth,
  requirePermission("payments.manage"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    try {
      const payment = await simulatePaymentSuccess(id);
      return c.json({ message: "Payment simulated as completed", data: payment });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not enabled")) {
        return c.json({ message: "Simulation mode is not enabled" }, 403);
      }
      if (msg.includes("not found")) {
        return c.json({ message: msg }, 404);
      }
      if (msg.includes("not pending")) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

// GET /payments/:id
payments.get(
  "/:id",
  requireAuth,
  requirePermission("payments.view"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const payment = await getPaymentById(id);
    if (!payment) return c.json({ message: "Payment not found" }, 404);

    return c.json({ message: "Payment retrieved", data: payment });
  }
);

// POST /payments — create payment
payments.post(
  "/",
  requireAuth,
  requirePermission("payments.manage"),
  async (c) => {
    const body = await c.req.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        400
      );
    }

    try {
      const authUser = c.get("authUser");
      const result = await createPayment(parsed.data);
      await logActivity(
        Number(authUser.userId),
        "payments.create",
        `Created payment #${result.payment.id} for transaction #${parsed.data.transactionId}`
      );
      return c.json(
        {
          message: "Payment created",
          data: result.payment,
          qrImageUrl: result.qrImageUrl,
        },
        201
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found")) {
        return c.json({ message: msg }, 404);
      }
      if (
        msg.includes("not awaiting payment") ||
        msg.includes("already exists")
      ) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

// POST /payments/:id/complete
payments.post(
  "/:id/complete",
  requireAuth,
  requirePermission("payments.manage"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    const body = await c.req.json().catch(() => ({}));
    const parsed = completePaymentSchema.safeParse(body);

    try {
      const authUser = c.get("authUser");
      const payment = await completePayment(
        id,
        parsed.success ? parsed.data.providerReference : undefined
      );
      await logActivity(
        Number(authUser.userId),
        "payments.complete",
        `Completed payment #${id}`
      );
      return c.json({ message: "Payment completed", data: payment });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found")) {
        return c.json({ message: msg }, 404);
      }
      if (msg.includes("not pending")) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

// POST /payments/:id/fail
payments.post(
  "/:id/fail",
  requireAuth,
  requirePermission("payments.manage"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    try {
      const authUser = c.get("authUser");
      const payment = await failPayment(id);
      await logActivity(
        Number(authUser.userId),
        "payments.fail",
        `Failed payment #${id}`
      );
      return c.json({ message: "Payment marked as failed", data: payment });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found")) {
        return c.json({ message: msg }, 404);
      }
      if (msg.includes("not pending")) {
        return c.json({ message: msg }, 400);
      }
      throw error;
    }
  }
);

// GET /payments/:id/status — poll Midtrans status
payments.get(
  "/:id/status",
  requireAuth,
  requirePermission("payments.view"),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ message: "Invalid ID" }, 400);

    try {
      const result = await checkPaymentStatus(id);
      return c.json({ message: "Payment status", data: result });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found")) {
        return c.json({ message: msg }, 404);
      }
      throw error;
    }
  }
);

export default payments;
