import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = join(__dirname, '../../..');

let didLoad = false;

function loadRootEnv(): void {
	if (didLoad) return;
	dotenv.config({ path: join(monorepoRoot, '.env') });
	didLoad = true;
}

loadRootEnv();
