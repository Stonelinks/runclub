import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

export function useWaypointMarkers(
	map: maplibregl.Map | null,
	waypoints: [number, number][],
) {
	const markersRef = useRef<maplibregl.Marker[]>([]);

	useEffect(() => {
		// Clear existing markers
		for (const marker of markersRef.current) {
			marker.remove();
		}
		markersRef.current = [];

		if (!map || waypoints.length === 0) return;

		for (let i = 0; i < waypoints.length; i++) {
			const wp = waypoints[i]!;
			const el = document.createElement("div");
			el.style.cssText = `
				width: 22px;
				height: 22px;
				border-radius: 50%;
				background: #3b82f6;
				color: white;
				font-size: 11px;
				font-weight: 700;
				display: flex;
				align-items: center;
				justify-content: center;
				border: 2px solid white;
				box-shadow: 0 1px 3px rgba(0,0,0,0.3);
				pointer-events: none;
			`;
			el.textContent = String(i + 1);

			const marker = new maplibregl.Marker({ element: el })
				.setLngLat(wp)
				.addTo(map);

			markersRef.current.push(marker);
		}

		return () => {
			for (const marker of markersRef.current) {
				marker.remove();
			}
			markersRef.current = [];
		};
	}, [map, waypoints]);
}
