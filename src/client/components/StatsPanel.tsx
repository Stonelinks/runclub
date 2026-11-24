interface StatsPanelProps {
	distanceMeters: number;
	elevationGainM?: number;
	elevationLossM?: number;
	elevationLoading?: boolean;
}

export function metersToMiles(m: number) {
	return (m / 1609.344).toFixed(2);
}

function metersToKm(m: number) {
	return (m / 1000).toFixed(2);
}

function metersToFeet(m: number) {
	return Math.round(m * 3.28084);
}

export function StatsPanel({
	distanceMeters,
	elevationGainM,
	elevationLossM,
	elevationLoading,
}: StatsPanelProps) {
	return (
		<div
			className="stats-panel"
			style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px" }}
		>
			<h3
				style={{
					margin: "0 0 0.75rem 0",
					fontSize: "0.875rem",
					textTransform: "uppercase",
					color: "#666",
				}}
			>
				Route Stats
			</h3>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "0.75rem",
				}}
			>
				<div>
					<div
						data-testid="distance-miles"
						style={{ fontSize: "1.25rem", fontWeight: 600 }}
					>
						{metersToMiles(distanceMeters)} mi
					</div>
					<div
						data-testid="distance-km"
						style={{ fontSize: "0.75rem", color: "#666" }}
					>
						{metersToKm(distanceMeters)} km
					</div>
				</div>
				<div>
					{elevationLoading ? (
						<div
							data-testid="elevation-loading"
							style={{ fontSize: "0.875rem", color: "#999" }}
						>
							Loading...
						</div>
					) : (
						<>
							<div
								data-testid="elevation-gain"
								style={{
									fontSize: "1.25rem",
									fontWeight: 600,
									color: "#22c55e",
								}}
							>
								+{metersToFeet(elevationGainM ?? 0)} ft
							</div>
							<div
								data-testid="elevation-loss"
								style={{ fontSize: "0.875rem", color: "#ef4444" }}
							>
								-{metersToFeet(elevationLossM ?? 0)} ft
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
