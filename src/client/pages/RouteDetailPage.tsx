import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import { ElevationProfile } from "../components/ElevationProfile.tsx";
import { MapPageLayout } from "../components/MapPageLayout.tsx";
import { metersToMiles, StatsPanel } from "../components/StatsPanel.tsx";
import { useRoutes } from "../hooks/useRoutes.ts";
import { useWaypointMarkers } from "../hooks/useWaypointMarkers.ts";

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
}

export function RouteDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { fetchRoute, deleteRoute } = useRoutes();
	const [route, setRoute] = useState<RouteDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);

	const elevation = useMemo<number[]>(() => {
		if (!route?.elevationProfile) return [];
		try {
			const parsed = JSON.parse(route.elevationProfile);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}, [route?.elevationProfile]);

	const parsedWaypoints = useMemo<[number, number][]>(() => {
		if (!route?.waypoints) return [];
		try {
			return JSON.parse(route.waypoints);
		} catch {
			return [];
		}
	}, [route?.waypoints]);

	useWaypointMarkers(mapInstance, parsedWaypoints);

	useEffect(() => {
		if (!id) return;
		setLoading(true);
		fetchRoute(id).then((data) => {
			setRoute(data as RouteDetail | null);
			setLoading(false);
		});
	}, [id, fetchRoute]);

	useEffect(() => {
		if (!route || !mapContainerRef.current || mapRef.current) return;

		let geojson: {
			type: string;
			features: Array<{ geometry: { coordinates: [number, number][] } }>;
		};
		try {
			geojson = JSON.parse(route.geojson);
		} catch {
			return;
		}

		const coords = geojson.features?.[0]?.geometry?.coordinates;
		if (!coords || coords.length === 0) return;

		const map = new maplibregl.Map({
			container: mapContainerRef.current,
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
				layers: [{ id: "osm", type: "raster", source: "osm" }],
			},
			center: coords[0],
			zoom: 13,
		});

		map.addControl(new maplibregl.NavigationControl(), "top-right");

		map.on("load", () => {
			map.addSource("route", {
				type: "geojson",
				data: geojson as unknown as GeoJSON.GeoJSON,
			});
			map.addLayer({
				id: "route-line",
				type: "line",
				source: "route",
				paint: {
					"line-color": "#3b82f6",
					"line-width": 4,
				},
			});

			// Fit bounds to route
			const bounds = new maplibregl.LngLatBounds();
			for (const coord of coords) {
				bounds.extend(coord);
			}
			map.fitBounds(bounds, { padding: 50 });
		});

		mapRef.current = map;
		setMapInstance(map);

		return () => {
			map.remove();
			mapRef.current = null;
			setMapInstance(null);
		};
	}, [route]);

	const handleDelete = async () => {
		if (!id || !confirm("Are you sure you want to delete this route?")) return;
		try {
			await deleteRoute(id);
			navigate("/routes");
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to delete");
		}
	};

	if (loading) {
		return (
			<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
		);
	}

	if (!route) {
		return (
			<div style={{ padding: "2rem", textAlign: "center" }}>
				<p>Route not found</p>
				<button type="button" onClick={() => navigate("/routes")}>
					Back to Routes
				</button>
			</div>
		);
	}

	const activityBadge = (
		<span
			style={{
				display: "inline-block",
				padding: "0.125rem 0.5rem",
				borderRadius: "12px",
				fontSize: "0.75rem",
				background: route.activityType === "running" ? "#dcfce7" : "#dbeafe",
				color: route.activityType === "running" ? "#166534" : "#1e40af",
			}}
		>
			{route.activityType}
		</span>
	);

	return (
		<MapPageLayout
			title={route.name}
			subtitle={route.description}
			actions={
				<>
					<button
						type="button"
						onClick={() => navigate("/routes")}
						style={{
							padding: "0.5rem 1rem",
							border: "1px solid #d1d5db",
							borderRadius: "6px",
							background: "white",
							cursor: "pointer",
						}}
					>
						Back
					</button>
					<button
						type="button"
						onClick={() => navigate(`/routes/${id}/edit`)}
						style={{
							padding: "0.5rem 1rem",
							border: "1px solid #3b82f6",
							borderRadius: "6px",
							background: "white",
							color: "#3b82f6",
							cursor: "pointer",
						}}
					>
						Edit
					</button>
					<button
						type="button"
						onClick={handleDelete}
						style={{
							padding: "0.5rem 1rem",
							border: "1px solid #fca5a5",
							borderRadius: "6px",
							background: "#fef2f2",
							color: "#dc2626",
							cursor: "pointer",
						}}
					>
						Delete
					</button>
				</>
			}
			map={
				<div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
			}
			peek={
				<>
					{metersToMiles(route.distanceMeters)} mi
					<span
						style={{
							marginLeft: "0.5rem",
							fontWeight: 400,
							color: "#22c55e",
							fontSize: "0.875rem",
						}}
					>
						+{Math.round(route.elevationGainM * 3.28084)} ft
					</span>
				</>
			}
		>
			<div>
				{activityBadge}
				{route.description && (
					<p
						className="route-detail-description"
						style={{
							margin: "0.5rem 0 0",
							fontSize: "0.875rem",
							color: "#666",
						}}
					>
						{route.description}
					</p>
				)}
				<div
					style={{
						marginTop: "0.5rem",
						fontSize: "0.75rem",
						color: "#999",
					}}
				>
					Created {new Date(route.createdAt).toLocaleDateString()}
				</div>
			</div>

			<StatsPanel
				distanceMeters={route.distanceMeters}
				elevationGainM={route.elevationGainM}
				elevationLossM={route.elevationLossM}
			/>

			{elevation.length > 1 ? (
				<ElevationProfile elevations={elevation} />
			) : (
				<div style={{ fontSize: "0.875rem", color: "#999" }}>
					Elevation data unavailable
				</div>
			)}
		</MapPageLayout>
	);
}
