import { expect, type Page, test } from "@playwright/test";

// Click handlers attach only after MapLibre's "load" event (which waits on
// tiles), so clicking as soon as the canvas is visible is a race.
async function waitForDirections(page: Page) {
	await page
		.locator('#route-editor-map[data-directions-ready="true"]')
		.waitFor({ state: "attached", timeout: 20000 });
}

const MOCK_OSRM_RESPONSE = {
	code: "Ok",
	routes: [
		{
			distance: 1500.5,
			duration: 300,
			geometry: {
				type: "LineString",
				coordinates: [
					[-73.97, 40.77],
					[-73.975, 40.775],
					[-73.98, 40.78],
				],
			},
			legs: [{ steps: [], summary: "", distance: 1500.5, duration: 300 }],
		},
	],
	waypoints: [
		{ location: [-73.97, 40.77], name: "" },
		{ location: [-73.98, 40.78], name: "" },
	],
};

const MOCK_OSRM_RESPONSE_DRAGGED = {
	code: "Ok",
	routes: [
		{
			distance: 2800.3,
			duration: 500,
			geometry: {
				type: "LineString",
				coordinates: [
					[-73.97, 40.77],
					[-73.965, 40.765],
					[-73.96, 40.76],
				],
			},
			legs: [{ steps: [], summary: "", distance: 2800.3, duration: 500 }],
		},
	],
	waypoints: [
		{ location: [-73.97, 40.77], name: "" },
		{ location: [-73.96, 40.76], name: "" },
	],
};

const MOCK_ELEVATION_RESPONSE = {
	elevations: [10, 15, 12, 20, 18],
	gainM: 13,
	lossM: 5,
};

test.describe("Route Editor", () => {
	test("should navigate to editor page", async ({ page }) => {
		await page.goto("/routes/new");
		// The page should load without crashing, even if WebGL fails
		await page.waitForLoadState("networkidle");
		// Check the URL is correct
		await expect(page).toHaveURL(/\/routes\/new/);
	});

	test("should navigate from list to new route", async ({ page }) => {
		await page.goto("/routes");
		await page.click('button:has-text("New Route")');
		await expect(page).toHaveURL(/\/routes\/new/);
	});

	test("should navigate to route detail page", async ({ page, request }) => {
		// Create a route via API
		const response = await request.post("/api/routes", {
			data: {
				name: "Detail Test Route",
				activityType: "running",
				geojson: JSON.stringify({
					type: "FeatureCollection",
					features: [
						{
							type: "Feature",
							properties: {},
							geometry: {
								type: "LineString",
								coordinates: [
									[-73.97, 40.77],
									[-73.98, 40.78],
								],
							},
						},
					],
				}),
				waypoints: JSON.stringify([
					[-73.97, 40.77],
					[-73.98, 40.78],
				]),
				distanceMeters: 3000,
				elevationGainM: 20,
				elevationLossM: 15,
			},
		});
		const route = await response.json();

		// Navigate to detail page
		await page.goto(`/routes/${route.id}`);
		await page.waitForLoadState("networkidle");
		await expect(page.locator("h1")).toContainText("Detail Test Route");

		// Clean up
		await request.delete(`/api/routes/${route.id}`);
	});

	test("should show route stats on detail page", async ({ page, request }) => {
		const response = await request.post("/api/routes", {
			data: {
				name: "Stats Test Route",
				activityType: "cycling",
				geojson: JSON.stringify({
					type: "FeatureCollection",
					features: [
						{
							type: "Feature",
							properties: {},
							geometry: {
								type: "LineString",
								coordinates: [
									[-73.97, 40.77],
									[-73.98, 40.78],
								],
							},
						},
					],
				}),
				waypoints: JSON.stringify([
					[-73.97, 40.77],
					[-73.98, 40.78],
				]),
				distanceMeters: 5000,
				elevationGainM: 50,
				elevationLossM: 40,
			},
		});
		const route = await response.json();

		await page.goto(`/routes/${route.id}`);
		await page.waitForLoadState("networkidle");
		await expect(page.locator("text=Route Stats")).toBeVisible();
		await expect(page.locator("text=cycling")).toBeVisible();

		await request.delete(`/api/routes/${route.id}`);
	});

	test("should update distance when waypoints are added", async ({ page }) => {
		// Mock OSRM to avoid external dependency
		await page.route("**/api/osrm/**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_OSRM_RESPONSE),
			});
		});

		// Mock elevation API
		await page.route("**/api/routes/elevation", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_ELEVATION_RESPONSE),
			});
		});

		await page.goto("/routes/new");
		await page.waitForLoadState("networkidle");

		// Wait for map canvas to be visible
		const mapCanvas = page.locator(
			"#route-editor-map canvas.maplibregl-canvas",
		);
		await mapCanvas.waitFor({ state: "visible", timeout: 10000 });
		await waitForDirections(page);

		// Verify initial state: distance is 0.00 mi
		await expect(page.locator('[data-testid="distance-miles"]')).toContainText(
			"0.00 mi",
		);

		// Click two points on the map to create waypoints
		const mapBox = await mapCanvas.boundingBox();
		if (!mapBox) throw new Error("Map canvas not found");

		await mapCanvas.click({
			position: {
				x: Math.round(mapBox.width * 0.3),
				y: Math.round(mapBox.height * 0.5),
			},
		});
		await page.waitForTimeout(500);
		await mapCanvas.click({
			position: {
				x: Math.round(mapBox.width * 0.7),
				y: Math.round(mapBox.height * 0.5),
			},
		});

		// Wait for routing to complete and distance to update (0.93 mi = 1500.5m)
		await expect(
			page.locator('[data-testid="distance-miles"]'),
		).not.toContainText("0.00 mi", { timeout: 15000 });
	});

	test("should recalculate distance after dragging a waypoint", async ({
		page,
	}) => {
		let requestCount = 0;

		// Mock OSRM - return different response on second call (after drag)
		await page.route("**/api/osrm/**", async (route) => {
			requestCount++;
			const response =
				requestCount <= 1 ? MOCK_OSRM_RESPONSE : MOCK_OSRM_RESPONSE_DRAGGED;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(response),
			});
		});

		await page.route("**/api/routes/elevation", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_ELEVATION_RESPONSE),
			});
		});

		await page.goto("/routes/new");
		await page.waitForLoadState("networkidle");

		const mapCanvas = page.locator(
			"#route-editor-map canvas.maplibregl-canvas",
		);
		await mapCanvas.waitFor({ state: "visible", timeout: 10000 });
		await waitForDirections(page);

		const mapBox = await mapCanvas.boundingBox();
		if (!mapBox) throw new Error("Map canvas not found");

		// Add two waypoints
		const wp1 = {
			x: Math.round(mapBox.width * 0.3),
			y: Math.round(mapBox.height * 0.5),
		};
		const wp2 = {
			x: Math.round(mapBox.width * 0.7),
			y: Math.round(mapBox.height * 0.5),
		};
		await mapCanvas.click({ position: wp1 });
		await page.waitForTimeout(500);
		await mapCanvas.click({ position: wp2 });

		// Wait for initial distance to appear
		await expect(
			page.locator('[data-testid="distance-miles"]'),
		).not.toContainText("0.00 mi", { timeout: 15000 });

		// Record the initial distance text
		const initialDistance = await page
			.locator('[data-testid="distance-miles"]')
			.textContent();

		// Simulate drag: move second waypoint to a new position
		const dragStart = {
			x: mapBox.x + wp2.x,
			y: mapBox.y + wp2.y,
		};
		const dragEnd = {
			x: mapBox.x + Math.round(mapBox.width * 0.7),
			y: mapBox.y + Math.round(mapBox.height * 0.7),
		};

		await page.mouse.move(dragStart.x, dragStart.y);
		await page.waitForTimeout(200);
		await page.mouse.down();
		await page.waitForTimeout(100);
		// Move in steps for the library to recognize the drag
		const steps = 5;
		for (let i = 1; i <= steps; i++) {
			await page.mouse.move(
				dragStart.x + ((dragEnd.x - dragStart.x) * i) / steps,
				dragStart.y + ((dragEnd.y - dragStart.y) * i) / steps,
			);
			await page.waitForTimeout(50);
		}
		await page.mouse.up();

		// Wait for the distance to change from the initial value
		// The mock returns 2800.3m (1.74 mi) for the dragged response
		await expect(
			page.locator('[data-testid="distance-miles"]'),
		).not.toContainText(initialDistance ?? "0.00 mi", { timeout: 15000 });
	});

	test("should show elevation data after route is created", async ({
		page,
	}) => {
		await page.route("**/api/osrm/**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_OSRM_RESPONSE),
			});
		});

		await page.route("**/api/routes/elevation", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_ELEVATION_RESPONSE),
			});
		});

		await page.goto("/routes/new");
		await page.waitForLoadState("networkidle");

		const mapCanvas = page.locator(
			"#route-editor-map canvas.maplibregl-canvas",
		);
		await mapCanvas.waitFor({ state: "visible", timeout: 10000 });
		await waitForDirections(page);

		const mapBox = await mapCanvas.boundingBox();
		if (!mapBox) throw new Error("Map canvas not found");

		// Add two waypoints
		await mapCanvas.click({
			position: {
				x: Math.round(mapBox.width * 0.3),
				y: Math.round(mapBox.height * 0.5),
			},
		});
		await page.waitForTimeout(500);
		await mapCanvas.click({
			position: {
				x: Math.round(mapBox.width * 0.7),
				y: Math.round(mapBox.height * 0.5),
			},
		});

		// Wait for elevation data to load (500ms debounce + API call)
		await expect(page.locator('[data-testid="elevation-gain"]')).toBeVisible({
			timeout: 20000,
		});

		// Verify elevation values from mock (gainM: 13 → 43 ft, lossM: 5 → 16 ft)
		await expect(page.locator('[data-testid="elevation-gain"]')).toContainText(
			"+43 ft",
		);
		await expect(page.locator('[data-testid="elevation-loss"]')).toContainText(
			"-16 ft",
		);
	});

	test("should preserve waypoints when switching activity type", async ({
		page,
	}) => {
		// Mock OSRM proxy for both foot and bike
		await page.route("**/api/osrm/**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_OSRM_RESPONSE),
			});
		});

		await page.route("**/api/routes/elevation", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_ELEVATION_RESPONSE),
			});
		});

		await page.goto("/routes/new");
		await page.waitForLoadState("networkidle");

		const mapCanvas = page.locator(
			"#route-editor-map canvas.maplibregl-canvas",
		);
		await mapCanvas.waitFor({ state: "visible", timeout: 10000 });
		await waitForDirections(page);

		// Wait for the UI to be fully ready
		await expect(page.locator('[data-testid="distance-miles"]')).toContainText(
			"0.00 mi",
		);

		const mapBox = await mapCanvas.boundingBox();
		if (!mapBox) throw new Error("Map canvas not found");

		// Add two waypoints (default is "running" / foot profile)
		await mapCanvas.click({
			position: {
				x: Math.round(mapBox.width * 0.3),
				y: Math.round(mapBox.height * 0.5),
			},
		});
		await page.waitForTimeout(500);
		await mapCanvas.click({
			position: {
				x: Math.round(mapBox.width * 0.7),
				y: Math.round(mapBox.height * 0.5),
			},
		});

		// Wait for initial route to appear
		await expect(
			page.locator('[data-testid="distance-miles"]'),
		).not.toContainText("0.00 mi", { timeout: 15000 });

		// Set up request listener BEFORE triggering the switch to avoid race condition
		const bikeRequestPromise = page.waitForRequest(
			(req) => req.url().includes("/osrm/bike/"),
			{ timeout: 15000 },
		);

		// Switch to cycling
		await page.selectOption("#activity-type", "cycling");

		// Wait for re-route request to bike profile
		await bikeRequestPromise;

		// Distance should still be non-zero (waypoints were preserved)
		await expect(
			page.locator('[data-testid="distance-miles"]'),
		).not.toContainText("0.00 mi", { timeout: 15000 });
	});

	// Regression: unmounting the editor after the map loaded used to throw in
	// maplibre-gl-directions teardown and blank the whole app
	test("should return to route list on cancel after map loads", async ({
		page,
	}) => {
		await page.goto("/routes/new");
		await page.waitForLoadState("networkidle");

		const mapCanvas = page.locator(
			"#route-editor-map canvas.maplibregl-canvas",
		);
		await mapCanvas.waitFor({ state: "visible", timeout: 10000 });
		await waitForDirections(page);

		await page.click('button:has-text("Cancel")');

		await expect(page).toHaveURL(/\/routes$/);
		await expect(page.locator("h1")).toContainText("My Routes");
	});

	test("should land on the new route's detail page after saving", async ({
		page,
		request,
	}) => {
		await page.route("**/api/osrm/**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_OSRM_RESPONSE),
			});
		});

		await page.route("**/api/routes/elevation", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_ELEVATION_RESPONSE),
			});
		});

		await page.goto("/routes/new");
		await page.waitForLoadState("networkidle");

		const mapCanvas = page.locator(
			"#route-editor-map canvas.maplibregl-canvas",
		);
		await mapCanvas.waitFor({ state: "visible", timeout: 10000 });
		await waitForDirections(page);

		const mapBox = await mapCanvas.boundingBox();
		if (!mapBox) throw new Error("Map canvas not found");

		await mapCanvas.click({
			position: {
				x: Math.round(mapBox.width * 0.3),
				y: Math.round(mapBox.height * 0.5),
			},
		});
		await page.waitForTimeout(500);
		await mapCanvas.click({
			position: {
				x: Math.round(mapBox.width * 0.7),
				y: Math.round(mapBox.height * 0.5),
			},
		});

		await expect(
			page.locator('[data-testid="distance-miles"]'),
		).not.toContainText("0.00 mi", { timeout: 15000 });

		await page.fill('input[placeholder="Morning Run"]', "Save Flow Test Route");
		await page.click('button:has-text("Save Route")');

		// Should navigate to the created route's detail page (cuid), not stay on
		// /routes/new or land on a blank screen
		await expect(page).toHaveURL(/\/routes\/c[a-z0-9]{15,}$/, {
			timeout: 15000,
		});
		await expect(page.locator("h1")).toContainText("Save Flow Test Route", {
			timeout: 15000,
		});

		// Clean up the route created through the real API
		const routeId = page.url().split("/").pop();
		if (routeId) await request.delete(`/api/routes/${routeId}`);
	});
});
