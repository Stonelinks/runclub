interface MapContainerProps {
	id: string;
	style?: React.CSSProperties;
}

export function MapContainer({ id, style }: MapContainerProps) {
	return (
		<div
			id={id}
			style={{
				width: "100%",
				height: "100%",
				...style,
			}}
		/>
	);
}
