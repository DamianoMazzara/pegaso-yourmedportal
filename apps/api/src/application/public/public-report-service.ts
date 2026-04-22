import type { ReportAttachmentRepository } from '../../infrastructure/repositories/report-attachment-repository.js';
import type { ReportRepository } from '../../infrastructure/repositories/report-repository.js';
import type { VisitTypeRepository } from '../../infrastructure/repositories/visit-type-repository.js';
import { HttpError } from '../../rest/http-error.js';

export class PublicReportService {
	constructor(
		private readonly reports: ReportRepository,
		private readonly visitTypes: VisitTypeRepository,
		private readonly attachments: ReportAttachmentRepository
	) {}

	private get publicApiBase() {
		return process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.API_PORT ?? '3001'}`;
	}

	async getReport(input: { fiscalCode: string; code: string }) {
		const normalizedCode = input.code.trim().toUpperCase();
		const [r] = await this.reports.findByCodeAndFiscal(normalizedCode, input.fiscalCode);
		if (!r) {
			throw new HttpError(404, 'Referto non trovato');
		}
		const [vt] = await this.visitTypes.selectNameById(r.visitTypeId);
		const files =
			r.status === 'ready' ? await this.attachments.listByReportId(r.id) : [];
		const base = this.publicApiBase;
		return {
			status: r.status,
			code: r.code,
			examDate: r.examDate.toISOString(),
			visitTypeName: vt?.name ?? '—',
			firstName: r.firstName,
			lastName: r.lastName,
			notes: r.notes,
			attachments: files.map((f) => ({
				id: f.id,
				name: f.originalName,
				mimeType: f.mimeType,
				downloadUrl: `${base}/public/attachments/${f.id}?fiscalCode=${encodeURIComponent(input.fiscalCode)}&reportCode=${encodeURIComponent(normalizedCode)}`
			}))
		};
	}
}
