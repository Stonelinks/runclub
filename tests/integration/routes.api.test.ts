import { beforeEach, describe, expect, it } from "bun:test";
import api from "../../src/api/index.ts";
import { prisma } from "../../src/lib/db.ts";

const samplePayload = {
	name: "Test Route",
	description: "A test route",
	activityType: "running",
	geojson: JSON.stringify({
		type: "FeatureCollection",
		features: [],
	}),
	waypoints: JSON.stringify([
		[-73.97, 40.77],
		[-73.98, 40.78],
	]),
	distanceMeters: 3000,
	elevationGainM: 25,
	elevationLossM: 20,
};

function req(method: string, path: string, body?: unknown) {
	const init: RequestInit = { method, headers: {} };
	if (body) {
		init.body = JSON.stringify(body);
		(init.headers as Record<string, string>)["Content-Type"] =
			"application/json";
	}
	return new Request(`http://localhost${path}`, init);
}

describe("Routes API", () => {
	beforeEach(async () => {
		await prisma.route.deleteMany();
	});

	it("POST /api/routes creates a route", async () => {
		const res = await api.fetch(req("POST", "/api/routes", samplePayload));
		expect(res.status).toBe(201);
		const data = await res.json();
		expect(data.id).toBeDefined();
		expect(data.name).toBe("Test Route");
	});

	it("GET /api/routes lists routes", async () => {
		await api.fetch(req("POST", "/api/routes", samplePayload));
		const res = await api.fetch(req("GET", "/api/routes"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.length).toBe(1);
	});

	it("GET /api/routes/:id gets a route", async () => {
		const createRes = await api.fetch(
			req("POST", "/api/routes", samplePayload),
		);
		const created = await createRes.json();
		const res = await api.fetch(req("GET", `/api/routes/${created.id}`));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.name).toBe("Test Route");
		expect(data.geojson).toBeDefined();
	});

	it("PUT /api/routes/:id updates a route", async () => {
		const createRes = await api.fetch(
			req("POST", "/api/routes", samplePayload),
		);
		const created = await createRes.json();
		const res = await api.fetch(
			req("PUT", `/api/routes/${created.id}`, { name: "Updated Route" }),
		);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.name).toBe("Updated Route");
	});

	it("DELETE /api/routes/:id deletes a route", async () => {
		const createRes = await api.fetch(
			req("POST", "/api/routes", samplePayload),
		);
		const created = await createRes.json();
		const res = await api.fetch(req("DELETE", `/api/routes/${created.id}`));
		expect(res.status).toBe(200);
		const getRes = await api.fetch(req("GET", `/api/routes/${created.id}`));
		expect(getRes.status).toBe(404);
	});

	it("GET /api/routes/:id returns 404 for missing route", async () => {
		const res = await api.fetch(req("GET", "/api/routes/nonexistent"));
		expect(res.status).toBe(404);
	});

	it("POST /api/routes returns 400 for invalid payload", async () => {
		const res = await api.fetch(req("POST", "/api/routes", { name: "" }));
		expect(res.status).toBe(400);
	});

	it("full CRUD lifecycle", async () => {
		// Create
		const createRes = await api.fetch(
			req("POST", "/api/routes", samplePayload),
		);
		expect(createRes.status).toBe(201);
		const route = await createRes.json();

		// Read
		const readRes = await api.fetch(req("GET", `/api/routes/${route.id}`));
		expect(readRes.status).toBe(200);

		// Update
		const updateRes = await api.fetch(
			req("PUT", `/api/routes/${route.id}`, {
				name: "Changed",
				distanceMeters: 9999,
			}),
		);
		expect(updateRes.status).toBe(200);
		const updated = await updateRes.json();
		expect(updated.name).toBe("Changed");

		// Delete
		const deleteRes = await api.fetch(req("DELETE", `/api/routes/${route.id}`));
		expect(deleteRes.status).toBe(200);

		// Verify deleted
		const verifyRes = await api.fetch(req("GET", `/api/routes/${route.id}`));
		expect(verifyRes.status).toBe(404);
	});
});
