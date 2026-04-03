import { Hono } from "hono";
import auth from "./auth";
import users from "./users";
import vehicleTypes from "./vehicle-types";
import vehicles from "./vehicles";
import rates from "./rates";

const router = new Hono();

router.route("/auth", auth);
router.route("/users", users);
router.route("/vehicle-types", vehicleTypes);
router.route("/vehicles", vehicles);
router.route("/rates", rates);

export default router;