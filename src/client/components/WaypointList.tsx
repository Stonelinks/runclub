import { useState } from "react";

interface WaypointListProps {
	waypoints: [number, number][];
	onReorder: (waypoints: [number, number][]) => void;
	onRemove: (index: number) => void;
}

const iconButtonStyle: React.CSSProperties = {
	background: "none",
	border: "none",
	cursor: "pointer",
	color: "#999",
	minWidth: "40px",
	minHeight: "40px",
	padding: 0,
	alignItems: "center",
	justifyContent: "center",
	lineHeight: 1,
	flexShrink: 0,
};

export function WaypointList({
	waypoints,
	onReorder,
	onRemove,
}: WaypointListProps) {
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	if (waypoints.length === 0) {
		return (
			<div style={{ padding: "1rem", color: "#999", fontSize: "0.875rem" }}>
				Tap or click the map to add waypoints
			</div>
		);
	}

	const move = (from: number, to: number) => {
		if (to < 0 || to >= waypoints.length || from === to) return;
		const result = [...waypoints];
		const moved = result.splice(from, 1)[0];
		if (!moved) return;
		result.splice(to, 0, moved);
		onReorder(result);
	};

	// Stable per-coordinate keys; a duplicate coordinate gets a suffix so keys
	// stay unique without depending on the array index.
	const seen = new Map<string, number>();
	const keys = waypoints.map((wp) => {
		const base = `${wp[0]?.toFixed(6)},${wp[1]?.toFixed(6)}`;
		const n = seen.get(base) ?? 0;
		seen.set(base, n + 1);
		return n === 0 ? base : `${base}#${n}`;
	});

	const handleDragStart = (index: number) => (e: React.DragEvent) => {
		setDragIndex(index);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", String(index));
	};

	const handleDragOver = (index: number) => (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDragOverIndex(index);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		if (dragIndex !== null && dragOverIndex !== null) {
			move(dragIndex, dragOverIndex);
		}
		setDragIndex(null);
		setDragOverIndex(null);
	};

	const handleDragEnd = () => {
		setDragIndex(null);
		setDragOverIndex(null);
	};

	return (
		<div style={{ padding: "0.5rem 0" }}>
			<h3
				style={{
					margin: "0 0 0.5rem 0.5rem",
					fontSize: "0.875rem",
					textTransform: "uppercase",
					color: "#666",
				}}
			>
				Waypoints ({waypoints.length})
			</h3>
			<div className="waypoint-list-items" role="list">
				{waypoints.map((wp, i) => (
					<div
						key={keys[i]}
						role="listitem"
						data-testid="waypoint-row"
						draggable
						onDragStart={handleDragStart(i)}
						onDragOver={handleDragOver(i)}
						onDrop={handleDrop}
						onDragEnd={handleDragEnd}
						style={{
							padding: "0.125rem 0 0.125rem 0.5rem",
							fontSize: "0.75rem",
							borderBottom: "1px solid #eee",
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							opacity: dragIndex === i ? 0.4 : 1,
							borderLeft:
								dragOverIndex === i && dragIndex !== i
									? "3px solid #3b82f6"
									: "3px solid transparent",
							transition: "border-left-color 0.1s, opacity 0.1s",
						}}
					>
						<span
							className="waypoint-grip"
							style={{
								cursor: "grab",
								color: "#ccc",
								fontSize: "0.75rem",
								userSelect: "none",
								lineHeight: 1,
							}}
						>
							⋮⋮
						</span>
						<span
							style={{
								width: "20px",
								height: "20px",
								borderRadius: "50%",
								background: "#3b82f6",
								color: "white",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "0.625rem",
								flexShrink: 0,
							}}
						>
							{i + 1}
						</span>
						<span
							data-testid="waypoint-coords"
							style={{ color: "#444", minWidth: 0 }}
						>
							{wp[1]?.toFixed(5)}, {wp[0]?.toFixed(5)}
						</span>
						<span style={{ marginLeft: "auto", display: "flex" }}>
							<button
								type="button"
								className="waypoint-icon-btn waypoint-move"
								onClick={() => move(i, i - 1)}
								disabled={i === 0}
								style={{
									...iconButtonStyle,
									fontSize: "0.875rem",
									opacity: i === 0 ? 0.3 : 1,
								}}
								title="Move up"
								aria-label={`Move waypoint ${i + 1} up`}
							>
								▲
							</button>
							<button
								type="button"
								className="waypoint-icon-btn waypoint-move"
								onClick={() => move(i, i + 1)}
								disabled={i === waypoints.length - 1}
								style={{
									...iconButtonStyle,
									fontSize: "0.875rem",
									opacity: i === waypoints.length - 1 ? 0.3 : 1,
								}}
								title="Move down"
								aria-label={`Move waypoint ${i + 1} down`}
							>
								▼
							</button>
							<button
								type="button"
								className="waypoint-icon-btn"
								onClick={() => onRemove(i)}
								style={{ ...iconButtonStyle, fontSize: "1.125rem" }}
								title="Remove waypoint"
								aria-label={`Remove waypoint ${i + 1}`}
							>
								&times;
							</button>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
