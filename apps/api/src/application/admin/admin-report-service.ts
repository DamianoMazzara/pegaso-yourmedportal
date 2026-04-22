import { newReportCode } from '../../lib/codes.js';
import { sendEmailStub } from '../../lib/email.js';
import type { AdminPayload } from '../support/auth-service.js';
import type { ActivityLogger } from '../support/activity-logger.js';
import type { ReportRepository } from '../../infrastructure/repositories/report-repository.js';
export class AdminReportService {
	constructor(
		private readonly reports: ReportRepository,
		private readonly activity: ActivityLogger
	) {}

	async list() {
		const rows = await this.reports.listAdminWithVisitTypeName();
		return rows.map((r) => ({ ...r, examDate: r.examDate.toISOString() }));
	}

	async create(
		input: {
			fiscalCode: string;
			firstName: string;
			lastName: string;
			visitTypeId: number;
			examDateIso: string;
			notes?: string;
		},
		admin: AdminPayload
	) {
		const examDate = new Date(input.examDateIso);
		const code = newReportCode();
		const id = await this.reports.insert({
			code,
			fiscalCode: input.fiscalCode,
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			visitTypeId: input.visitTypeId,
			examDate,
			notes: input.notes?.trim() || null,
			status: 'pending'
		});
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'report.create',
			entityType: 'report',
			entityId: String(id),
			details: { code }
		});
		sendEmailStub('report_created', null, { code });
		return { id, code };
	}

	async setNotes(
		input: { id: number; notes?: string },
		admin: AdminPayload
	) {
		await this.reports.setNotes(input.id, input.notes?.trim() || null);
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'report.update_notes',
			entityType: 'report',
			entityId: String(input.id)
		});
		return { ok: true as const };
	}
}
