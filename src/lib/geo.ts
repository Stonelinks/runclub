export function sampleCoordinates(
	coordinates: [number, number][],
	maxPoints: number,
): [number, number][] {
	if (coordinates.length <= maxPoints) return coordinates;
	const step = (coordinates.length - 1) / (maxPoints - 1);
	const sampled: [number, number][] = [];
	for (let i = 0; i < maxPoints; i++) {
		const idx = Math.round(i * step);
		const coord = coordinates[idx];
		if (coord) sampled.push(coord);
	}
	return sampled;
}

export function parseRouteData(data: unknown): {
	distance: number;
	geometry: GeoJSON.LineString;
} | null {
	if (!data || typeof data !== "object") return null;
	const d = data as Record<string, unknown>;
	const directions = d.directions;
	if (!directions || typeof directions !== "object") return null;
	const dir = directions as Record<string, unknown>;
	const routes = dir.routes;
	if (!Array.isArray(routes) || routes.length === 0) return null;
	const route = routes[0] as Record<string, unknown>;
	const geom = route.geometry;
	if (typeof geom !== "object" || geom === null || !("coordinates" in geom))
		return null;
	const g = geom as { coordinates: [number, number][] };
	return {
		distance: typeof route.distance === "number" ? route.distance : 0,
		geometry: { type: "LineString", coordinates: [...g.coordinates] },
	};
}

export function extractLineStringCoordinates(
	geojsonStr: string,
): [number, number][] | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(geojsonStr);
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== "object") return null;
	const features = (parsed as Record<string, unknown>).features;
	if (!Array.isArray(features)) return null;
	for (const feature of features) {
		if (!feature || typeof feature !== "object") continue;
		const geometry = (feature as Record<string, unknown>).geometry;
		if (!geometry || typeof geometry !== "object") continue;
		const g = geometry as { type?: unknown; coordinates?: unknown };
		if (g.type !== "LineString" || !Array.isArray(g.coordinates)) continue;
		const coords = g.coordinates.filter(
			(c): c is [number, number] =>
				Array.isArray(c) &&
				c.length >= 2 &&
				typeof c[0] === "number" &&
				typeof c[1] === "number",
		);
		if (coords.length >= 2) return coords;
	}
	return null;
}

export function computeElevationStats(elevations: number[]): {
	gainM: number;
	lossM: number;
} {
	let gainM = 0;
	let lossM = 0;
	for (let i = 1; i < elevations.length; i++) {
		const prev = elevations[i - 1];
		const curr = elevations[i];
		if (prev === undefined || curr === undefined) continue;
		const diff = curr - prev;
		if (diff > 0) gainM += diff;
		else lossM += Math.abs(diff);
	}
	return { gainM, lossM };
}
