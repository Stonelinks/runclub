import { Hono } from "hono";

const OSRM_FOOT_URL = process.env.OSRM_FOOT_URL ?? "http://localhost:5001";
const OSRM_BIKE_URL = process.env.OSRM_BIKE_URL ?? "http://localhost:5002";

const osrm = new Hono();

osrm.all("/foot/*", async (c) => {
	const path = c.req.path.replace(/^.*\/api\/osrm\/foot/, "");
	const params = new URLSearchParams(c.req.query()).toString();
	const url = `${OSRM_FOOT_URL}/route/v1/foot${path}${params ? `?${params}` : ""}`;

	const response = await fetch(url);
	const data = await response.text();
	return c.body(data, response.status as 200, {
		"Content-Type": response.headers.get("Content-Type") ?? "application/json",
	});
});

osrm.all("/bike/*", async (c) => {
	const path = c.req.path.replace(/^.*\/api\/osrm\/bike/, "");
	const params = new URLSearchParams(c.req.query()).toString();
	const url = `${OSRM_BIKE_URL}/route/v1/bicycle${path}${params ? `?${params}` : ""}`;

	const response = await fetch(url);
	const data = await response.text();
	return c.body(data, response.status as 200, {
		"Content-Type": response.headers.get("Content-Type") ?? "application/json",
	});
});

export default osrm;
