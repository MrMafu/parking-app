import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth.js";
import { listActivityLogs } from "../services/activity-log-service.js";
import type { AuthEnv } from "../types/auth.js";

const activityLogs = new Hono<AuthEnv>();

// GET /activity-logs
activityLogs.get(
  "/",
  requireAuth,
  requirePermission("logs.view"),
  async (c) => {
    const data = await listActivityLogs();
    return c.json({ message: "Activity logs retrieved", data });
  }
);

export default activityLogs;
