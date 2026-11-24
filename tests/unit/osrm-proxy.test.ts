import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

describe("OSRM proxy routes", () => {
	const originalFetch = globalThis.fetch;
	let capturedUrls: string[];

	beforeEach(() => {
		capturedUrls = [];
		globalThis.fetch = mock(async (input: string | URL | Request) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: input.url;
			capturedUrls.push(url);
			return new Response(
				JSON.stringify({ code: "Ok", routes: [], waypoints: [] }),
				{ headers: { "Content-Type": "application/json" } },
			);
		}) as unknown as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("proxies foot requests to OSRM foot backend", async () => {
		const { default: api } = await import("../../src/api/index.ts");
		const req = new Request(
			"http://localhost/api/osrm/foot/-122.419,37.775;-122.409,37.785?overview=full&geometries=geojson",
		);
		const res = await api.fetch(req);
		expect(res.status).toBe(200);
		expect(capturedUrls.length).toBe(1);
		expect(capturedUrls[0]).toContain("/route/v1/foot/");
		expect(capturedUrls[0]).toContain("-122.419,37.775;-122.409,37.785");
		expect(capturedUrls[0]).toContain("overview=full");
	});

	it("proxies bike requests to OSRM bicycle backend", async () => {
		const { default: api } = await import("../../src/api/index.ts");
		const req = new Request(
			"http://localhost/api/osrm/bike/-122.419,37.775;-122.409,37.785?geometries=geojson",
		);
		const res = await api.fetch(req);
		expect(res.status).toBe(200);
		expect(capturedUrls.length).toBe(1);
		expect(capturedUrls[0]).toContain("/route/v1/bicycle/");
		expect(capturedUrls[0]).toContain("-122.419,37.775;-122.409,37.785");
	});
});
