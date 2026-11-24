interface ElevationProfileProps {
	elevations: number[];
}

export function ElevationProfile({ elevations }: ElevationProfileProps) {
	if (elevations.length < 2) return null;

	const width = 600;
	const height = 150;
	const padding = { top: 10, right: 10, bottom: 25, left: 40 };

	const innerW = width - padding.left - padding.right;
	const innerH = height - padding.top - padding.bottom;

	const min = Math.min(...elevations);
	const max = Math.max(...elevations);
	const range = max - min || 1;

	const points = elevations.map((elev, i) => {
		const x = padding.left + (i / (elevations.length - 1)) * innerW;
		const y = padding.top + innerH - ((elev - min) / range) * innerH;
		return `${x},${y}`;
	});

	const areaPoints = [
		`${padding.left},${padding.top + innerH}`,
		...points,
		`${padding.left + innerW},${padding.top + innerH}`,
	].join(" ");

	return (
		<div style={{ width: "100%" }}>
			<h3
				style={{
					margin: "0 0 0.5rem 0",
					fontSize: "0.875rem",
					textTransform: "uppercase",
					color: "#666",
				}}
			>
				Elevation Profile
			</h3>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				style={{ width: "100%", height: "auto" }}
				role="img"
				aria-label="Elevation profile chart"
			>
				<polygon points={areaPoints} fill="rgba(59, 130, 246, 0.15)" />
				<polyline
					points={points.join(" ")}
					fill="none"
					stroke="#3b82f6"
					strokeWidth="2"
				/>
				{/* Y-axis labels */}
				<text
					x={padding.left - 5}
					y={padding.top + 4}
					textAnchor="end"
					fontSize="14"
					fill="#666"
				>
					{Math.round(max)}m
				</text>
				<text
					x={padding.left - 5}
					y={padding.top + innerH + 4}
					textAnchor="end"
					fontSize="14"
					fill="#666"
				>
					{Math.round(min)}m
				</text>
			</svg>
		</div>
	);
}
