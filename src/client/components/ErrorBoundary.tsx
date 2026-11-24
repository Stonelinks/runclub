import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	override componentDidCatch(error: Error) {
		console.error("ErrorBoundary caught:", error);
	}

	override render() {
		if (this.state.hasError) {
			return (
				this.props.fallback ?? (
					<div
						style={{
							padding: "2rem",
							textAlign: "center",
							color: "#666",
						}}
					>
						<p>Failed to load map component.</p>
						<p style={{ fontSize: "0.875rem" }}>
							WebGL may not be available in this browser.
						</p>
					</div>
				)
			);
		}
		return this.props.children;
	}
}
