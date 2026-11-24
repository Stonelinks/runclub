import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

export function useMap(containerId: string) {
	const mapRef = useRef<maplibregl.Map | null>(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (mapRef.current) return;

		try {
			const map = new maplibregl.Map({
				container: containerId,
				style: {
					version: 8,
					sources: {
						osm: {
							type: "raster",
							tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
							tileSize: 256,
							attribution: "&copy; OpenStreetMap contributors",
						},
					},
					layers: [
						{
							id: "osm",
							type: "raster",
							source: "osm",
						},
					],
				},
				center: [-73.97, 40.77],
				zoom: 13,
			});

			map.addControl(new maplibregl.NavigationControl(), "top-right");

			map.on("load", () => {
				setIsLoaded(true);
			});

			map.on("error", (e) => {
				console.error("Map error:", e);
			});

			navigator.geolocation?.getCurrentPosition(
				(pos) => {
					map.setCenter([pos.coords.longitude, pos.coords.latitude]);
				},
				() => {},
				{ timeout: 5000 },
			);

			mapRef.current = map;

			return () => {
				map.remove();
				mapRef.current = null;
				setIsLoaded(false);
			};
		} catch (e) {
			console.error("Failed to initialize map:", e);
			setError(e instanceof Error ? e.message : "Failed to initialize map");
		}
	}, [containerId]);

	return { map: mapRef.current, isLoaded, mapError: error };
}
