// @ts-nocheck
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AdminPayload } from '../application/support/auth-service.js';
import type { AppContainer } from '../composition/app-container.js';
import { isHttpError } from './http-error.js';
import { fiscalCodeZ } from './schemas.js';

const ApiErrorSchema = z.object({ error: z.string() }).openapi('ApiError');

type AppEnv = { Variables: { admin: AdminPayload } };

export function createOpenAPIApp(container: AppContainer) {
	const app = new OpenAPIHono<AppEnv>();

	app.use('/api/admin/*', async (c, next) => {
		const path = new URL(c.req.url).pathname;
		if (path === '/api/admin/login' && c.req.method === 'POST') {
			return next();
		}
		const auth = c.req.header('authorization');
		const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
		const admin = await container.auth.verifyAdminToken(token);
		if (!admin) {
			return c.json({ error: 'Unauthorized' }, 401);
		}
		c.set('admin', admin);
		return next();
	});

	const healthRoute = createRoute({
		method: 'get',
		path: '/health',
		tags: ['System'],
		responses: {
			200: {
				description: 'API operativa',
				content: {
					'application/json': {
						schema: z.object({ ok: z.literal(true) })
					}
				}
			}
		}
	});
	app.openapi(healthRoute, (c) => c.json({ ok: true as const }, 200));

	const macroAreasRoute = createRoute({
		method: 'get',
		path: '/api/public/macro-areas',
		tags: ['Public'],
		responses: {
			200: {
				description: 'Lista macroaree',
				content: {
					'application/json': {
						schema: z.array(
							z.object({ id: z.number().int(), name: z.string() }).openapi('MacroAreaRef')
						)
					}
				}
			}
		}
	});
	app.openapi(macroAreasRoute, async (c) => {
		try {
			return c.json(await container.publicCatalog.macroAreasList(), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const visitTypesRoute = createRoute({
		method: 'get',
		path: '/api/public/visit-types',
		tags: ['Public'],
		responses: {
			200: {
				description: 'Tipologie visita',
				content: { 'application/json': { schema: z.array(z.record(z.unknown())) } }
			}
		}
	});
	app.openapi(visitTypesRoute, async (c) => {
		try {
			return c.json(await container.publicCatalog.visitTypesList(), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const availableSlotsRoute = createRoute({
		method: 'get',
		path: '/api/public/available-slots',
		tags: ['Public'],
		request: {
			query: z.object({
				visitTypeId: z.coerce.number().int().positive().openapi({
					param: { name: 'visitTypeId', in: 'query', required: true },
					example: 1
				}),
				date: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.openapi({ param: { name: 'date', in: 'query', required: true }, example: '2025-06-01' })
			})
		},
		responses: {
			200: {
				description: 'Slot liberi',
				content: {
					'application/json': {
						schema: z.object({ slots: z.array(z.string()) })
					}
				}
			},
			404: { description: 'Non trovato', content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(availableSlotsRoute, async (c) => {
		const q = c.req.valid('query');
		try {
			return c.json(await container.publicScheduling.availableSlots(q), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const weekAvailabilityRoute = createRoute({
		method: 'get',
		path: '/api/public/week-availability',
		tags: ['Public'],
		request: {
			query: z.object({
				visitTypeId: z.coerce.number().int().positive().openapi({
					param: { name: 'visitTypeId', in: 'query', required: true }
				}),
				weekStart: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.openapi({ param: { name: 'weekStart', in: 'query', required: true } })
			})
		},
		responses: {
			200: {
				description: 'Griglia settimanale',
				content: { 'application/json': { schema: z.record(z.unknown()) } }
			},
			404: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(weekAvailabilityRoute, async (c) => {
		const q = c.req.valid('query');
		try {
			return c.json(await container.publicScheduling.weekAvailability(q), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const createBookingRoute = createRoute({
		method: 'post',
		path: '/api/public/bookings',
		tags: ['Public'],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							visitTypeId: z.number().int().positive(),
							slotStartIso: z.string(),
							firstName: z.string().min(1).max(128),
							lastName: z.string().min(1).max(128),
							fiscalCode: fiscalCodeZ,
							age: z.number().int().min(0).max(130),
							address: z.string().min(1).max(512),
							phone: z.string().min(1).max(64),
							email: z.string().email().optional().or(z.literal(''))
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: {
				content: { 'application/json': { schema: z.object({ code: z.string() }) } },
				description: 'Codice prenotazione'
			},
			400: { content: { 'application/json': { schema: ApiErrorSchema } } },
			404: { content: { 'application/json': { schema: ApiErrorSchema } } },
			409: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(createBookingRoute, async (c) => {
		const body = c.req.valid('json');
		try {
			return c.json(await container.publicBooking.createBooking(body), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const cancelBookingRoute = createRoute({
		method: 'post',
		path: '/api/public/bookings/cancel',
		tags: ['Public'],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							fiscalCode: fiscalCodeZ,
							code: z.string().min(1)
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } },
			404: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(cancelBookingRoute, async (c) => {
		const body = c.req.valid('json');
		try {
			return c.json(await container.publicBooking.cancelBooking(body), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const getReportRoute = createRoute({
		method: 'get',
		path: '/api/public/reports',
		tags: ['Public'],
		request: {
			query: z.object({
				fiscalCode: z.string().min(1).openapi({ param: { name: 'fiscalCode', in: 'query', required: true } }),
				code: z.string().min(1).openapi({ param: { name: 'code', in: 'query', required: true } })
			})
		},
		responses: {
			200: {
				description: 'Dettaglio referto',
				content: { 'application/json': { schema: z.record(z.unknown()) } }
			},
			400: {
				description: 'Validazione',
				content: { 'application/json': { schema: ApiErrorSchema } }
			},
			404: {
				description: 'Non trovato',
				content: { 'application/json': { schema: ApiErrorSchema } }
			}
		}
	});
	app.openapi(getReportRoute, async (c) => {
		const q = c.req.valid('query');
		let fiscalCode: string;
		try {
			fiscalCode = fiscalCodeZ.parse(q.fiscalCode);
		} catch {
			return c.json({ error: 'Codice fiscale non valido' }, 400);
		}
		try {
			return c.json(await container.publicReport.getReport({ fiscalCode, code: q.code }), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const attachmentBinarySchema = z.any().openapi({
		type: 'string',
		format: 'binary',
		description: 'Contenuto del file allegato'
	});

	const publicAttachmentRoute = createRoute({
		method: 'get',
		path: '/public/attachments/{id}',
		tags: ['Public'],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } })
			}),
			query: z.object({
				fiscalCode: z.string().min(1).openapi({
					param: { name: 'fiscalCode', in: 'query', required: true },
					description: 'Codice fiscale del paziente (validato come in POST prenotazioni)'
				}),
				reportCode: z.string().min(1).openapi({
					param: { name: 'reportCode', in: 'query', required: true },
					description: 'Codice referto restituito da GET /api/public/reports'
				})
			})
		},
		responses: {
			200: {
				description: 'Stream del file (inline). Content-Type secondo il tipo memorizzato.',
				content: {
					'application/pdf': { schema: attachmentBinarySchema },
					'image/jpeg': { schema: attachmentBinarySchema },
					'image/png': { schema: attachmentBinarySchema }
				}
			},
			400: {
				description: 'Richiesta non valida',
				content: { 'text/plain': { schema: z.string() } }
			},
			404: {
				description: 'Allegato non trovato, referto non pronto o file assente sul server',
				content: { 'text/plain': { schema: z.string() } }
			}
		}
	});
	app.openapi(publicAttachmentRoute, async (c) => {
		const { id } = c.req.valid('param');
		const q = c.req.valid('query');
		let fiscalCode: string;
		try {
			fiscalCode = fiscalCodeZ.parse(q.fiscalCode.trim());
		} catch {
			return c.text('Bad request', 400);
		}
		const reportCode = q.reportCode.trim().toUpperCase();
		const result = await container.adminReportUpload.getPublicAttachment(
			id,
			fiscalCode.toUpperCase(),
			reportCode
		);
		if (result.kind === 'not_found') {
			return c.text('Non trovato', 404);
		}
		if (result.kind === 'missing_file') {
			return c.text('File mancante', 404);
		}
		return new Response(result.body, {
			headers: {
				'Content-Type': result.mimeType,
				'Content-Disposition': `inline; filename="${encodeURIComponent(result.originalName)}"`
			}
		});
	});

	const loginRoute = createRoute({
		method: 'post',
		path: '/api/admin/login',
		tags: ['Admin'],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							email: z.string().email(),
							password: z.string().min(1)
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: {
				content: {
					'application/json': {
						schema: z.object({
							token: z.string(),
							user: z.object({
								id: z.number(),
								email: z.string(),
								name: z.string()
							})
						})
					}
				}
			},
			401: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(loginRoute, async (c) => {
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminAuth.login(body, c.req.raw), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const meRoute = createRoute({
		method: 'get',
		path: '/api/admin/me',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				content: {
					'application/json': {
						schema: z.object({ id: z.number(), email: z.string(), name: z.string() })
					}
				}
			},
			401: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(meRoute, async (c) => {
		try {
			return c.json(await container.adminAuth.me(c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const statsRoute = createRoute({
		method: 'get',
		path: '/api/admin/stats',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				content: {
					'application/json': {
						schema: z.object({
							bookingsTotal: z.number(),
							bookingsTodayConfirmed: z.number(),
							reportsPending: z.number(),
							reportsReady: z.number()
						})
					}
				}
			}
		}
	});
	app.openapi(statsRoute, async (c) => {
		return c.json(await container.adminAuth.stats(), 200);
	});

	const adminMacroList = createRoute({
		method: 'get',
		path: '/api/admin/macro-areas',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		responses: { 200: { content: { 'application/json': { schema: z.array(z.record(z.unknown())) } } } }
	});
	app.openapi(adminMacroList, async (c) => {
		return c.json(await container.adminMacroArea.list(), 200);
	});

	const adminMacroCreate = createRoute({
		method: 'post',
		path: '/api/admin/macro-areas',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							name: z.string().min(1).max(255),
							slotDurationMinutes: z.number().int().min(5).max(240),
							parallelSlots: z.number().int().min(1).max(50)
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: { content: { 'application/json': { schema: z.object({ id: z.number() }) } } }
		}
	});
	app.openapi(adminMacroCreate, async (c) => {
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminMacroArea.create(body, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminMacroPatch = createRoute({
		method: 'patch',
		path: '/api/admin/macro-areas/{id}',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } })
			}),
			body: {
				content: {
					'application/json': {
						schema: z.object({
							name: z.string().min(1).max(255),
							slotDurationMinutes: z.number().int().min(5).max(240),
							parallelSlots: z.number().int().min(1).max(50)
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } },
			412: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(adminMacroPatch, async (c) => {
		const { id } = c.req.valid('param');
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminMacroArea.update({ id, ...body }, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminMacroDelete = createRoute({
		method: 'delete',
		path: '/api/admin/macro-areas/{id}',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } })
			})
		},
		responses: {
			200: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } },
			412: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(adminMacroDelete, async (c) => {
		const { id } = c.req.valid('param');
		try {
			return c.json(await container.adminMacroArea.delete_({ id }, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminVtList = createRoute({
		method: 'get',
		path: '/api/admin/visit-types',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		responses: { 200: { content: { 'application/json': { schema: z.array(z.record(z.unknown())) } } } }
	});
	app.openapi(adminVtList, async (c) => {
		return c.json(await container.adminVisitType.list(), 200);
	});

	const adminVtCreate = createRoute({
		method: 'post',
		path: '/api/admin/visit-types',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							name: z.string().min(1).max(255),
							description: z.string().optional(),
							macroAreaId: z.number().int().positive()
						})
					}
				},
				required: true
			}
		},
		responses: { 200: { content: { 'application/json': { schema: z.object({ id: z.number() }) } } } }
	});
	app.openapi(adminVtCreate, async (c) => {
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminVisitType.create(body, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminVtPatch = createRoute({
		method: 'patch',
		path: '/api/admin/visit-types/{id}',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } })
			}),
			body: {
				content: {
					'application/json': {
						schema: z.object({
							name: z.string().min(1).max(255),
							description: z.string().optional(),
							macroAreaId: z.number().int().positive()
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } },
			412: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(adminVtPatch, async (c) => {
		const { id } = c.req.valid('param');
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminVisitType.update({ id, ...body }, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminVtDelete = createRoute({
		method: 'delete',
		path: '/api/admin/visit-types/{id}',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } })
			})
		},
		responses: {
			200: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } },
			412: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(adminVtDelete, async (c) => {
		const { id } = c.req.valid('param');
		try {
			return c.json(await container.adminVisitType.delete_({ id }, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const bookingsQuery = z.object({
		status: z.enum(['all', 'confirmed', 'cancelled']).optional().openapi({
			param: { name: 'status', in: 'query', required: false }
		}),
		from: z.string().optional().openapi({ param: { name: 'from', in: 'query', required: false } }),
		to: z.string().optional().openapi({ param: { name: 'to', in: 'query', required: false } }),
		macroAreaId: z.coerce.number().int().positive().optional().openapi({
			param: { name: 'macroAreaId', in: 'query', required: false }
		}),
		orderAsc: z.string().optional().openapi({ param: { name: 'orderAsc', in: 'query', required: false } })
	});

	const adminBookingsList = createRoute({
		method: 'get',
		path: '/api/admin/bookings',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: { query: bookingsQuery },
		responses: { 200: { content: { 'application/json': { schema: z.array(z.record(z.unknown())) } } } }
	});
	app.openapi(adminBookingsList, async (c) => {
		const q = c.req.valid('query');
		const orderAsc =
			q.orderAsc === 'true' ? true : q.orderAsc === 'false' ? false : undefined;
		return c.json(
			await container.adminBooking.list({
				status: q.status,
				from: q.from,
				to: q.to,
				macroAreaId: q.macroAreaId,
				orderAsc
			}),
			200
		);
	});

	const adminBookingCreate = createRoute({
		method: 'post',
		path: '/api/admin/bookings',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							visitTypeId: z.number().int().positive(),
							slotStartIso: z.string(),
							firstName: z.string().min(1),
							lastName: z.string().min(1),
							fiscalCode: fiscalCodeZ,
							age: z.number().int().min(0).max(130),
							address: z.string().min(1),
							phone: z.string().min(1),
							email: z.string().email().optional().or(z.literal(''))
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: {
				content: {
					'application/json': { schema: z.object({ id: z.number(), code: z.string() }) }
				}
			},
			404: { content: { 'application/json': { schema: ApiErrorSchema } } },
			409: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(adminBookingCreate, async (c) => {
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminBooking.create(body, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminBookingCancel = createRoute({
		method: 'post',
		path: '/api/admin/bookings/{id}/cancel',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } })
			})
		},
		responses: {
			200: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } },
			404: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(adminBookingCancel, async (c) => {
		const { id } = c.req.valid('param');
		try {
			return c.json(await container.adminBooking.cancel({ id }, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminBookingPatient = createRoute({
		method: 'patch',
		path: '/api/admin/bookings/{id}/patient',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } })
			}),
			body: {
				content: {
					'application/json': {
						schema: z.object({
							firstName: z.string().min(1),
							lastName: z.string().min(1),
							fiscalCode: fiscalCodeZ,
							age: z.number().int().min(0).max(130),
							address: z.string().min(1),
							phone: z.string().min(1),
							email: z.string().email().optional().or(z.literal(''))
						})
					}
				},
				required: true
			}
		},
		responses: { 200: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } } }
	});
	app.openapi(adminBookingPatient, async (c) => {
		const { id } = c.req.valid('param');
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminBooking.updatePatient({ id, ...body }, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminReportsList = createRoute({
		method: 'get',
		path: '/api/admin/reports',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		responses: { 200: { content: { 'application/json': { schema: z.array(z.record(z.unknown())) } } } }
	});
	app.openapi(adminReportsList, async (c) => {
		return c.json(await container.adminReport.list(), 200);
	});

	const adminReportCreate = createRoute({
		method: 'post',
		path: '/api/admin/reports',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							fiscalCode: fiscalCodeZ,
							firstName: z.string().min(1),
							lastName: z.string().min(1),
							visitTypeId: z.number().int().positive(),
							examDateIso: z.string(),
							notes: z.string().optional()
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: { content: { 'application/json': { schema: z.object({ id: z.number(), code: z.string() }) } } }
		}
	});
	app.openapi(adminReportCreate, async (c) => {
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminReport.create(body, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminReportNotes = createRoute({
		method: 'patch',
		path: '/api/admin/reports/{id}/notes',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' } })
			}),
			body: {
				content: {
					'application/json': {
						schema: z.object({ notes: z.string().optional() })
					}
				},
				required: true
			}
		},
		responses: { 200: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } } }
	});
	app.openapi(adminReportNotes, async (c) => {
		const { id } = c.req.valid('param');
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminReport.setNotes({ id, ...body }, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminLogs = createRoute({
		method: 'get',
		path: '/api/admin/activity-logs',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			query: z.object({
				limit: z.coerce.number().int().min(1).max(500).optional().openapi({
					param: { name: 'limit', in: 'query', required: false }
				})
			})
		},
		responses: { 200: { content: { 'application/json': { schema: z.array(z.record(z.unknown())) } } } }
	});
	app.openapi(adminLogs, async (c) => {
		const q = c.req.valid('query');
		return c.json(await container.adminActivity.list(q), 200);
	});

	const adminUsersListRoute = createRoute({
		method: 'get',
		path: '/api/admin/users',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		responses: { 200: { content: { 'application/json': { schema: z.array(z.record(z.unknown())) } } } }
	});
	app.openapi(adminUsersListRoute, async (c) => {
		return c.json(await container.adminUser.list(), 200);
	});

	const adminUserCreateRoute = createRoute({
		method: 'post',
		path: '/api/admin/users',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				content: {
					'application/json': {
						schema: z.object({
							email: z.string().email(),
							name: z.string().min(1),
							password: z.string().min(8)
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: { content: { 'application/json': { schema: z.object({ id: z.number() }) } } },
			409: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(adminUserCreateRoute, async (c) => {
		const body = c.req.valid('json');
		try {
			return c.json(await container.adminUser.create(body, c.get('admin')), 200);
		} catch (e) {
			if (isHttpError(e)) return c.json({ error: e.message }, e.status);
			throw e;
		}
	});

	const adminReportUploadRoute = createRoute({
		method: 'post',
		path: '/upload/report/{reportId}',
		tags: ['Admin'],
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				reportId: z.coerce
					.number()
					.int()
					.positive()
					.openapi({ param: { name: 'reportId', in: 'path' } })
			}),
			body: {
				content: {
					'multipart/form-data': {
						schema: z.object({
							file: z.any().openapi({
								type: 'string',
								format: 'binary',
								description: 'Allegato referto: PDF, JPEG o PNG (max 10 MB; max 5 allegati per referto)'
							})
						})
					}
				},
				required: true
			}
		},
		responses: {
			200: {
				description: 'Caricamento riuscito',
				content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } }
			},
			400: { content: { 'application/json': { schema: ApiErrorSchema } } },
			401: { content: { 'application/json': { schema: ApiErrorSchema } } },
			404: { content: { 'application/json': { schema: ApiErrorSchema } } }
		}
	});
	app.openapi(adminReportUploadRoute, async (c) => {
		const { reportId } = c.req.valid('param');
		const auth = c.req.header('authorization');
		const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
		const admin = await container.auth.verifyAdminToken(token);
		if (!admin) {
			return c.json({ error: 'Unauthorized' }, 401);
		}
		const body = await c.req.parseBody();
		const file = body['file'];
		if (!file || typeof file === 'string') {
			return c.json({ error: 'File mancante' }, 400);
		}
		try {
			await container.adminReportUpload.uploadReportAttachment(reportId, file as File, admin);
		} catch (e) {
			if (isHttpError(e)) {
				return c.json({ error: e.message }, e.status as ContentfulStatusCode);
			}
			throw e;
		}
		return c.json({ ok: true as const }, 200);
	});

	app.doc('/openapi.json', {
		openapi: '3.0.0',
		info: {
			title: 'YourMedPortal API',
			version: '1.0.0',
			description:
				'API REST con contratti OpenAPI 3. Gli endpoint sotto `/api/...` espongono JSON; `GET /public/attachments/{id}` restituisce file binari; `POST /upload/report/{reportId}` accetta `multipart/form-data`. Autenticazione operatori: Bearer JWT da `POST /api/admin/login`. Interfaccia esplorabile: `GET /swagger` (non inclusa in questo documento).'
		},
		servers: [{ url: '/', description: 'API' }],
		tags: [
			{ name: 'System', description: 'Monitoraggio e disponibilità' },
			{ name: 'Public', description: 'Portale pazienti (prenotazioni e referti)' },
			{ name: 'Admin', description: 'Area riservata operatori e caricamento allegati' }
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
					description: 'Token ottenuto da POST /api/admin/login'
				}
			}
		}
	});

	return app;
}
