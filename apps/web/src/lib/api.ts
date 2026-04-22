const baseUrl = () => {
	// In Docker, config.js sets window.__YMP__ at runtime (build-time env alone is not enough).
	if (typeof window !== 'undefined' && window.__YMP__?.publicApiUrl) {
		return window.__YMP__.publicApiUrl;
	}
	return import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';
};

export function setAdminToken(token: string | null) {
	if (typeof window === 'undefined') return;
	if (token) localStorage.setItem('admin_token', token);
	else localStorage.removeItem('admin_token');
}

export function getAdminToken(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem('admin_token');
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	const token = getAdminToken();
	const headers = new Headers(init?.headers);
	if (
		init?.body &&
		!(init.body instanceof FormData) &&
		!headers.has('Content-Type')
	) {
		headers.set('Content-Type', 'application/json');
	}
	if (token) headers.set('Authorization', `Bearer ${token}`);
	return fetch(`${baseUrl()}${path}`, { ...init, headers, credentials: 'include' });
}

async function parseJson<T>(resPromise: Promise<Response>): Promise<T> {
	const res = await resPromise;
	const data = (await res.json().catch(() => ({}))) as { error?: string };
	if (!res.ok) {
		throw new Error((data.error ?? res.statusText) || 'Errore richiesta');
	}
	return data as T;
}

function qs(params: Record<string, string | number | boolean | undefined>) {
	const u = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v === undefined) continue;
		u.set(k, String(v));
	}
	const s = u.toString();
	return s ? `?${s}` : '';
}

export type MacroAreaRef = { id: number; name: string };

export type VisitTypeRow = {
	id: number;
	name: string;
	description: string | null;
	macroAreaId: number;
};

export type VisitTypeAdminRow = VisitTypeRow & { macroAreaName: string };

export type WeekAvailability = {
	days: { date: string; slots: { startIso: string; available: boolean }[] }[];
	slotDurationMinutes: number;
};

export type ReportPublic = {
	status: string;
	code: string;
	examDate: string;
	visitTypeName: string;
	firstName: string;
	lastName: string;
	notes: string | null;
	attachments: { id: number; name: string; mimeType: string; downloadUrl: string }[];
};

export type AdminStats = {
	bookingsTotal: number;
	bookingsTodayConfirmed: number;
	reportsPending: number;
	reportsReady: number;
};

export type AdminMe = { id: number; email: string; name: string };

export type AdminLoginResult = { token: string; user: AdminMe };

export type MacroAreaFull = {
	id: number;
	name: string;
	slotDurationMinutes: number;
	parallelSlots: number;
};

export type BookingAdminRow = {
	id: number;
	code: string;
	fiscalCode: string;
	firstName: string;
	lastName: string;
	age: number;
	address: string;
	phone: string;
	email: string | null;
	slotStart: string;
	status: string;
	visitTypeId: number;
	visitTypeName: string;
};

export type ReportAdminRow = {
	id: number;
	code: string;
	fiscalCode: string;
	firstName: string;
	lastName: string;
	status: string;
	examDate: string;
	notes: string | null;
	visitTypeName: string;
};

export type ActivityLogRow = {
	id: number;
	action: string;
	entityType: string;
	entityId: string | null;
	details: Record<string, unknown> | null;
	createdAt: string;
	adminEmail: string | null;
};

export type AdminUserRow = {
	id: number;
	email: string;
	name: string;
	createdAt: Date | string;
};

export const api = {
	public: {
		macroAreasList: () => parseJson<MacroAreaRef[]>(apiFetch('/api/public/macro-areas')),

		visitTypesList: () => parseJson<VisitTypeRow[]>(apiFetch('/api/public/visit-types')),

		availableSlots: (p: { visitTypeId: number; date: string }) =>
			parseJson<{ slots: string[] }>(
				apiFetch(`/api/public/available-slots${qs({ visitTypeId: p.visitTypeId, date: p.date })}`)
			),

		weekAvailability: (p: { visitTypeId: number; weekStart: string }) =>
			parseJson<WeekAvailability>(
				apiFetch(
					`/api/public/week-availability${qs({ visitTypeId: p.visitTypeId, weekStart: p.weekStart })}`
				)
			),

		createBooking: (body: {
			visitTypeId: number;
			slotStartIso: string;
			firstName: string;
			lastName: string;
			fiscalCode: string;
			age: number;
			address: string;
			phone: string;
			email?: string;
		}) =>
			parseJson<{ code: string }>(
				apiFetch('/api/public/bookings', { method: 'POST', body: JSON.stringify(body) })
			),

		cancelBooking: (body: { fiscalCode: string; code: string }) =>
			parseJson<{ ok: true }>(
				apiFetch('/api/public/bookings/cancel', { method: 'POST', body: JSON.stringify(body) })
			),

		getReport: (p: { fiscalCode: string; code: string }) =>
			parseJson<ReportPublic>(
				apiFetch(`/api/public/reports${qs({ fiscalCode: p.fiscalCode, code: p.code })}`)
			)
	},

	admin: {
		login: (body: { email: string; password: string }) =>
			parseJson<AdminLoginResult>(
				apiFetch('/api/admin/login', { method: 'POST', body: JSON.stringify(body) })
			),

		me: () => parseJson<AdminMe>(apiFetch('/api/admin/me')),

		stats: () => parseJson<AdminStats>(apiFetch('/api/admin/stats')),

		macroAreasList: () => parseJson<MacroAreaFull[]>(apiFetch('/api/admin/macro-areas')),

		macroAreaCreate: (body: {
			name: string;
			slotDurationMinutes: number;
			parallelSlots: number;
		}) =>
			parseJson<{ id: number }>(
				apiFetch('/api/admin/macro-areas', { method: 'POST', body: JSON.stringify(body) })
			),

		macroAreaUpdate: (p: {
			id: number;
			name: string;
			slotDurationMinutes: number;
			parallelSlots: number;
		}) =>
			parseJson<{ ok: true }>(
				apiFetch(`/api/admin/macro-areas/${p.id}`, {
					method: 'PATCH',
					body: JSON.stringify({
						name: p.name,
						slotDurationMinutes: p.slotDurationMinutes,
						parallelSlots: p.parallelSlots
					})
				})
			),

		macroAreaDelete: (p: { id: number }) =>
			parseJson<{ ok: true }>(apiFetch(`/api/admin/macro-areas/${p.id}`, { method: 'DELETE' })),

		visitTypesList: () => parseJson<VisitTypeAdminRow[]>(apiFetch('/api/admin/visit-types')),

		visitTypeCreate: (body: {
			name: string;
			description?: string;
			macroAreaId: number;
		}) =>
			parseJson<{ id: number }>(
				apiFetch('/api/admin/visit-types', { method: 'POST', body: JSON.stringify(body) })
			),

		visitTypeUpdate: (p: {
			id: number;
			name: string;
			description?: string;
			macroAreaId: number;
		}) =>
			parseJson<{ ok: true }>(
				apiFetch(`/api/admin/visit-types/${p.id}`, {
					method: 'PATCH',
					body: JSON.stringify({
						name: p.name,
						description: p.description,
						macroAreaId: p.macroAreaId
					})
				})
			),

		visitTypeDelete: (p: { id: number }) =>
			parseJson<{ ok: true }>(apiFetch(`/api/admin/visit-types/${p.id}`, { method: 'DELETE' })),

		bookingsList: (input?: {
			status?: 'all' | 'confirmed' | 'cancelled';
			from?: string;
			to?: string;
			macroAreaId?: number;
			orderAsc?: boolean;
		}) =>
			parseJson<BookingAdminRow[]>(
				apiFetch(
					`/api/admin/bookings${qs({
						status: input?.status,
						from: input?.from,
						to: input?.to,
						macroAreaId: input?.macroAreaId,
						orderAsc:
							input?.orderAsc === true ? 'true' : input?.orderAsc === false ? 'false' : undefined
					})}`
				)
			),

		bookingCreate: (body: {
			visitTypeId: number;
			slotStartIso: string;
			firstName: string;
			lastName: string;
			fiscalCode: string;
			age: number;
			address: string;
			phone: string;
			email?: string;
		}) =>
			parseJson<{ id: number; code: string }>(
				apiFetch('/api/admin/bookings', { method: 'POST', body: JSON.stringify(body) })
			),

		bookingCancel: (p: { id: number }) =>
			parseJson<{ ok: true }>(
				apiFetch(`/api/admin/bookings/${p.id}/cancel`, { method: 'POST' })
			),

		bookingUpdatePatient: (p: {
			id: number;
			firstName: string;
			lastName: string;
			fiscalCode: string;
			age: number;
			address: string;
			phone: string;
			email?: string;
		}) => {
			const { id, ...body } = p;
			return parseJson<{ ok: true }>(
				apiFetch(`/api/admin/bookings/${id}/patient`, { method: 'PATCH', body: JSON.stringify(body) })
			);
		},

		reportsList: () => parseJson<ReportAdminRow[]>(apiFetch('/api/admin/reports')),

		reportCreate: (body: {
			fiscalCode: string;
			firstName: string;
			lastName: string;
			visitTypeId: number;
			examDateIso: string;
			notes?: string;
		}) =>
			parseJson<{ id: number; code: string }>(
				apiFetch('/api/admin/reports', { method: 'POST', body: JSON.stringify(body) })
			),

		reportSetNotes: (p: { id: number; notes?: string }) =>
			parseJson<{ ok: true }>(
				apiFetch(`/api/admin/reports/${p.id}/notes`, {
					method: 'PATCH',
					body: JSON.stringify({ notes: p.notes })
				})
			),

		activityLogsList: (input?: { limit?: number }) =>
			parseJson<ActivityLogRow[]>(
				apiFetch(`/api/admin/activity-logs${qs({ limit: input?.limit })}`)
			),

		adminUsersList: () => parseJson<AdminUserRow[]>(apiFetch('/api/admin/users')),

		adminUserCreate: (body: { email: string; name: string; password: string }) =>
			parseJson<{ id: number }>(
				apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(body) })
			)
	}
};

export async function uploadReportFile(reportId: number, file: File) {
	const token = getAdminToken();
	const fd = new FormData();
	fd.append('file', file);
	const res = await fetch(`${baseUrl()}/upload/report/${reportId}`, {
		method: 'POST',
		headers: token ? { Authorization: `Bearer ${token}` } : {},
		body: fd,
		credentials: 'include'
	});
	if (!res.ok) {
		const j = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(j.error ?? 'Caricamento fallito');
	}
}
