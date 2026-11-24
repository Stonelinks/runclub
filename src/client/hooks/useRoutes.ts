import { useCallback, useState } from "react";

interface RouteListItem {
	id: string;
	name: string;
	activityType: string;
	distanceMeters: number;
	elevationGainM: number;
	createdAt: string;
}

interface RouteDetail {
	id: string;
	name: string;
	description: string | null;
	activityType: string;
	geojson: string;
	waypoints: string;
	distanceMeters: number;
	elevationGainM: number;
	elevationLossM: number;
	elevationProfile: string | null;
	createdAt: string;
	updatedAt: string;
}

export function useRoutes() {
	const [routes, setRoutes] = useState<RouteListItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchRoutes = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/routes");
			if (!res.ok) throw new Error("Failed to fetch routes");
			const data = await res.json();
			setRoutes(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchRoute = useCallback(
		async (id: string): Promise<RouteDetail | null> => {
			try {
				const res = await fetch(`/api/routes/${id}`);
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		},
		[],
	);

	const createRoute = useCallback(
		async (data: {
			name: string;
			description?: string;
			activityType: string;
			geojson: string;
			waypoints: string;
			distanceMeters: number;
			elevationGainM?: number;
			elevationLossM?: number;
		}) => {
			const res = await fetch("/api/routes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) throw new Error("Failed to create route");
			return await res.json();
		},
		[],
	);

	const updateRoute = useCallback(
		async (id: string, data: Record<string, unknown>) => {
			const res = await fetch(`/api/routes/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) throw new Error("Failed to update route");
			return await res.json();
		},
		[],
	);

	const deleteRoute = useCallback(async (id: string) => {
		const res = await fetch(`/api/routes/${id}`, { method: "DELETE" });
		if (!res.ok) throw new Error("Failed to delete route");
	}, []);

	return {
		routes,
		loading,
		error,
		fetchRoutes,
		fetchRoute,
		createRoute,
		updateRoute,
		deleteRoute,
	};
}
