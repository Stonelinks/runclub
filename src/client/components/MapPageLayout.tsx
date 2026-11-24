import { type ReactNode, useState } from "react";

interface MapPageLayoutProps {
	title: string;
	subtitle?: string | null;
	actions: ReactNode;
	map: ReactNode;
	/** Compact summary shown in the collapsed bottom sheet on mobile. */
	peek?: ReactNode;
	children: ReactNode;
}

/**
 * Shared shell for the editor and detail pages: header on top, map filling
 * the remaining space, and a side panel. On desktop the panel is a 320px
 * right column; on phones (<768px) it becomes a collapsible bottom sheet.
 */
export function MapPageLayout({
	title,
	subtitle,
	actions,
	map,
	peek,
	children,
}: MapPageLayoutProps) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="map-page">
			<header className="map-page-header">
				<div className="map-page-title">
					<h1>{title}</h1>
					{subtitle && <p className="map-page-subtitle">{subtitle}</p>}
				</div>
				<div className="map-page-actions">{actions}</div>
			</header>

			<div className="map-page-body">
				<div className="map-page-map">{map}</div>

				<aside
					className={`map-page-panel${expanded ? " is-expanded" : ""}`}
					data-testid="map-page-panel"
				>
					<button
						type="button"
						className="map-page-panel-handle"
						onClick={() => setExpanded((v) => !v)}
						aria-expanded={expanded}
						aria-controls="map-page-panel-content"
						aria-label={expanded ? "Collapse details" : "Expand details"}
					>
						<span className="map-page-panel-grip" aria-hidden="true" />
						<span className="map-page-panel-peek">{peek}</span>
						<span className="map-page-panel-chevron" aria-hidden="true">
							{expanded ? "▼" : "▲"}
						</span>
					</button>
					<div id="map-page-panel-content" className="map-page-panel-content">
						{children}
					</div>
				</aside>
			</div>
		</div>
	);
}
