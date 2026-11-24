import { prisma } from "../lib/db.ts";
import { extractLineStringCoordinates } from "../lib/geo.ts";
import type { CreateRouteInput, UpdateRouteInput } from "../lib/validation.ts";
import { getElevation } from "./elevation.service.ts";

interface ElevationFields {
	elevationGainM: number;
	elevationLossM: number;
	elevationProfile: string;
}

// Elevation is computed server-side from the route geometry; the client-sent
// gain/loss are only a fallback for when Open-Meteo is unreachable at save time.
async function computeElevationFields(
	geojson: string,
): Promise<ElevationFields | null> {
	const coordinates = extractLineStringCoordinates(geojson);
	if (!coordinates) return null;
	try {
		const { elevations, gainM, lossM } = await getElevation(coordinates);
		if (elevations.length < 2) return null;
		return {
			elevationGainM: gainM,
			elevationLossM: lossM,
			elevationProfile: JSON.stringify(elevations),
		};
	} catch {
		return null;
	}
}

export async function listRoutes() {
	return prisma.route.findMany({
		select: {
			id: true,
			name: true,
			activityType: true,
			distanceMeters: true,
			elevationGainM: true,
			createdAt: true,
		},
		orderBy: { createdAt: "desc" },
	});
}

export async function getRoute(id: string) {
	const route = await prisma.route.findUnique({ where: { id } });
	if (!route || route.elevationProfile !== null) return route;

	// Self-heal routes saved while elevation data was unavailable.
	const elevation = await computeElevationFields(route.geojson);
	if (!elevation) return route;
	return prisma.route.update({ where: { id }, data: elevation });
}

export async function createRoute(data: CreateRouteInput) {
	const elevation = await computeElevationFields(data.geojson);
	return prisma.route.create({ data: { ...data, ...elevation } });
}

export async function updateRoute(id: string, data: UpdateRouteInput) {
	// A changed geometry invalidates the stored profile; if recomputation fails,
	// null it out so getRoute's self-heal recomputes it later.
	const elevation = data.geojson
		? ((await computeElevationFields(data.geojson)) ?? {
				elevationProfile: null,
			})
		: null;
	return prisma.route.update({
		where: { id },
		data: { ...data, ...elevation },
	});
}

export async function deleteRoute(id: string) {
	return prisma.route.delete({ where: { id } });
}
