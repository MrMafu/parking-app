import "dotenv/config"
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { cors } from "hono/cors"
import auth from "./routes/auth"
import users from "./routes/users"
import vehicleTypes from "./routes/vehicle-types"

const app = new Hono()

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3001", // web localhost
      "http://localhost:8100", // mobile localhost
    ],
    credentials: true,
  })
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/auth", auth);
app.route("/users", users);
app.route("/vehicle-types", vehicleTypes);
app.get("/", (c) => {
  return c.text("Hello Hono!")
})

const port = Number(process.env.PORT) || 3000

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  }
)

// graceful shutdown
process.on("SIGINT", () => {
  server.close()
  process.exit(0)
})
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})