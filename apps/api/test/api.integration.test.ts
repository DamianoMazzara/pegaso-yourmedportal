import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApiApp } from '../src/http/create-app.js';
import { ensureTestBaseData, e2eBookingDateYmd, E2E_PATIENT_FC } from './ensure-test-data.js';

let app: ReturnType<typeof createApiApp>['app'];
let uploadDir: string;
let base: Awaited<ReturnType<typeof ensureTestBaseData>>;

const origin = 'http://e2e.local';

function url(path: string) {
	return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

async function readJson<T>(r: Response): Promise<T> {
	const text = await r.text();
	let data: unknown;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		throw new Error(`Not JSON: ${r.status} ${text.slice(0, 200)}`);
	}
	return data as T;
}

async function expectJsonStatus<T>(r: Response, status: number): Promise<T> {
	if (r.status !== status) {
		const t = await r.text();
		throw new Error(`Expected ${status}, got ${r.status}: ${t.slice(0, 500)}`);
	}
	return readJson<T>(r);
}

before(async () => {
	await import('../src/db/index.js');
	base = await ensureTestBaseData();
	uploadDir = mkdtempSync(join(tmpdir(), 'ym-api-e2e-'));
	({ app } = createApiApp({ uploadDir }));
});

after(() => {
	try {
		rmSync(uploadDir, { recursive: true, force: true });
	} catch {}
});

test(
	'integrazione API (route principali, DB .env)',
	{ timeout: 120_000 },
	async () => {
	{
		const r = await app.request(url('/health'), { method: 'GET' });
		assert.strictEqual(r.status, 200);
		assert.deepStrictEqual(await r.json(), { ok: true });
	}
	{
		const r = await app.request(url('/swagger'), { method: 'GET' });
		assert.strictEqual(r.status, 200);
		assert.ok((await r.text()).toLowerCase().includes('swagger'));
	}
	{
		const r = await app.request(url('/openapi.json'), { method: 'GET' });
		const doc = await expectJsonStatus<{ openapi?: string }>(r, 200);
		assert.ok(doc.openapi != null);
	}

	const macroList = await expectJsonStatus<Array<{ id: number; name: string }>>(
		await app.request(url('/api/public/macro-areas'), { method: 'GET' }),
		200
	);
	assert.ok(macroList.length > 0);
	const visitTypes = await expectJsonStatus<
		Array<{ id: number; name: string; macroAreaId: number }>
	>(await app.request(url('/api/public/visit-types'), { method: 'GET' }), 200);
	assert.strictEqual(visitTypes.some((v) => v.id === base.visitTypeId), true);

	const day = e2eBookingDateYmd();
	const qSlots = new URLSearchParams({ visitTypeId: String(base.visitTypeId), date: day });
	const slotsRes = await app.request(url(`/api/public/available-slots?${qSlots}`), {
		method: 'GET'
	});
	const slotsData = await expectJsonStatus<{ slots: string[] }>(slotsRes, 200);
	assert.ok(slotsData.slots.length > 0);
	const slotStartIso = slotsData.slots[0]!;

	const qWeek = new URLSearchParams({ visitTypeId: String(base.visitTypeId), weekStart: day });
	const weekRes = await app.request(url(`/api/public/week-availability?${qWeek}`), {
		method: 'GET'
	});
	const week = await expectJsonStatus<{ days: unknown[]; slotDurationMinutes: number }>(
		weekRes,
		200
	);
	assert.strictEqual(week.days.length, 7);

	const bookingBody = {
		visitTypeId: base.visitTypeId,
		slotStartIso,
		firstName: 'Mario',
		lastName: 'Rossi',
		fiscalCode: E2E_PATIENT_FC,
		age: 40,
		address: 'Via Test 1',
		phone: '3331234567',
		email: 'mario.rossi.e2e@test.local'
	};
	const bookRes = await app.request(url('/api/public/bookings'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(bookingBody)
	});
	const bookOut = await expectJsonStatus<{ code: string }>(bookRes, 200);
	const bookingCode = bookOut.code;
	assert.ok(bookingCode.length > 0);

	const cancelP = await app.request(url('/api/public/bookings/cancel'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ fiscalCode: E2E_PATIENT_FC, code: bookingCode })
	});
	const cancelOut = await expectJsonStatus<{ ok: boolean }>(cancelP, 200);
	assert.strictEqual(cancelOut.ok, true);

	const loginRes = await app.request(url('/api/admin/login'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: base.adminEmail, password: base.adminPassword })
	});
	const { token, user } = await expectJsonStatus<{
		token: string;
		user: { id: number; email: string; name: string };
	}>(loginRes, 200);
	assert.ok(token.length > 10);
	assert.strictEqual(user.email, base.adminEmail);
	const auth = { Authorization: `Bearer ${token}` };

	const me = await expectJsonType<{ id: number; email: string; name: string }>(
		await app.request(url('/api/admin/me'), { method: 'GET', headers: auth })
	);
	assert.strictEqual(me.email, user.email);
	const stats = await expectJsonType<{
		bookingsTotal: number;
		bookingsTodayConfirmed: number;
		reportsPending: number;
		reportsReady: number;
	}>(await app.request(url('/api/admin/stats'), { method: 'GET', headers: auth }));
	assert.strictEqual(typeof stats.bookingsTotal, 'number');

	await expectJsonType<unknown[]>(
		await app.request(url('/api/admin/macro-areas'), { method: 'GET', headers: auth })
	);
	await expectJsonType<unknown[]>(
		await app.request(url('/api/admin/visit-types'), { method: 'GET', headers: auth })
	);
	await expectJsonType<unknown[]>(
		await app.request(url('/api/admin/bookings'), { method: 'GET', headers: auth })
	);
	await expectJsonType<unknown[]>(
		await app.request(url('/api/admin/reports'), { method: 'GET', headers: auth })
	);
	await expectJsonType<unknown[]>(
		await app.request(url('/api/admin/activity-logs?limit=10'), { method: 'GET', headers: auth })
	);
	await expectJsonType<unknown[]>(
		await app.request(url('/api/admin/users'), { method: 'GET', headers: auth })
	);

	const suffix = `${Date.now()}`;
	const macroName = `E2E_TMP_MACRO_${suffix}`;
	const macroCreate = await app.request(url('/api/admin/macro-areas'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({ name: macroName, slotDurationMinutes: 30, parallelSlots: 5 })
	});
	const { id: tmpMacroId } = await expectJsonType<{ id: number }>(macroCreate);

	await app.request(url(`/api/admin/macro-areas/${tmpMacroId}`), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({ name: macroName, slotDurationMinutes: 30, parallelSlots: 6 })
	});

	const vtName = `E2E_TMP_VT_${suffix}`;
	const vtCreate = await app.request(url('/api/admin/visit-types'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({ name: vtName, description: 'tmp', macroAreaId: tmpMacroId })
	});
	const { id: tmpVtId } = await expectJsonType<{ id: number }>(vtCreate);

	await app.request(url(`/api/admin/visit-types/${tmpVtId}`), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({
			name: vtName,
			description: 'tmp2',
			macroAreaId: tmpMacroId
		})
	});

	const delVt = await app.request(url(`/api/admin/visit-types/${tmpVtId}`), {
		method: 'DELETE',
		headers: auth
	});
	assert.strictEqual(delVt.status, 200);
	const delMa = await app.request(url(`/api/admin/macro-areas/${tmpMacroId}`), {
		method: 'DELETE',
		headers: auth
	});
	assert.strictEqual(delMa.status, 200);

	const baseSlots2 = await expectJsonType<{ slots: string[] }>(
		await app.request(url(`/api/public/available-slots?${qSlots}`), { method: 'GET' })
	);
	const adminSlot = baseSlots2.slots[1] ?? baseSlots2.slots[0]!;
	const admBookRes = await app.request(url('/api/admin/bookings'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({
			visitTypeId: base.visitTypeId,
			slotStartIso: adminSlot,
			firstName: 'Luigi',
			lastName: 'Bianchi',
			fiscalCode: E2E_PATIENT_FC,
			age: 35,
			address: 'Via Admin 2',
			phone: '3339990000',
			email: ''
		})
	});
	const { id: adminBookingId } = await expectJsonType<{ id: number; code: string }>(admBookRes);

	const patchPat = await app.request(url(`/api/admin/bookings/${adminBookingId}/patient`), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({
			firstName: 'Luigi2',
			lastName: 'Bianchi2',
			fiscalCode: E2E_PATIENT_FC,
			age: 36,
			address: 'Via Admin 3',
			phone: '3339990001',
			email: ''
		})
	});
	assert.strictEqual((await expectJsonType<{ ok: true }>(patchPat)).ok, true);

	const cancelB = await app.request(url(`/api/admin/bookings/${adminBookingId}/cancel`), {
		method: 'POST',
		headers: auth
	});
	assert.strictEqual((await expectJsonType<{ ok: true }>(cancelB)).ok, true);

	const exam = new Date();
	exam.setDate(exam.getDate() - 1);
	const examStr = exam.toISOString();
	const repCreate = await app.request(url('/api/admin/reports'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({
			fiscalCode: E2E_PATIENT_FC,
			firstName: 'Test',
			lastName: 'Paziente',
			visitTypeId: base.visitTypeId,
			examDateIso: examStr,
			notes: 'note e2e'
		})
	});
	const { id: reportId, code: reportCode } = await expectJsonType<{
		id: number;
		code: string;
	}>(repCreate);

	const getRepPending = await app.request(
		url(
			`/api/public/reports?fiscalCode=${encodeURIComponent(E2E_PATIENT_FC)}&code=${encodeURIComponent(reportCode)}`
		),
		{ method: 'GET' }
	);
	const repJson = await expectJsonType<{
		status: string;
		attachments: { id: number }[];
	}>(getRepPending);
	assert.strictEqual(repJson.status, 'pending');
	assert.strictEqual(repJson.attachments.length, 0);

	const notesP = await app.request(url(`/api/admin/reports/${reportId}/notes`), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({ notes: 'aggiornate e2e' })
	});
	assert.strictEqual((await expectJsonType<{ ok: true }>(notesP)).ok, true);

	const pdf = new File(
		[new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc4, 0xe5, 0xf2, 0xe5, 0xeb, 0xa7, 0xf3, 0xa0, 0xd0, 0xc4, 0xc6, 0x0a, 0x34, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x3e, 0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, 0x74, 0x72, 0x61, 0x69, 0x6c, 0x65, 0x72, 0x0a, 0x3c, 0x3c, 0x2f, 0x52, 0x6f, 0x6f, 0x74, 0x2f, 0x20, 0x31, 0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a, 0x25, 0x25, 0x45, 0x4f, 0x46])],
		'micro.pdf',
		{ type: 'application/pdf' }
	);
	const fd = new FormData();
	fd.set('file', pdf);
	const up = await app.request(url(`/upload/report/${reportId}`), {
		method: 'POST',
		headers: { ...auth },
		body: fd
	});
	assert.strictEqual(up.status, 200);
	assert.strictEqual((await up.json() as { ok: boolean }).ok, true);

	const getRepReady = await app.request(
		url(
			`/api/public/reports?fiscalCode=${encodeURIComponent(E2E_PATIENT_FC)}&code=${encodeURIComponent(reportCode)}`
		),
		{ method: 'GET' }
	);
	const repReady = await expectJsonType<{
		status: string;
		attachments: { id: number; downloadUrl: string }[];
	}>(getRepReady);
	assert.strictEqual(repReady.status, 'ready');
	assert.ok(repReady.attachments.length > 0);
	const attId = repReady.attachments[0]!.id;

	const att = await app.request(
		url(
			`/public/attachments/${attId}?fiscalCode=${encodeURIComponent(E2E_PATIENT_FC)}&reportCode=${encodeURIComponent(reportCode)}`
		),
		{ method: 'GET' }
	);
	assert.strictEqual(att.status, 200);
	assert.ok(att.headers.get('content-type')?.includes('application/pdf'));

	const extraEmail = `e2e_extra_${suffix}@yourmedportal.test`;
	const uCreate = await app.request(url('/api/admin/users'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({ email: extraEmail, name: 'Extra E2E', password: 'E2EExtra123!xx' })
	});
	if (uCreate.status !== 200) {
		const t = await uCreate.text();
		if (!t.includes('Email già registrata')) {
			throw new Error(`Create admin user: ${uCreate.status} ${t}`);
		}
	} else {
		const { id: extraId } = await readJson<{ id: number }>(uCreate);
		assert.ok(extraId > 0);
	}

	const unauthorized = await app.request(url('/api/admin/me'), { method: 'GET' });
	assert.strictEqual(unauthorized.status, 401);
	}
);

async function expectJsonType<T>(r: Response): Promise<T> {
	if (r.status !== 200) {
		const t = await r.text();
		throw new Error(`Expected 200, got ${r.status}: ${t.slice(0, 400)}`);
	}
	return readJson<T>(r);
}
