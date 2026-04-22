import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
	envDir: monorepoRoot,
	plugins: [tailwindcss(), sveltekit()]
});
