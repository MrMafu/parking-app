import { Hono } from "hono";
import auth from "./auth";
import users from "./users";
import vehicleTypes from "./vehicle-types";

const router = new Hono();

router.route("/auth", auth);
router.route("/users", users);
router.route("/vehicle-types", vehicleTypes);

export default router;