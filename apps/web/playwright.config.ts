import { defineConfig, devices } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	use: {
		...devices['Desktop Chrome'],
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173',
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'npm run dev',
		cwd: monorepoRoot,
		url: 'http://127.0.0.1:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 180_000
	}
});
