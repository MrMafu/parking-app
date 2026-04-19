import { Hono } from "hono";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { getDashboardStats } from "../services/report-service";
import type { AuthEnv } from "../types/auth";

const reports = new Hono<AuthEnv>();

// GET /reports/dashboard
reports.get(
  "/dashboard",
  requireAuth,
  requirePermission("reports.view"),
  async (c) => {
    const data = await getDashboardStats();
    return c.json({ message: "Dashboard stats retrieved", data });
  }
);

export default reports;
