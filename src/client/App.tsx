import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { RouteDetailPage } from "./pages/RouteDetailPage.tsx";
import { RouteEditorPage } from "./pages/RouteEditorPage.tsx";
import { RouteListPage } from "./pages/RouteListPage.tsx";

export function App() {
	return (
		<BrowserRouter>
			<ErrorBoundary
				fallback={
					<div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
						<p>Something went wrong.</p>
						<p style={{ fontSize: "0.875rem" }}>
							<a href="/routes">Back to routes</a>
						</p>
					</div>
				}
			>
				<Routes>
					<Route path="/" element={<Navigate to="/routes" replace />} />
					<Route path="/routes" element={<RouteListPage />} />
					<Route
						path="/routes/new"
						element={
							<ErrorBoundary>
								<RouteEditorPage />
							</ErrorBoundary>
						}
					/>
					<Route
						path="/routes/:id"
						element={
							<ErrorBoundary>
								<RouteDetailPage />
							</ErrorBoundary>
						}
					/>
					<Route
						path="/routes/:id/edit"
						element={
							<ErrorBoundary>
								<RouteEditorPage />
							</ErrorBoundary>
						}
					/>
				</Routes>
			</ErrorBoundary>
		</BrowserRouter>
	);
}
