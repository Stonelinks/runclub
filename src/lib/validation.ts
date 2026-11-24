import { z } from "zod/v4";

const coordinatePair = z.tuple([z.number(), z.number()]);

export const createRouteSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	activityType: z.enum(["cycling", "running"]).default("cycling"),
	geojson: z.string().min(1, "GeoJSON is required"),
	waypoints: z.string().min(1, "Waypoints are required"),
	distanceMeters: z.number().nonnegative(),
	elevationGainM: z.number().nonnegative().default(0),
	elevationLossM: z.number().nonnegative().default(0),
});

export const updateRouteSchema = createRouteSchema.partial();

export const elevationRequestSchema = z.object({
	geometry: z.object({
		type: z.literal("LineString"),
		coordinates: z.array(coordinatePair),
	}),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type ElevationRequest = z.infer<typeof elevationRequestSchema>;
