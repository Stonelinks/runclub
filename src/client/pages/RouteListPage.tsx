import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RouteCard } from "../components/RouteCard.tsx";
import { useRoutes } from "../hooks/useRoutes.ts";

export function RouteListPage() {
	const navigate = useNavigate();
	const { routes, loading, error, fetchRoutes, deleteRoute } = useRoutes();
	const [deleting, setDeleting] = useState<string | null>(null);

	useEffect(() => {
		fetchRoutes();
	}, [fetchRoutes]);

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this route?")) return;
		setDeleting(id);
		try {
			await deleteRoute(id);
			await fetchRoutes();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to delete route");
		} finally {
			setDeleting(null);
		}
	};

	return (
		<div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "1.5rem",
				}}
			>
				<h1 style={{ margin: 0 }}>My Routes</h1>
				<button
					type="button"
					className="route-list-new"
					onClick={() => navigate("/routes/new")}
					style={{
						padding: "0.5rem 1.25rem",
						border: "none",
						borderRadius: "6px",
						background: "#3b82f6",
						color: "white",
						cursor: "pointer",
						fontSize: "0.875rem",
						fontWeight: 600,
					}}
				>
					+ New Route
				</button>
			</div>

			{loading && <p style={{ color: "#666" }}>Loading routes...</p>}
			{error && <p style={{ color: "#dc2626" }}>Error: {error}</p>}

			{!loading && routes.length === 0 && (
				<div
					style={{
						textAlign: "center",
						padding: "3rem",
						color: "#999",
						border: "2px dashed #e5e7eb",
						borderRadius: "8px",
					}}
				>
					<p style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
						No routes yet
					</p>
					<p style={{ fontSize: "0.875rem" }}>
						Tap "New Route" to plan your first route
					</p>
				</div>
			)}

			<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
				{routes.map((route) => (
					<div
						key={route.id}
						style={{ opacity: deleting === route.id ? 0.5 : 1 }}
					>
						<RouteCard
							{...route}
							onClick={(id) => navigate(`/routes/${id}`)}
							onEdit={(id) => navigate(`/routes/${id}/edit`)}
							onDelete={handleDelete}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
