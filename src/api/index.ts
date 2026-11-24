import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler, logger } from "./middleware.ts";
import osrm from "./osrm.ts";
import routes from "./routes.ts";

const api = new Hono();

api.use("*", cors());
api.use("*", errorHandler);
api.use("*", logger);

api.route("/api/routes", routes);
api.route("/api/osrm", osrm);

export default api;
