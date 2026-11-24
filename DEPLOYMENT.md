# Deployment

How to self-host the route planner on any Linux box, VPS, or home server with Docker.

## What runs

| Service | What it does | Port (host → container) |
|---|---|---|
| `app` | Bun server: API + React frontend, SQLite database | `8711 → 3000` |
| `osrm-foot` | OSRM routing engine, walking/running profile | `5001 → 5000` |
| `osrm-bike` | OSRM routing engine, cycling profile | `5002 → 5000` |

Elevation comes from the public [Open-Meteo](https://open-meteo.com/) API, so it needs no setup but the server needs outbound internet access. Map tiles are loaded by the browser from a public tile provider.

## Requirements

- Docker with the Compose plugin
- About 2 GB of free RAM for the default Bay Area extract (OSRM memory-maps the routing graph; bigger regions need more)
- Several GB of disk space for the downloaded OpenStreetMap file and the processed routing data
- Internet access for downloading OSM data and calling Open-Meteo

## 1. Prepare the OpenStreetMap routing data

Routing runs on your own OSRM instances, built from [OpenStreetMap](https://www.openstreetmap.org/) data downloaded from [Geofabrik](https://download.geofabrik.de/). The included script does it all:

```bash
./scripts/setup-osrm.sh
```

It will:

1. Download a regional `.osm.pbf` file from Geofabrik (California by default, about 1 GB)
2. Clip it to a bounding box with `osmium` so OSRM only loads the area you actually route in (by default, the SF Bay Area)
3. Run `osrm-extract`, `osrm-partition`, and `osrm-customize` twice, once with the foot profile and once with the bicycle profile
4. Write the results to `./osrm-data/foot/` and `./osrm-data/bike/`

All of this runs inside Docker containers, so you don't need to install OSRM or osmium on the host. The script skips steps whose output already exists, so it's safe to run again.

### Using a different region

Edit these variables at the top of `scripts/setup-osrm.sh`:

- `GEOFABRIK_URL`: the regional extract to download. Pick the smallest one that covers your area from [download.geofabrik.de](https://download.geofabrik.de/).
- `BAY_AREA_BBOX`: the clip box as `west,south,east,north` in decimal degrees. [bboxfinder.com](http://bboxfinder.com/) is handy for drawing one. Keep it tight: the smaller the box, the less memory OSRM needs.

The output files are named `bay-area.osrm*` whatever region you pick. If you rename them, update the `command:` lines for `osrm-foot` and `osrm-bike` in `docker-compose.yml` to match.

To rebuild after changing the region, delete `./osrm-data` and run the script again.

### Refreshing map data

OpenStreetMap changes constantly. To pick up new trails and roads, delete `./osrm-data`, run the script again, then restart the OSRM containers with `docker compose restart osrm-foot osrm-bike`.

## 2. Start everything

```bash
docker compose up -d --build
```

On startup the app container runs `prisma migrate deploy` to create or upgrade the SQLite schema, then starts the server. Open `http://<your-host>:8711`.

Check that routing works:

```bash
# Should return JSON with "code":"Ok"
curl "http://localhost:5001/route/v1/foot/-122.4194,37.7749;-122.4089,37.7837"
```

## Configuration

Set these environment variables on the `app` service in `docker-compose.yml`:

| Variable | Default in compose | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:/app/data/runclub.db` | SQLite file path. Keep it under `/app/data` so it lands on the persistent volume. |
| `OSRM_FOOT_URL` | `http://osrm-foot:5000` | Foot-profile OSRM endpoint |
| `OSRM_BIKE_URL` | `http://osrm-bike:5000` | Bike-profile OSRM endpoint |

To change the public port, edit the `app` service's `ports:` mapping (for example `"80:3000"`). If you only reach OSRM through the app, you can remove the `5001`/`5002` port mappings.

## Data and backups

Routes are stored in SQLite on the `db-data` Docker volume. To back it up:

```bash
docker compose cp app:/app/data/runclub.db ./runclub-backup.db
```

To restore, copy the file back the same way and restart the `app` service.

## Updating

```bash
git pull
docker compose up -d --build
```

Migrations run automatically on container start.

## HTTPS and a domain

The app speaks plain HTTP. To serve it publicly, put a reverse proxy in front of port 8711. Here's a minimal [Caddy](https://caddyserver.com/) config, which also handles TLS certificates automatically:

```
routes.example.com {
	reverse_proxy localhost:8711
}
```

nginx, Traefik, a Cloudflare Tunnel, or a PaaS like Coolify, Dokku, or CapRover work too. Point any of them at `docker-compose.yml`. The app has no built-in authentication, so if you expose it publicly, add auth at the proxy or keep it on a private network (for example Tailscale or a VPN).

## Running without Docker

```bash
bun install
bunx prisma migrate deploy
OSRM_FOOT_URL=http://localhost:5001 OSRM_BIKE_URL=http://localhost:5002 bun run src/server.ts
```

You still need two OSRM servers. The easiest way is `docker compose up -d osrm-foot osrm-bike` after running the setup script. The server listens on port 3000.
