import { count, eq } from 'drizzle-orm';
import { reportAttachments, reports } from '../../db/schema.js';
import type { AppDb } from '../database/app-db.js';

export class ReportAttachmentRepository {
	constructor(private readonly db: AppDb) {}

	findByIdWithReport(id: number) {
		return this.db
			.select({
				storedPath: reportAttachments.storedPath,
				mimeType: reportAttachments.mimeType,
				originalName: reportAttachments.originalName,
				fiscalCode: reports.fiscalCode,
				code: reports.code,
				status: reports.status
			})
			.from(reportAttachments)
			.innerJoin(reports, eq(reportAttachments.reportId, reports.id))
			.where(eq(reportAttachments.id, id));
	}

	listByReportId(reportId: number) {
		return this.db
			.select({
				id: reportAttachments.id,
				originalName: reportAttachments.originalName,
				mimeType: reportAttachments.mimeType
			})
			.from(reportAttachments)
			.where(eq(reportAttachments.reportId, reportId));
	}

	async countByReportId(reportId: number) {
		const [row] = await this.db
			.select({ c: count() })
			.from(reportAttachments)
			.where(eq(reportAttachments.reportId, reportId));
		return Number(row?.c ?? 0);
	}

	async insert(values: {
		reportId: number;
		originalName: string;
		storedPath: string;
		mimeType: string;
		sizeBytes: number;
	}) {
		const [res] = await this.db.insert(reportAttachments).values(values);
		return res.insertId;
	}
}
