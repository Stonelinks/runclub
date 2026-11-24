import { expect, type Page, test } from "@playwright/test";

// Runs under the "mobile-chromium" project (Pixel 7 emulation, touch enabled).

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

const MOCK_ELEVATION_RESPONSE = {
	elevations: [10, 15, 12, 20, 18],
	gainM: 13,
	lossM: 5,
};

const ROUTE_PAYLOAD = {
	name: "Mobile Test Route With A Fairly Long Name",
	description: "Created by the mobile spec",
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
};

async function waitForDirections(page: Page) {
	await page
		.locator('#route-editor-map[data-directions-ready="true"]')
		.waitFor({ state: "attached", timeout: 20000 });
}

async function mockRouting(page: Page) {
	await page.route("**/api/osrm/**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(MOCK_OSRM_RESPONSE),
		}),
	);
	await page.route("**/api/routes/elevation", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(MOCK_ELEVATION_RESPONSE),
		}),
	);
}

async function expectNoHorizontalOverflow(page: Page) {
	const { scrollWidth, innerWidth } = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		innerWidth: window.innerWidth,
	}));
	expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

async function openEditorWithTwoWaypoints(page: Page) {
	await mockRouting(page);
	await page.goto("/routes/new");
	await page.waitForLoadState("networkidle");

	const canvas = page.locator("#route-editor-map canvas.maplibregl-canvas");
	await canvas.waitFor({ state: "visible", timeout: 10000 });
	await waitForDirections(page);
	const box = await canvas.boundingBox();
	if (!box) throw new Error("Map canvas not found");

	await canvas.tap({
		position: {
			x: Math.round(box.width * 0.3),
			y: Math.round(box.height * 0.5),
		},
	});
	await page.waitForTimeout(500);
	await canvas.tap({
		position: {
			x: Math.round(box.width * 0.7),
			y: Math.round(box.height * 0.5),
		},
	});
	await expect(
		page.locator('[data-testid="distance-miles"]'),
	).not.toContainText("0.00 mi", { timeout: 15000 });
	return { canvas, box };
}

test.describe("Mobile layout", () => {
	test("editor: map fills the width and the panel sits below it", async ({
		page,
	}) => {
		await mockRouting(page);
		await page.goto("/routes/new");
		await page.waitForLoadState("networkidle");

		const canvas = page.locator("#route-editor-map canvas.maplibregl-canvas");
		await canvas.waitFor({ state: "visible", timeout: 10000 });
		await waitForDirections(page);
		await expectNoHorizontalOverflow(page);

		const viewport = page.viewportSize();
		if (!viewport) throw new Error("no viewport");
		const mapBox = await canvas.boundingBox();
		const panelBox = await page
			.locator('[data-testid="map-page-panel"]')
			.boundingBox();
		if (!mapBox || !panelBox) throw new Error("layout boxes missing");

		expect(mapBox.width).toBeGreaterThanOrEqual(viewport.width - 2);
		expect(panelBox.width).toBeGreaterThanOrEqual(viewport.width - 2);
		// Panel is below the map, and collapsed to just the handle
		expect(panelBox.y).toBeGreaterThanOrEqual(mapBox.y + mapBox.height - 1);
		expect(panelBox.height).toBeLessThanOrEqual(72);
		// Map gets most of the screen
		expect(mapBox.height).toBeGreaterThan(viewport.height * 0.5);
	});

	test("editor: tap to add waypoints, expand sheet, reorder, save", async ({
		page,
		request,
	}) => {
		await openEditorWithTwoWaypoints(page);

		// Form is hidden while collapsed, visible once expanded
		const nameInput = page.locator("#route-name");
		await expect(nameInput).toBeHidden();
		await page.getByRole("button", { name: "Expand details" }).tap();
		await expect(nameInput).toBeVisible();

		// 16px inputs (no iOS focus zoom) and comfortable tap targets
		expect(
			await nameInput.evaluate((el) => getComputedStyle(el).fontSize),
		).toBe("16px");
		const removeBox = await page
			.getByRole("button", { name: "Remove waypoint 1" })
			.boundingBox();
		expect(removeBox?.height ?? 0).toBeGreaterThanOrEqual(40);
		expect(removeBox?.width ?? 0).toBeGreaterThanOrEqual(40);

		// Reorder with the move buttons (drag-and-drop does not fire on touch)
		const coords = page.locator('[data-testid="waypoint-coords"]');
		const first = await coords.nth(0).textContent();
		const second = await coords.nth(1).textContent();
		expect(first).not.toBe(second);
		await page.getByRole("button", { name: "Move waypoint 1 down" }).tap();
		await expect(coords.nth(0)).toHaveText(second ?? "");
		await expect(coords.nth(1)).toHaveText(first ?? "");

		await nameInput.fill("Mobile Save Flow");
		await page.getByRole("button", { name: "Save Route" }).tap();
		await expect(page).toHaveURL(/\/routes\/c[a-z0-9]{15,}$/, {
			timeout: 15000,
		});
		await expect(page.locator("h1")).toContainText("Mobile Save Flow", {
			timeout: 15000,
		});

		const routeId = page.url().split("/").pop();
		if (routeId) await request.delete(`/api/routes/${routeId}`);
	});

	test("detail: header actions reachable, stats behind the sheet", async ({
		page,
		request,
	}) => {
		const res = await request.post("/api/routes", { data: ROUTE_PAYLOAD });
		const route = await res.json();

		await page.goto(`/routes/${route.id}`);
		await page.waitForLoadState("networkidle");
		await expectNoHorizontalOverflow(page);

		await expect(page.locator("h1")).toContainText(ROUTE_PAYLOAD.name);
		for (const label of ["Back", "Edit", "Delete"]) {
			await expect(page.getByRole("button", { name: label })).toBeInViewport();
		}

		await expect(page.locator("text=Route Stats")).toBeHidden();
		await page.getByRole("button", { name: "Expand details" }).tap();
		await expect(page.locator("text=Route Stats")).toBeVisible();
		await expect(page.locator(".route-detail-description")).toBeVisible();

		await page.getByRole("button", { name: "Back" }).tap();
		await expect(page).toHaveURL(/\/routes$/);

		await request.delete(`/api/routes/${route.id}`);
	});

	test("list: cards fit the screen and delete works", async ({
		page,
		request,
	}) => {
		await request.post("/api/routes", {
			data: { ...ROUTE_PAYLOAD, name: "Mobile Route To Delete" },
		});

		await page.goto("/routes");
		await expect(
			page.locator("text=Mobile Route To Delete").first(),
		).toBeVisible();
		await expectNoHorizontalOverflow(page);

		page.on("dialog", (dialog) => dialog.accept());
		const card = page
			.locator(".route-card", { hasText: "Mobile Route To Delete" })
			.first();
		// The card itself is role="button", which makes its children presentational
		// to role queries, so target the nested button by CSS.
		await card.locator('button:has-text("Delete")').tap();
		await expect(page.locator("text=Mobile Route To Delete")).toHaveCount(0);
	});
});
