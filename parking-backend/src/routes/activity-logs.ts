import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { listActivityLogs } from "../services/activity-log-service";
import type { AuthEnv } from "../types/auth";

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
