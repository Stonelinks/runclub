const OSRM_FOOT_URL = process.env.OSRM_FOOT_URL ?? "http://localhost:5001";
const OSRM_BIKE_URL = process.env.OSRM_BIKE_URL ?? "http://localhost:5002";

export interface OsrmRouteResult {
	distance: number; // meters
	duration: number; // seconds
	geometry: {
		type: "LineString";
		coordinates: [number, number][];
	};
}

export async function getOsrmRoute(
	coordinates: [number, number][],
	profile: "foot" | "bike" = "foot",
): Promise<OsrmRouteResult> {
	const baseUrl = profile === "bike" ? OSRM_BIKE_URL : OSRM_FOOT_URL;
	const osrmProfile = profile === "bike" ? "bicycle" : "foot";
	const coordStr = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(";");
	const url = `${baseUrl}/route/v1/${osrmProfile}/${coordStr}?overview=full&geometries=geojson`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`OSRM API error: ${response.status}`);
	}

	const data = (await response.json()) as {
		routes: Array<{
			distance: number;
			duration: number;
			geometry: {
				type: "LineString";
				coordinates: [number, number][];
			};
		}>;
	};

	const route = data.routes[0];
	if (!route) {
		throw new Error("No route found");
	}

	return {
		distance: route.distance,
		duration: route.duration,
		geometry: route.geometry,
	};
}
