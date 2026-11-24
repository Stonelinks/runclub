import { Hono } from "hono";
import {
	createRouteSchema,
	elevationRequestSchema,
	updateRouteSchema,
} from "../lib/validation.ts";
import { getElevation } from "../services/elevation.service.ts";
import * as routeService from "../services/route.service.ts";

const routes = new Hono();

// List all routes
routes.get("/", async (c) => {
	const allRoutes = await routeService.listRoutes();
	return c.json(allRoutes);
});

// Create a route
routes.post("/", async (c) => {
	const body = await c.req.json();
	const parsed = createRouteSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error }, 400);
	}
	const route = await routeService.createRoute(parsed.data);
	return c.json(route, 201);
});

// Get elevation for a LineString geometry
routes.post("/elevation", async (c) => {
	const body = await c.req.json();
	const parsed = elevationRequestSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error }, 400);
	}
	const result = await getElevation(
		parsed.data.geometry.coordinates as [number, number][],
	);
	return c.json(result);
});

// Get a single route
routes.get("/:id", async (c) => {
	const id = c.req.param("id");
	const route = await routeService.getRoute(id);
	if (!route) {
		return c.json({ error: "Route not found" }, 404);
	}
	return c.json(route);
});

// Update a route
routes.put("/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();
	const parsed = updateRouteSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Validation failed", details: parsed.error }, 400);
	}
	try {
		const route = await routeService.updateRoute(id, parsed.data);
		return c.json(route);
	} catch {
		return c.json({ error: "Route not found" }, 404);
	}
});

// Delete a route
routes.delete("/:id", async (c) => {
	const id = c.req.param("id");
	try {
		await routeService.deleteRoute(id);
		return c.json({ success: true });
	} catch {
		return c.json({ error: "Route not found" }, 404);
	}
});

export default routes;
