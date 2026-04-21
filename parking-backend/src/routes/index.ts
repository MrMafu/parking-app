import { Hono } from "hono";
import auth from "./auth.js";
import users from "./users.js";
import vehicleTypes from "./vehicle-types.js";
import rates from "./rates.js";
import parkingAreas from "./parking-areas.js";
import activityLogs from "./activity-logs.js";
import roles from "./roles.js";
import transactions from "./transactions.js";
import payments from "./payments.js";
import receipts from "./receipts.js";
import refunds from "./refunds.js";
import reports from "./reports.js";
import entryRequests from "./entry-requests.js";
import exitRequests from "./exit-requests.js";

const router = new Hono();

router.route("/auth", auth);
router.route("/users", users);
router.route("/vehicle-types", vehicleTypes);
router.route("/rates", rates);
router.route("/parking-areas", parkingAreas);
router.route("/activity-logs", activityLogs);
router.route("/roles", roles);
router.route("/transactions", transactions);
router.route("/entry-requests", entryRequests);
router.route("/exit-requests", exitRequests);
router.route("/payments", payments);
router.route("/receipts", receipts);
router.route("/refunds", refunds);
router.route("/reports", reports);

export default router;