import { and, asc, count, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { bookings, visitTypes } from '../../db/schema.js';
import type { AppDb } from '../database/app-db.js';

export class BookingRepository {
	constructor(private readonly db: AppDb) {}

	async countAll() {
		const [row] = await this.db.select({ c: count() }).from(bookings);
		return Number(row?.c ?? 0);
	}

	async countConfirmedFromDate(from: Date) {
		const [row] = await this.db
			.select({ c: count() })
			.from(bookings)
			.where(and(eq(bookings.status, 'confirmed'), gte(bookings.slotStart, from)));
		return Number(row?.c ?? 0);
	}

	async countConfirmedAtMacroAreaSlot(macroAreaId: number, slotStart: Date) {
		const [row] = await this.db
			.select({ c: count() })
			.from(bookings)
			.innerJoin(visitTypes, eq(bookings.visitTypeId, visitTypes.id))
			.where(
				and(
					eq(visitTypes.macroAreaId, macroAreaId),
					eq(bookings.status, 'confirmed'),
					eq(bookings.slotStart, slotStart)
				)
			);
		return Number(row?.c ?? 0);
	}

	async getConfirmedCountsBySlotInRange(macroAreaId: number, from: Date, to: Date) {
		return this.db
			.select({ slotStart: bookings.slotStart, c: count() })
			.from(bookings)
			.innerJoin(visitTypes, eq(bookings.visitTypeId, visitTypes.id))
			.where(
				and(
					eq(visitTypes.macroAreaId, macroAreaId),
					eq(bookings.status, 'confirmed'),
					gte(bookings.slotStart, from),
					lte(bookings.slotStart, to)
				)
			)
			.groupBy(bookings.slotStart);
	}

	async insert(values: {
		code: string;
		fiscalCode: string;
		firstName: string;
		lastName: string;
		age: number;
		address: string;
		phone: string;
		email: string | null;
		visitTypeId: number;
		slotStart: Date;
		status: 'confirmed' | 'cancelled';
	}) {
		const [res] = await this.db.insert(bookings).values(values);
		return res.insertId;
	}

	findByCodeAndFiscal(code: string, fiscalCode: string) {
		return this.db
			.select()
			.from(bookings)
			.where(and(eq(bookings.code, code), eq(bookings.fiscalCode, fiscalCode)));
	}

	findById(id: number) {
		return this.db.select().from(bookings).where(eq(bookings.id, id));
	}

	setStatus(id: number, status: 'confirmed' | 'cancelled') {
		return this.db.update(bookings).set({ status }).where(eq(bookings.id, id));
	}

	updatePatient(
		id: number,
		values: {
			firstName: string;
			lastName: string;
			fiscalCode: string;
			age: number;
			address: string;
			phone: string;
			email: string | null;
		}
	) {
		return this.db.update(bookings).set(values).where(eq(bookings.id, id));
	}

	async listAdmin(input: {
		status?: 'all' | 'confirmed' | 'cancelled';
		from?: string;
		to?: string;
		macroAreaId?: number;
		orderAsc?: boolean;
	} | void) {
		const conditions: SQL[] = [];
		if (input?.status && input.status !== 'all') {
			conditions.push(eq(bookings.status, input.status));
		}
		if (input?.from) {
			const d = new Date(input.from);
			conditions.push(gte(bookings.slotStart, d));
		}
		if (input?.to) {
			const d = new Date(input.to);
			d.setHours(23, 59, 59, 999);
			conditions.push(sql`${bookings.slotStart} <= ${d}`);
		}
		if (input?.macroAreaId != null) {
			conditions.push(eq(visitTypes.macroAreaId, input.macroAreaId));
		}
		const orderByClause = input?.orderAsc ? asc(bookings.slotStart) : desc(bookings.slotStart);
		const base = this.db
			.select({
				id: bookings.id,
				code: bookings.code,
				fiscalCode: bookings.fiscalCode,
				firstName: bookings.firstName,
				lastName: bookings.lastName,
				age: bookings.age,
				address: bookings.address,
				phone: bookings.phone,
				email: bookings.email,
				slotStart: bookings.slotStart,
				status: bookings.status,
				visitTypeId: bookings.visitTypeId,
				visitTypeName: visitTypes.name
			})
			.from(bookings)
			.innerJoin(visitTypes, eq(bookings.visitTypeId, visitTypes.id));
		const rows =
			conditions.length > 0
				? await base.where(and(...conditions)).orderBy(orderByClause)
				: await base.orderBy(orderByClause);
		return rows.map((r) => ({
			...r,
			slotStart: r.slotStart.toISOString()
		}));
	}
}
