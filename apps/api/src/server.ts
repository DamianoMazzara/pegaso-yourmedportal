import { serve } from '@hono/node-server';
import { createApiApp } from './http/create-app.js';

const { app } = createApiApp();

const port = Number(process.env.API_PORT ?? 3001);
console.log(`API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
