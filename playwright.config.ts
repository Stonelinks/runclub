import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 30000,
	retries: 1,
	use: {
		baseURL: "http://localhost:3000",
		headless: true,
	},
	projects: [
		{
			name: "chromium",
			testIgnore: /mobile\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				launchOptions: {
					args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"],
				},
			},
		},
		{
			// Phone-sized viewport with touch; only runs the mobile spec
			name: "mobile-chromium",
			testMatch: /mobile\.spec\.ts/,
			use: {
				...devices["Pixel 7"],
				launchOptions: {
					args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"],
				},
			},
		},
	],
	webServer: {
		command: "bun run src/server.ts",
		port: 3000,
		reuseExistingServer: !process.env.CI,
		timeout: 10000,
	},
});
