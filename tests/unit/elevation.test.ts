import { describe, expect, it } from "bun:test";
import { computeElevationStats } from "../../src/lib/geo.ts";

describe("elevation computation", () => {
	it("computes elevation gain and loss correctly", () => {
		const elevations = [0, 100, 50, 200, 150];
		const stats = computeElevationStats(elevations);
		expect(stats.gainM).toBe(250); // 100 + 150
		expect(stats.lossM).toBe(100); // 50 + 50
	});

	it("handles single point", () => {
		const stats = computeElevationStats([100]);
		expect(stats.gainM).toBe(0);
		expect(stats.lossM).toBe(0);
	});

	it("handles all ascending", () => {
		const elevations = [0, 50, 100, 150, 200];
		const stats = computeElevationStats(elevations);
		expect(stats.gainM).toBe(200);
		expect(stats.lossM).toBe(0);
	});

	it("handles all descending", () => {
		const elevations = [200, 150, 100, 50, 0];
		const stats = computeElevationStats(elevations);
		expect(stats.gainM).toBe(0);
		expect(stats.lossM).toBe(200);
	});
});
