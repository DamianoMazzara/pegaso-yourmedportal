import { test, expect } from '@playwright/test';

const ADMIN = { email: 'admin@yourmedportal.test', password: 'Admin123!' };
const API = process.env.PUBLIC_API_URL ?? 'http://127.0.0.1:3001';
function e2eBookingDateYmd(): string {
	const d = new Date();
	d.setDate(d.getDate() + 10);
	return d.toISOString().slice(0, 10);
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
	await page.goto('/admin/login');
	await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
	await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
	await page.getByRole('button', { name: 'Entra' }).click();
	await expect(page).toHaveURL(/\/admin$/);
});

test('CRUD macroarea (create → modifica → elimina)', async ({ page }) => {
	const id = `E2E_M_${Date.now()}`;
	const idEd = `${id}_EDIT`;

	await page.goto('/admin/macroaree');
	const form = page.locator('form').first();
	await form.getByLabel('Nome', { exact: true }).fill(id);
	await form.getByLabel('Durata slot (min)', { exact: true }).fill('30');
	await form.getByLabel('Slot paralleli', { exact: true }).fill('2');
	await form.getByRole('button', { name: 'Aggiungi' }).click();
	await expect(page.getByRole('row', { name: new RegExp(id) })).toBeVisible({ timeout: 15_000 });

	await page
		.getByRole('row', { name: new RegExp(id) })
		.getByRole('button', { name: 'Modifica' })
		.click();
	const dlg = page.getByRole('dialog');
	await expect(dlg).toBeVisible();
	await dlg.getByLabel('Nome', { exact: true }).fill(idEd);
	await dlg.getByRole('button', { name: 'Salva' }).click();
	await expect(dlg).toBeHidden({ timeout: 10_000 });
	await expect(page.getByRole('row', { name: new RegExp(idEd) })).toBeVisible();

	page.once('dialog', (d) => d.accept());
	await page
		.getByRole('row', { name: new RegExp(idEd) })
		.getByRole('button', { name: 'Elimina' })
		.click();
	await expect(page.getByRole('row', { name: new RegExp(idEd) })).toHaveCount(0, { timeout: 10_000 });
});

test('CRUD tipologia visita (create → modifica → elimina)', async ({ page }) => {
	const id = `E2E_VT_${Date.now()}`;
	const idEd = `${id}_E`;

	await page.goto('/admin/tipologie');
	const form = page.locator('form').first();
	await form.getByLabel('Nome', { exact: true }).fill(id);
	await form.getByLabel('Descrizione', { exact: true }).fill('e2e');
	await form.getByRole('button', { name: 'Aggiungi tipologia' }).click();
	await expect(page.getByRole('row', { name: new RegExp(id) })).toBeVisible({ timeout: 15_000 });

	await page
		.getByRole('row', { name: new RegExp(id) })
		.getByRole('button', { name: 'Modifica' })
		.click();
	const dlg = page.getByRole('dialog');
	await dlg.getByLabel('Nome', { exact: true }).fill(idEd);
	await dlg.getByRole('button', { name: 'Salva' }).click();
	await expect(dlg).toBeHidden({ timeout: 10_000 });
	await expect(page.getByRole('row', { name: new RegExp(idEd) })).toBeVisible();

	page.once('dialog', (d) => d.accept());
	await page
		.getByRole('row', { name: new RegExp(idEd) })
		.getByRole('button', { name: 'Elimina' })
		.click();
	await expect(page.getByRole('row', { name: new RegExp(idEd) })).toHaveCount(0, { timeout: 10_000 });
});

test('referti: modifica note (update)', async ({ page, request }) => {
	const login = await request.post(`${API}/api/admin/login`, {
		headers: { 'Content-Type': 'application/json' },
		data: JSON.stringify(ADMIN)
	});
	expect(login.ok()).toBeTruthy();
	const { token } = (await login.json()) as { token: string };
	const vts = await request.get(`${API}/api/public/visit-types`);
	const list = (await vts.json()) as { id: number }[];
	expect(list.length).toBeGreaterThan(0);
	const visitTypeId = list[0]!.id;
	const cre = await request.post(`${API}/api/admin/reports`, {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		data: JSON.stringify({
			fiscalCode: 'RSSMRA80A01H501U',
			firstName: 'E2E',
			lastName: 'Nota',
			visitTypeId,
			examDateIso: new Date().toISOString(),
			notes: 'bozza'
		})
	});
	expect(cre.ok()).toBeTruthy();

	await page.goto('/admin/referti');
	const note = `nota e2e ${Date.now()}`;
	await page.getByRole('button', { name: 'Modifica note' }).first().click();
	const dlg = page.getByRole('dialog');
	await dlg.locator('textarea').fill(note);
	await dlg.getByRole('button', { name: 'Salva' }).click();
	await expect(dlg).toBeHidden({ timeout: 10_000 });
});

test('prenotazioni: modifica paziente (update)', async ({ page, request }) => {
	const login = await request.post(`${API}/api/admin/login`, {
		headers: { 'Content-Type': 'application/json' },
		data: JSON.stringify(ADMIN)
	});
	expect(login.ok()).toBeTruthy();
	const { token } = (await login.json()) as { token: string };
	const vts = await request.get(`${API}/api/public/visit-types`);
	const vlist = (await vts.json()) as { id: number }[];
	expect(vlist.length).toBeGreaterThan(0);
	const visitTypeId = vlist[0]!.id;
	const day = e2eBookingDateYmd();
	const slotsRes = await request.get(
		`${API}/api/public/available-slots?visitTypeId=${visitTypeId}&date=${day}`
	);
	const slotsData = (await slotsRes.json()) as { slots: string[] };
	expect(slotsData.slots.length).toBeGreaterThan(0);
	const adminSlot = slotsData.slots[1] ?? slotsData.slots[0]!;
	const u = String(Date.now());
	const first0 = `E2Epre${u}`;
	const last0 = 'Orig';
	const last1 = 'Modif';
	const cre = await request.post(`${API}/api/admin/bookings`, {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		data: JSON.stringify({
			visitTypeId,
			slotStartIso: adminSlot,
			firstName: first0,
			lastName: last0,
			fiscalCode: 'RSSMRA80A01H501U',
			age: 40,
			address: 'Via E2E 1',
			phone: '3331234567',
			email: ''
		})
	});
	expect(cre.ok()).toBeTruthy();

	await page.goto('/admin/prenotazioni');
	const row0 = page.getByRole('row', { name: new RegExp(`${first0}.*${last0}`) });
	await expect(row0).toBeVisible({ timeout: 15_000 });
	await row0.getByRole('button', { name: 'Modifica paziente' }).click();
	const dlg = page.getByRole('dialog', { name: 'Modifica dati paziente' });
	await expect(dlg).toBeVisible();
	await dlg.getByLabel('Cognome', { exact: true }).fill(last1);
	await dlg.getByRole('button', { name: 'Salva' }).click();
	await expect(dlg).toBeHidden({ timeout: 10_000 });
	await expect(page.getByRole('row', { name: new RegExp(`${first0}.*${last1}`) })).toBeVisible();
});

test('portale: pagina Prenota carica (read)', async ({ page }) => {
	await page.goto('/prenota');
	await expect(page.getByText('Prenota una prestazione')).toBeVisible({ timeout: 15_000 });
});
