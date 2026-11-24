import { useCallback, useEffect, useRef, useState } from "react";

export interface ElevationData {
	elevations: number[];
	gainM: number;
	lossM: number;
}

export function useElevation(geometry: GeoJSON.LineString | null) {
	const [data, setData] = useState<ElevationData | null>(null);
	const [loading, setLoading] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const fetchElevation = useCallback(async (geom: GeoJSON.LineString) => {
		setLoading(true);
		try {
			const res = await fetch("/api/routes/elevation", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ geometry: geom }),
			});
			if (!res.ok) throw new Error("Failed to fetch elevation");
			const result = await res.json();
			setData(result);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (timerRef.current) clearTimeout(timerRef.current);

		if (!geometry || geometry.coordinates.length < 2) {
			setData(null);
			return;
		}

		timerRef.current = setTimeout(() => {
			fetchElevation(geometry);
		}, 500);

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [geometry, fetchElevation]);

	return { elevation: data, elevationLoading: loading };
}
