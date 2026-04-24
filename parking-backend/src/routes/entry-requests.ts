import { Hono } from "hono";
import { rfidEntrySchema } from "../validators/transaction-schema.js";
import { rfidEntry } from "../services/transaction-service.js";
import type { AuthEnv } from "../types/auth.js";

const entryRequests = new Hono<AuthEnv>();

// POST /entry-requests  (public)
// When an RFID tag is scanned we immediately create a transaction.
entryRequests.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = rfidEntrySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Validation failed", errors: parsed.error.flatten() }, 400);
  }

  try {
    // No attendant when scanned by standalone reader
    const txn = await rfidEntry({ tagId: parsed.data.tagId, areaId: parsed.data.areaId });
    return c.json({ message: "Transaction created", data: txn }, 201);
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
});

export default entryRequests;
