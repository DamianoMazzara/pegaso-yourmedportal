import { and, count, desc, eq } from 'drizzle-orm';
import { reports, visitTypes } from '../../db/schema.js';
import type { AppDb } from '../database/app-db.js';

export class ReportRepository {
	constructor(private readonly db: AppDb) {}

	async countByStatus(status: 'pending' | 'ready') {
		const [row] = await this.db.select({ c: count() }).from(reports).where(eq(reports.status, status));
		return Number(row?.c ?? 0);
	}

	findByCodeAndFiscal(code: string, fiscalCode: string) {
		return this.db
			.select()
			.from(reports)
			.where(and(eq(reports.code, code), eq(reports.fiscalCode, fiscalCode)));
	}

	findById(id: number) {
		return this.db.select().from(reports).where(eq(reports.id, id));
	}

	listAdminWithVisitTypeName() {
		return this.db
			.select({
				id: reports.id,
				code: reports.code,
				fiscalCode: reports.fiscalCode,
				firstName: reports.firstName,
				lastName: reports.lastName,
				status: reports.status,
				examDate: reports.examDate,
				notes: reports.notes,
				visitTypeName: visitTypes.name
			})
			.from(reports)
			.innerJoin(visitTypes, eq(reports.visitTypeId, visitTypes.id))
			.orderBy(desc(reports.examDate));
	}

	async insert(values: {
		code: string;
		fiscalCode: string;
		firstName: string;
		lastName: string;
		visitTypeId: number;
		examDate: Date;
		notes: string | null;
		status: 'pending' | 'ready';
	}) {
		const [res] = await this.db.insert(reports).values(values);
		return res.insertId;
	}

	setNotes(id: number, notes: string | null) {
		return this.db.update(reports).set({ notes }).where(eq(reports.id, id));
	}

	setStatus(id: number, status: 'pending' | 'ready') {
		return this.db.update(reports).set({ status }).where(eq(reports.id, id));
	}
}
