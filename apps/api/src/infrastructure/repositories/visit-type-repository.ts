import { count, eq } from 'drizzle-orm';
import { bookings, macroAreas, reports, visitTypes } from '../../db/schema.js';
import type { AppDb } from '../database/app-db.js';

export class VisitTypeRepository {
	constructor(private readonly db: AppDb) {}

	listPublicOrderByName() {
		return this.db
			.select({
				id: visitTypes.id,
				name: visitTypes.name,
				description: visitTypes.description,
				macroAreaId: visitTypes.macroAreaId
			})
			.from(visitTypes)
			.orderBy(visitTypes.name);
	}

	selectIdAndMacroAreaIdById(visitTypeId: number) {
		return this.db
			.select({ id: visitTypes.id, macroAreaId: visitTypes.macroAreaId })
			.from(visitTypes)
			.where(eq(visitTypes.id, visitTypeId));
	}

	listAdminWithMacroName() {
		return this.db
			.select({
				id: visitTypes.id,
				name: visitTypes.name,
				description: visitTypes.description,
				macroAreaId: visitTypes.macroAreaId,
				macroAreaName: macroAreas.name
			})
			.from(visitTypes)
			.innerJoin(macroAreas, eq(visitTypes.macroAreaId, macroAreas.id))
			.orderBy(visitTypes.name);
	}

	async insert(values: { name: string; description: string | null; macroAreaId: number }) {
		const [res] = await this.db.insert(visitTypes).values(values);
		return res.insertId;
	}

	update(
		id: number,
		values: { name: string; description: string | null; macroAreaId: number }
	) {
		return this.db.update(visitTypes).set(values).where(eq(visitTypes.id, id));
	}

	async deleteById(id: number) {
		await this.db.delete(visitTypes).where(eq(visitTypes.id, id));
	}

	async countBookingsByVisitTypeId(visitTypeId: number) {
		const [row] = await this.db
			.select({ c: count() })
			.from(bookings)
			.where(eq(bookings.visitTypeId, visitTypeId));
		return Number(row?.c ?? 0);
	}

	async countReportsByVisitTypeId(visitTypeId: number) {
		const [row] = await this.db
			.select({ c: count() })
			.from(reports)
			.where(eq(reports.visitTypeId, visitTypeId));
		return Number(row?.c ?? 0);
	}

	selectNameById(visitTypeId: number) {
		return this.db
			.select({ name: visitTypes.name })
			.from(visitTypes)
			.where(eq(visitTypes.id, visitTypeId));
	}
}
