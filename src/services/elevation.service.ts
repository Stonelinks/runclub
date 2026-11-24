import { computeElevationStats, sampleCoordinates } from "../lib/geo.ts";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/elevation";
const BATCH_SIZE = 100;

export interface ElevationResult {
	elevations: number[];
	gainM: number;
	lossM: number;
}

async function fetchElevationBatch(
	coordinates: [number, number][],
): Promise<number[]> {
	const latitudes = coordinates.map(([, lat]) => lat).join(",");
	const longitudes = coordinates.map(([lng]) => lng).join(",");
	const url = `${OPEN_METEO_URL}?latitude=${latitudes}&longitude=${longitudes}`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Open-Meteo API error: ${response.status}`);
	}
	const data = (await response.json()) as { elevation: number[] };
	return data.elevation;
}

export async function getElevation(
	coordinates: [number, number][],
): Promise<ElevationResult> {
	const sampled = sampleCoordinates(coordinates, 200);

	const allElevations: number[] = [];
	for (let i = 0; i < sampled.length; i += BATCH_SIZE) {
		const batch = sampled.slice(i, i + BATCH_SIZE);
		const elevations = await fetchElevationBatch(batch);
		allElevations.push(...elevations);
	}

	const stats = computeElevationStats(allElevations);
	return {
		elevations: allElevations,
		...stats,
	};
}
