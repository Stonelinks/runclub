import { expect, test } from "@playwright/test";

test.describe("Route CRUD", () => {
	test("should show route list page", async ({ page }) => {
		await page.goto("/routes");
		await expect(page.locator("h1")).toContainText("My Routes");
		await expect(page.locator('button:has-text("New Route")')).toBeVisible();
	});

	test("should create a route via API and see it in list", async ({
		page,
		request,
	}) => {
		// Create a route via API
		const response = await request.post("/api/routes", {
			data: {
				name: "E2E Test Route",
				description: "Created by Playwright",
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
				distanceMeters: 1500,
				elevationGainM: 10,
				elevationLossM: 5,
			},
		});
		expect(response.ok()).toBeTruthy();
		const route = await response.json();

		// Visit route list and verify route is displayed
		await page.goto("/routes");
		await expect(page.locator("text=E2E Test Route").first()).toBeVisible();

		// Delete via API to clean up
		await request.delete(`/api/routes/${route.id}`);
	});

	test("should delete a route via UI", async ({ page, request }) => {
		// Create a route via API
		await request.post("/api/routes", {
			data: {
				name: "Route To Delete",
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
				distanceMeters: 2000,
				elevationGainM: 15,
				elevationLossM: 10,
			},
		});

		// Visit route list
		await page.goto("/routes");
		await expect(page.locator("text=Route To Delete").first()).toBeVisible();

		// Delete
		page.on("dialog", (dialog) => dialog.accept());
		await page.locator('button:has-text("Delete")').first().click();

		// Verify gone
		await expect(page.locator("text=Route To Delete")).not.toBeVisible();
	});

	test("API CRUD lifecycle", async ({ request }) => {
		// Create
		const createRes = await request.post("/api/routes", {
			data: {
				name: "API Lifecycle Route",
				activityType: "running",
				geojson: JSON.stringify({
					type: "FeatureCollection",
					features: [],
				}),
				waypoints: JSON.stringify([[-73.97, 40.77]]),
				distanceMeters: 1000,
			},
		});
		expect(createRes.ok()).toBeTruthy();
		const route = await createRes.json();
		expect(route.id).toBeDefined();

		// Read
		const readRes = await request.get(`/api/routes/${route.id}`);
		expect(readRes.ok()).toBeTruthy();
		const read = await readRes.json();
		expect(read.name).toBe("API Lifecycle Route");

		// Update
		const updateRes = await request.put(`/api/routes/${route.id}`, {
			data: { name: "Updated Route" },
		});
		expect(updateRes.ok()).toBeTruthy();
		const updated = await updateRes.json();
		expect(updated.name).toBe("Updated Route");

		// Delete
		const deleteRes = await request.delete(`/api/routes/${route.id}`);
		expect(deleteRes.ok()).toBeTruthy();

		// Verify deleted
		const verifyRes = await request.get(`/api/routes/${route.id}`);
		expect(verifyRes.status()).toBe(404);
	});
});
