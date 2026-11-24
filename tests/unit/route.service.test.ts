import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { prisma } from "../../src/lib/db.ts";
import * as routeService from "../../src/services/route.service.ts";

const sampleRoute = {
	name: "Morning Run",
	description: "A nice morning jog",
	activityType: "running" as const,
	geojson: JSON.stringify({
		type: "FeatureCollection",
		features: [],
	}),
	waypoints: JSON.stringify([
		[-73.97, 40.77],
		[-73.98, 40.78],
	]),
	distanceMeters: 5000,
	elevationGainM: 50,
	elevationLossM: 45,
};

describe("route.service", () => {
	beforeEach(async () => {
		await prisma.route.deleteMany();
	});

	it("should create a route", async () => {
		const route = await routeService.createRoute(sampleRoute);
		expect(route.id).toBeDefined();
		expect(route.name).toBe("Morning Run");
		expect(route.activityType).toBe("running");
		expect(route.distanceMeters).toBe(5000);
	});

	it("should list routes", async () => {
		await routeService.createRoute(sampleRoute);
		await routeService.createRoute({
			...sampleRoute,
			name: "Evening Ride",
			activityType: "cycling",
		});
		const routes = await routeService.listRoutes();
		expect(routes.length).toBe(2);
		// Should not include geojson or waypoints in list
		expect((routes[0] as Record<string, unknown>).geojson).toBeUndefined();
	});

	it("should get a route by id", async () => {
		const created = await routeService.createRoute(sampleRoute);
		const route = await routeService.getRoute(created.id);
		expect(route).not.toBeNull();
		expect(route?.name).toBe("Morning Run");
		expect(route?.geojson).toBeDefined();
	});

	it("should update a route", async () => {
		const created = await routeService.createRoute(sampleRoute);
		const updated = await routeService.updateRoute(created.id, {
			name: "Updated Run",
			distanceMeters: 6000,
		});
		expect(updated.name).toBe("Updated Run");
		expect(updated.distanceMeters).toBe(6000);
	});

	it("should delete a route", async () => {
		const created = await routeService.createRoute(sampleRoute);
		await routeService.deleteRoute(created.id);
		const route = await routeService.getRoute(created.id);
		expect(route).toBeNull();
	});

	it("should return null for non-existent route", async () => {
		const route = await routeService.getRoute("nonexistent");
		expect(route).toBeNull();
	});
});

describe("route.service server-side elevation", () => {
	const lineGeojson = JSON.stringify({
		type: "FeatureCollection",
		features: [
			{
				type: "Feature",
				properties: {},
				geometry: {
					type: "LineString",
					coordinates: [
						[-122.4, 37.77],
						[-122.41, 37.78],
						[-122.42, 37.79],
					],
				},
			},
		],
	});
	const lineRoute = { ...sampleRoute, geojson: lineGeojson };
	const originalFetch = globalThis.fetch;

	function mockElevationApi(elevations: number[] | null) {
		globalThis.fetch = mock(async () => {
			if (!elevations) throw new Error("network down");
			return new Response(JSON.stringify({ elevation: elevations }));
		}) as unknown as typeof fetch;
	}

	beforeEach(async () => {
		await prisma.route.deleteMany();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("computes gain/loss and profile from geometry on create", async () => {
		mockElevationApi([10, 30, 20]);
		const route = await routeService.createRoute(lineRoute);
		expect(route.elevationGainM).toBe(20);
		expect(route.elevationLossM).toBe(10);
		expect(JSON.parse(route.elevationProfile ?? "")).toEqual([10, 30, 20]);
	});

	it("falls back to client-sent gain/loss when elevation API fails on create", async () => {
		mockElevationApi(null);
		const route = await routeService.createRoute(lineRoute);
		expect(route.elevationGainM).toBe(50);
		expect(route.elevationLossM).toBe(45);
		expect(route.elevationProfile).toBeNull();
	});

	it("self-heals a missing profile on getRoute", async () => {
		mockElevationApi(null);
		const created = await routeService.createRoute(lineRoute);
		expect(created.elevationProfile).toBeNull();

		mockElevationApi([5, 25, 15]);
		const route = await routeService.getRoute(created.id);
		expect(route?.elevationGainM).toBe(20);
		expect(route?.elevationLossM).toBe(10);
		expect(JSON.parse(route?.elevationProfile ?? "")).toEqual([5, 25, 15]);

		// Persisted, not just returned
		const again = await prisma.route.findUnique({ where: { id: created.id } });
		expect(again?.elevationProfile).not.toBeNull();
	});

	it("skips self-heal when geojson has no LineString", async () => {
		const created = await routeService.createRoute(sampleRoute);
		mockElevationApi([1, 2, 3]);
		const route = await routeService.getRoute(created.id);
		expect(route?.elevationProfile).toBeNull();
		expect(globalThis.fetch).not.toHaveBeenCalled();
	});

	it("recomputes elevation when geojson changes on update", async () => {
		mockElevationApi([10, 30, 20]);
		const created = await routeService.createRoute(lineRoute);

		mockElevationApi([0, 100, 0]);
		const updated = await routeService.updateRoute(created.id, {
			geojson: lineGeojson,
		});
		expect(updated.elevationGainM).toBe(100);
		expect(updated.elevationLossM).toBe(100);
		expect(JSON.parse(updated.elevationProfile ?? "")).toEqual([0, 100, 0]);
	});

	it("nulls the stored profile when recompute fails on geometry update", async () => {
		mockElevationApi([10, 30, 20]);
		const created = await routeService.createRoute(lineRoute);
		expect(created.elevationProfile).not.toBeNull();

		mockElevationApi(null);
		const updated = await routeService.updateRoute(created.id, {
			geojson: lineGeojson,
			elevationGainM: 7,
			elevationLossM: 3,
		});
		expect(updated.elevationProfile).toBeNull();
		expect(updated.elevationGainM).toBe(7);
		expect(updated.elevationLossM).toBe(3);
	});

	it("does not touch elevation on metadata-only update", async () => {
		mockElevationApi([10, 30, 20]);
		const created = await routeService.createRoute(lineRoute);

		mockElevationApi(null);
		const updated = await routeService.updateRoute(created.id, {
			name: "Renamed",
		});
		expect(updated.elevationGainM).toBe(20);
		expect(JSON.parse(updated.elevationProfile ?? "")).toEqual([10, 30, 20]);
	});
});
