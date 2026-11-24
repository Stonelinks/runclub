import { describe, expect, it } from "bun:test";
import {
	computeElevationStats,
	extractLineStringCoordinates,
	sampleCoordinates,
} from "../../src/lib/geo.ts";

describe("extractLineStringCoordinates", () => {
	it("extracts coordinates from a FeatureCollection with a LineString", () => {
		const geojson = JSON.stringify({
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
						],
					},
				},
			],
		});
		expect(extractLineStringCoordinates(geojson)).toEqual([
			[-122.4, 37.77],
			[-122.41, 37.78],
		]);
	});

	it("skips non-LineString features", () => {
		const geojson = JSON.stringify({
			type: "FeatureCollection",
			features: [
				{ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] } },
				{
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: [
							[1, 2],
							[3, 4],
						],
					},
				},
			],
		});
		expect(extractLineStringCoordinates(geojson)).toEqual([
			[1, 2],
			[3, 4],
		]);
	});

	it("returns null for empty features", () => {
		const geojson = JSON.stringify({ type: "FeatureCollection", features: [] });
		expect(extractLineStringCoordinates(geojson)).toBeNull();
	});

	it("returns null for invalid JSON", () => {
		expect(extractLineStringCoordinates("not json")).toBeNull();
	});

	it("returns null for a LineString with fewer than 2 points", () => {
		const geojson = JSON.stringify({
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					geometry: { type: "LineString", coordinates: [[1, 2]] },
				},
			],
		});
		expect(extractLineStringCoordinates(geojson)).toBeNull();
	});
});

describe("sampleCoordinates", () => {
	it("returns all coordinates when under max", () => {
		const coords: [number, number][] = [
			[0, 0],
			[1, 1],
			[2, 2],
		];
		expect(sampleCoordinates(coords, 10)).toEqual(coords);
	});

	it("samples down to maxPoints", () => {
		const coords: [number, number][] = Array.from(
			{ length: 100 },
			(_, i) => [i, i] as [number, number],
		);
		const sampled = sampleCoordinates(coords, 10);
		expect(sampled.length).toBe(10);
		expect(sampled[0]).toEqual([0, 0]);
		expect(sampled[sampled.length - 1]).toEqual([99, 99]);
	});
});

describe("computeElevationStats", () => {
	it("computes gain and loss", () => {
		const elevations = [100, 150, 120, 200, 180];
		const stats = computeElevationStats(elevations);
		expect(stats.gainM).toBe(130); // 50 + 80
		expect(stats.lossM).toBe(50); // 30 + 20
	});

	it("handles flat terrain", () => {
		const elevations = [100, 100, 100];
		const stats = computeElevationStats(elevations);
		expect(stats.gainM).toBe(0);
		expect(stats.lossM).toBe(0);
	});

	it("handles empty array", () => {
		const stats = computeElevationStats([]);
		expect(stats.gainM).toBe(0);
		expect(stats.lossM).toBe(0);
	});
});
