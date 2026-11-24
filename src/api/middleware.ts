import type { Context, Next } from "hono";

export async function errorHandler(c: Context, next: Next) {
	try {
		await next();
	} catch (err) {
		console.error("API Error:", err);
		const message =
			err instanceof Error ? err.message : "Internal server error";
		return c.json({ error: message }, 500);
	}
}

export async function logger(c: Context, next: Next) {
	const start = Date.now();
	await next();
	const ms = Date.now() - start;
	console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
}
