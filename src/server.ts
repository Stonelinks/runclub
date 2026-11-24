import api from "./api/index.ts";
import homepage from "./client/index.html";

const server = Bun.serve({
	port: 3000,
	routes: {
		"/api/*": (req: Request) => api.fetch(req),
		"/*": homepage,
	},
	fetch(req) {
		return api.fetch(req);
	},
});

console.log(`Server running at http://localhost:${server.port}`);
