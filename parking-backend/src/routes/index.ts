import { Hono } from "hono";
import auth from "./auth";
import users from "./users";
import vehicleTypes from "./vehicle-types";
import rates from "./rates";
import parkingAreas from "./parking-areas";
import activityLogs from "./activity-logs";
import roles from "./roles";
import transactions from "./transactions";
import payments from "./payments";
import receipts from "./receipts";
import refunds from "./refunds";
import reports from "./reports";
import entryRequests from "./entry-requests";
import exitRequests from "./exit-requests";

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