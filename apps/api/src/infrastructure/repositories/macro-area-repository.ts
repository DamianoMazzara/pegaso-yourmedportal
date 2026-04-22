import { asc, count, eq } from 'drizzle-orm';
import { macroAreas, visitTypes } from '../../db/schema.js';
import type { AppDb } from '../database/app-db.js';

export class MacroAreaRepository {
	constructor(private readonly db: AppDb) {}

	listPublicOrderByName() {
		return this.db
			.select({ id: macroAreas.id, name: macroAreas.name })
			.from(macroAreas)
			.orderBy(asc(macroAreas.name));
	}

	findById(id: number) {
		return this.db.select().from(macroAreas).where(eq(macroAreas.id, id));
	}

	listAllOrderByName() {
		return this.db.select().from(macroAreas).orderBy(macroAreas.name);
	}

	async insert(values: {
		name: string;
		slotDurationMinutes: number;
		parallelSlots: number;
	}) {
		const [res] = await this.db.insert(macroAreas).values(values);
		return res.insertId;
	}

	update(
		id: number,
		values: { name: string; slotDurationMinutes: number; parallelSlots: number }
	) {
		return this.db.update(macroAreas).set(values).where(eq(macroAreas.id, id));
	}

	async deleteById(id: number) {
		await this.db.delete(macroAreas).where(eq(macroAreas.id, id));
	}

	async countVisitTypesByMacroAreaId(macroAreaId: number) {
		const [row] = await this.db
			.select({ c: count() })
			.from(visitTypes)
			.where(eq(visitTypes.macroAreaId, macroAreaId));
		return Number(row?.c ?? 0);
	}
}
