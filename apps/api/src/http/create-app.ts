import { swaggerUI } from '@hono/swagger-ui';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AppContainer, createDefaultAppContainer } from '../composition/app-container.js';
import { createOpenAPIApp } from '../rest/openapi-app.js';

export type CreateAppOptions = {
	uploadDir?: string;
};

export function createApiApp(options?: CreateAppOptions): { app: Hono; container: AppContainer } {
	const container =
		options?.uploadDir != null
			? new AppContainer(options.uploadDir)
			: createDefaultAppContainer();
	const app = new Hono();

	const defaultOrigins = [
		'http://localhost:5173',
		'http://127.0.0.1:5173',
		'http://localhost:8080',
		'http://127.0.0.1:8080'
	];
	const fromEnv =
		process.env.CORS_ORIGINS?.split(',')
			.map((o) => o.trim())
			.filter(Boolean) ?? [];
	const allowOrigin = [...new Set([...defaultOrigins, ...fromEnv])];

	app.use(
		'*',
		cors({
			origin: allowOrigin,
			allowHeaders: ['Content-Type', 'Authorization'],
			allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
			credentials: true
		})
	);

	app.get('/swagger', swaggerUI({ url: '/openapi.json' }));

	const openApiApp = createOpenAPIApp(container);
	app.route('/', openApiApp);

	return { app, container };
}
