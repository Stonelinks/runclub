import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";
import type maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseRouteData } from "../../lib/geo.ts";

export interface DirectionsState {
	distance: number;
	waypoints: [number, number][];
	geometry: GeoJSON.LineString | null;
}

export function useDirections(
	map: maplibregl.Map | null,
	isLoaded: boolean,
	activityType: "running" | "cycling" = "running",
) {
	const profile = activityType === "cycling" ? "bike" : "foot";
	const directionsRef = useRef<MapLibreGlDirections | null>(null);
	const savedWaypointsRef = useRef<[number, number][]>([]);
	const [state, setState] = useState<DirectionsState>({
		distance: 0,
		waypoints: [],
		geometry: null,
	});

	useEffect(() => {
		if (!map || !isLoaded) return;

		const directions = new MapLibreGlDirections(map, {
			profile,
			requestOptions: {
				alternatives: "false",
				geometries: "geojson",
				overview: "full",
			},
			api: "/api/osrm",
		});

		directions.interactive = true;

		directions.on("fetchroutesend", (e) => {
			const parsed = parseRouteData(e.data);
			if (parsed) {
				setState({
					distance: parsed.distance,
					waypoints: [...directions.waypoints],
					geometry: parsed.geometry,
				});
			}
		});

		directions.on("removewaypoint", () => {
			const wps = directions.waypoints;
			if (wps.length < 2) {
				setState({ distance: 0, waypoints: [...wps], geometry: null });
			} else {
				setState((prev) => ({
					...prev,
					waypoints: [...wps],
				}));
			}
		});

		directionsRef.current = directions;
		// Lets tests (and anything else) know the map now accepts clicks/taps
		map.getContainer().dataset.directionsReady = "true";

		// Restore waypoints saved from previous instance (e.g. after profile switch)
		const waypointsToRestore = savedWaypointsRef.current;
		if (waypointsToRestore.length >= 2) {
			directions.setWaypoints(waypointsToRestore);
			savedWaypointsRef.current = [];
		}

		return () => {
			// Save current waypoints before destroying so they can be restored
			savedWaypointsRef.current = [...directions.waypoints];
			try {
				// map.remove() (useMap cleanup) runs before this on unmount and
				// deletes map.style, which destroy() needs
				if (map.style) directions.destroy();
			} catch {
				// map already torn down; nothing left to clean up
			}
			directionsRef.current = null;
			delete map.getContainer().dataset.directionsReady;
		};
	}, [map, isLoaded, profile]);

	const setWaypoints = useCallback(async (waypoints: [number, number][]) => {
		const directions = directionsRef.current;
		if (!directions) return;
		await directions.setWaypoints(waypoints);
	}, []);

	const removeWaypoint = useCallback(async (index: number) => {
		const directions = directionsRef.current;
		if (!directions) return;
		await directions.removeWaypoint(index);
	}, []);

	const getGeoJSON = useCallback(() => {
		if (!state.geometry) return null;
		return JSON.stringify({
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: {},
					geometry: state.geometry,
				},
			],
		});
	}, [state.geometry]);

	return {
		...state,
		setWaypoints,
		removeWaypoint,
		getGeoJSON,
		directions: directionsRef.current,
	};
}
