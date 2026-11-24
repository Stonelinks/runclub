#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/osrm-data"
GEOFABRIK_URL="https://download.geofabrik.de/north-america/us/california-latest.osm.pbf"
OSRM_IMAGE="osrm/osrm-backend:latest"
PBF_FILE="$DATA_DIR/california-latest.osm.pbf"
BAY_AREA_PBF="$DATA_DIR/bay-area.osm.pbf"
# 9-county SF Bay Area bbox (W,S,E,N): SF, Marin, southern Sonoma, Napa,
# Solano, Contra Costa, Alameda, San Mateo, Santa Clara, Santa Cruz.
BAY_AREA_BBOX="-123.55,36.50,-121.21,38.85"

echo "==> Creating data directories..."
mkdir -p "$DATA_DIR/foot" "$DATA_DIR/bike"

# Download California OSM data if not already present
if [ ! -f "$PBF_FILE" ]; then
	echo "==> Downloading California OSM data (~1GB)..."
	curl -L -o "$PBF_FILE" "$GEOFABRIK_URL"
else
	echo "==> California OSM data already downloaded, skipping."
fi

# Clip to Bay Area bbox so OSRM only mmaps the region we actually serve.
# Routing the full state needs ~3GB RAM per profile; clipping drops that ~5x.
if [ ! -f "$BAY_AREA_PBF" ]; then
	echo "==> Extracting Bay Area subset (osmium)..."
	docker run --rm -v "$DATA_DIR:/data" debian:bookworm-slim bash -c "
		apt-get update -qq && apt-get install -y -qq osmium-tool >/dev/null && \
		osmium extract --bbox=$BAY_AREA_BBOX /data/california-latest.osm.pbf -o /data/bay-area.osm.pbf --overwrite
	"
else
	echo "==> Bay Area extract already present, skipping."
fi

# Process foot profile
if [ ! -f "$DATA_DIR/foot/bay-area.osrm" ]; then
	echo "==> Processing foot profile..."
	cp "$BAY_AREA_PBF" "$DATA_DIR/foot/bay-area.osm.pbf"
	docker run --rm -v "$DATA_DIR/foot:/data" "$OSRM_IMAGE" \
		osrm-extract -p /opt/foot.lua /data/bay-area.osm.pbf
	docker run --rm -v "$DATA_DIR/foot:/data" "$OSRM_IMAGE" \
		osrm-partition /data/bay-area.osrm
	docker run --rm -v "$DATA_DIR/foot:/data" "$OSRM_IMAGE" \
		osrm-customize /data/bay-area.osrm
else
	echo "==> Foot profile already processed, skipping."
fi

# Process bicycle profile
if [ ! -f "$DATA_DIR/bike/bay-area.osrm" ]; then
	echo "==> Processing bicycle profile..."
	cp "$BAY_AREA_PBF" "$DATA_DIR/bike/bay-area.osm.pbf"
	docker run --rm -v "$DATA_DIR/bike:/data" "$OSRM_IMAGE" \
		osrm-extract -p /opt/bicycle.lua /data/bay-area.osm.pbf
	docker run --rm -v "$DATA_DIR/bike:/data" "$OSRM_IMAGE" \
		osrm-partition /data/bay-area.osrm
	docker run --rm -v "$DATA_DIR/bike:/data" "$OSRM_IMAGE" \
		osrm-customize /data/bay-area.osrm
else
	echo "==> Bicycle profile already processed, skipping."
fi

echo "==> Done! OSRM data is ready in $DATA_DIR"
echo "    Start services with: docker compose up osrm-foot osrm-bike -d"
