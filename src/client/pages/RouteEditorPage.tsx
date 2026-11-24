import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import { ElevationProfile } from "../components/ElevationProfile.tsx";
import { MapContainer } from "../components/MapContainer.tsx";
import { MapPageLayout } from "../components/MapPageLayout.tsx";
import { metersToMiles, StatsPanel } from "../components/StatsPanel.tsx";
import { WaypointList } from "../components/WaypointList.tsx";
import { useDirections } from "../hooks/useDirections.ts";
import { useElevation } from "../hooks/useElevation.ts";
import { useMap } from "../hooks/useMap.ts";
import { useRoutes } from "../hooks/useRoutes.ts";
import { useWaypointMarkers } from "../hooks/useWaypointMarkers.ts";

const labelStyle: React.CSSProperties = {
	display: "block",
	fontSize: "0.75rem",
	fontWeight: 600,
	marginBottom: "0.25rem",
	color: "#374151",
};

const fieldStyle: React.CSSProperties = {
	width: "100%",
	padding: "0.5rem",
	border: "1px solid #d1d5db",
	borderRadius: "6px",
	boxSizing: "border-box",
};

export function RouteEditorPage() {
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	const isEditing = Boolean(id);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [activityType, setActivityType] = useState<"running" | "cycling">(
		"running",
	);
	const [saving, setSaving] = useState(false);

	const { map, isLoaded } = useMap("route-editor-map");
	const {
		distance,
		waypoints,
		geometry,
		getGeoJSON,
		setWaypoints,
		removeWaypoint,
	} = useDirections(map, isLoaded, activityType);
	const { elevation, elevationLoading } = useElevation(geometry);
	const { createRoute, updateRoute, fetchRoute } = useRoutes();
	useWaypointMarkers(map, waypoints);

	useEffect(() => {
		if (!id || !isLoaded) return;
		fetchRoute(id).then((route) => {
			if (!route) return;
			setName(route.name);
			setDescription(route.description ?? "");
			setActivityType(route.activityType as "running" | "cycling");
			try {
				const wps = JSON.parse(route.waypoints) as [number, number][];
				if (wps.length > 0) {
					setTimeout(() => setWaypoints(wps), 500);
				}
			} catch {
				// ignore parse errors
			}
		});
	}, [id, isLoaded, fetchRoute, setWaypoints]);

	const handleSave = async () => {
		if (!name.trim()) {
			alert("Please enter a route name");
			return;
		}
		const geojson = getGeoJSON();
		if (!geojson) {
			alert("Please add at least 2 waypoints to create a route");
			return;
		}

		setSaving(true);
		try {
			const payload = {
				name: name.trim(),
				description: description.trim() || undefined,
				activityType,
				geojson,
				waypoints: JSON.stringify(waypoints),
				distanceMeters: distance,
				elevationGainM: elevation?.gainM ?? 0,
				elevationLossM: elevation?.lossM ?? 0,
			};

			if (isEditing && id) {
				await updateRoute(id, payload);
				navigate(`/routes/${id}`);
			} else {
				const created = await createRoute(payload);
				navigate(`/routes/${created.id}`);
			}
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to save route");
		} finally {
			setSaving(false);
		}
	};

	return (
		<MapPageLayout
			title={isEditing ? "Edit Route" : "New Route"}
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
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={saving}
						style={{
							padding: "0.5rem 1rem",
							border: "none",
							borderRadius: "6px",
							background: "#3b82f6",
							color: "white",
							cursor: saving ? "not-allowed" : "pointer",
						}}
					>
						{saving ? "Saving..." : "Save Route"}
					</button>
				</>
			}
			map={<MapContainer id="route-editor-map" />}
			peek={
				<>
					{metersToMiles(distance)} mi
					<span
						style={{
							marginLeft: "0.5rem",
							fontWeight: 400,
							color: "#6b7280",
							fontSize: "0.875rem",
						}}
					>
						{waypoints.length === 0
							? "Tap the map to add waypoints"
							: `${waypoints.length} waypoint${waypoints.length === 1 ? "" : "s"}`}
					</span>
				</>
			}
		>
			<div>
				<label htmlFor="route-name" style={labelStyle}>
					Route Name
				</label>
				<input
					id="route-name"
					className="map-page-field"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Morning Run"
					style={fieldStyle}
				/>
			</div>

			<div>
				<label htmlFor="route-desc" style={labelStyle}>
					Description
				</label>
				<textarea
					id="route-desc"
					className="map-page-field"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Optional description..."
					rows={2}
					style={{ ...fieldStyle, resize: "vertical" }}
				/>
			</div>

			<div>
				<label htmlFor="activity-type" style={labelStyle}>
					Activity Type
				</label>
				<select
					id="activity-type"
					className="map-page-field"
					value={activityType}
					onChange={(e) =>
						setActivityType(e.target.value as "running" | "cycling")
					}
					style={fieldStyle}
				>
					<option value="running">Running</option>
					<option value="cycling">Cycling</option>
				</select>
			</div>

			<StatsPanel
				distanceMeters={distance}
				elevationGainM={elevation?.gainM}
				elevationLossM={elevation?.lossM}
				elevationLoading={elevationLoading}
			/>

			<WaypointList
				waypoints={waypoints}
				onReorder={setWaypoints}
				onRemove={removeWaypoint}
			/>

			{elevation && elevation.elevations.length > 1 ? (
				<ElevationProfile elevations={elevation.elevations} />
			) : geometry && !elevationLoading ? (
				<div style={{ fontSize: "0.875rem", color: "#999" }}>
					Elevation data unavailable
				</div>
			) : null}
		</MapPageLayout>
	);
}
