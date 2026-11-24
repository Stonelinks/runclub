import { describe, expect, it } from "bun:test";
import { parseRouteData } from "../../src/lib/geo.ts";

describe("parseRouteData", () => {
	it("parses valid GeoJSON route data", () => {
		const data = {
			directions: {
				code: "Ok",
				routes: [
					{
						distance: 1500.5,
						duration: 300,
						geometry: {
							type: "LineString",
							coordinates: [
								[-73.97, 40.77],
								[-73.98, 40.78],
							],
						},
						legs: [],
					},
				],
				waypoints: [],
			},
		};
		const result = parseRouteData(data);
		expect(result).not.toBeNull();
		expect(result?.distance).toBe(1500.5);
		expect(result?.geometry.type).toBe("LineString");
		expect(result?.geometry.coordinates).toEqual([
			[-73.97, 40.77],
			[-73.98, 40.78],
		]);
	});

	it("clones coordinates array", () => {
		const coords = [
			[-73.97, 40.77],
			[-73.98, 40.78],
		];
		const data = {
			directions: {
				routes: [{ distance: 100, geometry: { coordinates: coords } }],
			},
		};
		const result = parseRouteData(data);
		expect(result).not.toBeNull();
		expect(result?.geometry.coordinates).not.toBe(coords);
		expect(result?.geometry.coordinates).toEqual(coords);
	});

	it("returns null for null input", () => {
		expect(parseRouteData(null)).toBeNull();
	});

	it("returns null for undefined input", () => {
		expect(parseRouteData(undefined)).toBeNull();
	});

	it("returns null when directions is undefined", () => {
		expect(parseRouteData({})).toBeNull();
		expect(parseRouteData({ directions: undefined })).toBeNull();
	});

	it("returns null when routes array is empty", () => {
		expect(parseRouteData({ directions: { routes: [] } })).toBeNull();
	});

	it("returns null when routes is not an array", () => {
		expect(parseRouteData({ directions: { routes: "invalid" } })).toBeNull();
	});

	it("returns null when geometry is missing", () => {
		expect(
			parseRouteData({ directions: { routes: [{ distance: 100 }] } }),
		).toBeNull();
	});

	it("returns null when geometry is a polyline string", () => {
		expect(
			parseRouteData({
				directions: {
					routes: [{ distance: 100, geometry: "_p~iF~ps|U_ulLnnqC" }],
				},
			}),
		).toBeNull();
	});

	it("returns null when geometry has no coordinates", () => {
		expect(
			parseRouteData({
				directions: { routes: [{ distance: 100, geometry: {} }] },
			}),
		).toBeNull();
	});

	it("defaults distance to 0 when not a number", () => {
		const data = {
			directions: {
				routes: [
					{
						geometry: {
							coordinates: [
								[-73.97, 40.77],
								[-73.98, 40.78],
							],
						},
					},
				],
			},
		};
		const result = parseRouteData(data);
		expect(result).not.toBeNull();
		expect(result?.distance).toBe(0);
	});
});
