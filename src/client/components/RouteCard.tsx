interface RouteCardProps {
	id: string;
	name: string;
	activityType: string;
	distanceMeters: number;
	elevationGainM: number;
	createdAt: string;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
	onClick: (id: string) => void;
}

export function RouteCard({
	id,
	name,
	activityType,
	distanceMeters,
	elevationGainM,
	createdAt,
	onEdit,
	onDelete,
	onClick,
}: RouteCardProps) {
	const distMi = (distanceMeters / 1609.344).toFixed(1);
	const gainFt = Math.round(elevationGainM * 3.28084);

	return (
		<div
			role="button"
			tabIndex={0}
			className="route-card"
			style={{
				border: "1px solid #e5e7eb",
				borderRadius: "8px",
				padding: "1rem",
				cursor: "pointer",
				transition: "box-shadow 0.15s",
			}}
			onClick={() => onClick(id)}
			onKeyDown={(e) => e.key === "Enter" && onClick(id)}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "start",
					flexWrap: "wrap",
					gap: "0.5rem",
				}}
			>
				<div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
					<h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.125rem" }}>
						{name}
					</h3>
					<span
						style={{
							display: "inline-block",
							padding: "0.125rem 0.5rem",
							borderRadius: "12px",
							fontSize: "0.75rem",
							background: activityType === "running" ? "#dcfce7" : "#dbeafe",
							color: activityType === "running" ? "#166534" : "#1e40af",
						}}
					>
						{activityType}
					</span>
				</div>
				<div
					role="group"
					style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						onClick={() => onEdit(id)}
						style={{
							padding: "0.25rem 0.75rem",
							border: "1px solid #d1d5db",
							borderRadius: "4px",
							background: "white",
							cursor: "pointer",
							fontSize: "0.75rem",
						}}
					>
						Edit
					</button>
					<button
						type="button"
						onClick={() => onDelete(id)}
						style={{
							padding: "0.25rem 0.75rem",
							border: "1px solid #fca5a5",
							borderRadius: "4px",
							background: "#fef2f2",
							color: "#dc2626",
							cursor: "pointer",
							fontSize: "0.75rem",
						}}
					>
						Delete
					</button>
				</div>
			</div>
			<div
				style={{
					display: "flex",
					gap: "1rem",
					marginTop: "0.75rem",
					fontSize: "0.875rem",
					color: "#666",
				}}
			>
				<span>{distMi} mi</span>
				<span>+{gainFt} ft</span>
				<span>{new Date(createdAt).toLocaleDateString()}</span>
			</div>
		</div>
	);
}
