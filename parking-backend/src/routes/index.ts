import { Hono } from "hono";
import auth from "./auth";
import users from "./users";
import vehicleTypes from "./vehicle-types";
import vehicles from "./vehicles";
import rates from "./rates";
import parkingAreas from "./parking-areas";
import activityLogs from "./activity-logs";
import roles from "./roles";

const router = new Hono();

router.route("/auth", auth);
router.route("/users", users);
router.route("/vehicle-types", vehicleTypes);
router.route("/vehicles", vehicles);
router.route("/rates", rates);
router.route("/parking-areas", parkingAreas);
router.route("/activity-logs", activityLogs);
router.route("/roles", roles);

export default router;