import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { adminUsers, macroAreas, visitTypes } from '../src/db/schema.js';

export const E2E_MACRO_NAME = '__YM_E2E_BASE_MACRO__';
export const E2E_VT_NAME = '__YM_E2E_BASE_VT__';
export const E2E_ADMIN_EMAIL = 'admin@yourmedportal.test';
export const E2E_ADMIN_PASSWORD = 'Admin123!';

export const E2E_PATIENT_FC = 'RSSMRA80A01H501U';

export type TestBaseContext = {
	adminEmail: string;
	adminPassword: string;
	macroAreaId: number;
	visitTypeId: number;
	patientFiscalCode: string;
};

export async function ensureTestBaseData(): Promise<TestBaseContext> {
	const [existingAdmin] = await db
		.select()
		.from(adminUsers)
		.where(eq(adminUsers.email, E2E_ADMIN_EMAIL));

	if (!existingAdmin) {
		const passwordHash = bcrypt.hashSync(E2E_ADMIN_PASSWORD, 10);
		await db.insert(adminUsers).values({
			email: E2E_ADMIN_EMAIL,
			name: 'E2E Admin',
			passwordHash
		});
	}

	const [foundMacro] = await db
		.select()
		.from(macroAreas)
		.where(eq(macroAreas.name, E2E_MACRO_NAME));
	let macroAreaId: number;
	if (foundMacro) {
		macroAreaId = foundMacro.id;
	} else {
		const [ins] = await db.insert(macroAreas).values({
			name: E2E_MACRO_NAME,
			slotDurationMinutes: 30,
			parallelSlots: 20
		});
		macroAreaId = ins.insertId;
	}

	const [foundVt] = await db
		.select()
		.from(visitTypes)
		.where(eq(visitTypes.name, E2E_VT_NAME));
	let visitTypeId: number;
	if (foundVt) {
		visitTypeId = foundVt.id;
		if (foundVt.macroAreaId !== macroAreaId) {
			await db
				.update(visitTypes)
				.set({ macroAreaId })
				.where(eq(visitTypes.id, foundVt.id));
		}
	} else {
		const [ins] = await db.insert(visitTypes).values({
			name: E2E_VT_NAME,
			description: 'Solo test E2E',
			macroAreaId
		});
		visitTypeId = ins.insertId;
	}

	return {
		adminEmail: E2E_ADMIN_EMAIL,
		adminPassword: E2E_ADMIN_PASSWORD,
		macroAreaId,
		visitTypeId,
		patientFiscalCode: E2E_PATIENT_FC
	};
}

export function e2eBookingDateYmd(): string {
	const d = new Date();
	d.setDate(d.getDate() + 10);
	const y = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${mo}-${day}`;
}
