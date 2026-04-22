import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { join as pathJoin } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { sendEmailStub } from '../../lib/email.js';
import type { AdminPayload } from '../support/auth-service.js';
import type { ActivityLogger } from '../support/activity-logger.js';
import type { ReportAttachmentRepository } from '../../infrastructure/repositories/report-attachment-repository.js';
import type { ReportRepository } from '../../infrastructure/repositories/report-repository.js';
import { HttpError } from '../../rest/http-error.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export class AdminReportUploadService {
	constructor(
		private readonly reports: ReportRepository,
		private readonly attachments: ReportAttachmentRepository,
		private readonly activity: ActivityLogger,
		private readonly uploadDir: string
	) {}

	async getPublicAttachment(attachmentId: number, fiscalCode: string, reportCode: string) {
		const [att] = await this.attachments.findByIdWithReport(attachmentId);
		if (!att || att.status !== 'ready' || att.fiscalCode !== fiscalCode || att.code !== reportCode) {
			return { kind: 'not_found' as const };
		}
		try {
			const buf = await readFile(pathJoin(this.uploadDir, att.storedPath));
			return {
				kind: 'ok' as const,
				body: buf,
				mimeType: att.mimeType,
				originalName: att.originalName
			};
		} catch {
			return { kind: 'missing_file' as const };
		}
	}

	async uploadReportAttachment(
		reportId: number,
		file: File,
		admin: AdminPayload
	) {
		const [rep] = await this.reports.findById(reportId);
		if (!rep) {
			throw new HttpError(404, 'Referto non trovato');
		}
		const n = await this.attachments.countByReportId(reportId);
		if (n >= 5) {
			throw new HttpError(400, 'Massimo 5 allegati');
		}
		if (file.size > MAX_FILE_BYTES) {
			throw new HttpError(400, 'File troppo grande (max 10MB)');
		}
		const mimeType = file.type || 'application/octet-stream';
		if (!ALLOWED_MIME.has(mimeType)) {
			throw new HttpError(400, 'Formato non consentito (PDF, JPG, PNG)');
		}
		await mkdir(this.uploadDir, { recursive: true });
		const ext =
			mimeType === 'application/pdf'
				? 'pdf'
				: mimeType === 'image/jpeg'
					? 'jpg'
					: mimeType === 'image/png'
						? 'png'
						: 'bin';
		const storedName = `${reportId}-${randomUUID()}.${ext}`;
		const dest = pathJoin(this.uploadDir, storedName);
		await pipeline(file.stream(), createWriteStream(dest));
		await this.attachments.insert({
			reportId,
			originalName: file.name || `allegato.${ext}`,
			storedPath: storedName,
			mimeType,
			sizeBytes: file.size
		});
		const wasPending = rep.status === 'pending';
		if (wasPending) {
			await this.reports.setStatus(reportId, 'ready');
			const [updated] = await this.reports.findById(reportId);
			sendEmailStub('report_ready', null, { code: updated?.code });
		}
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'report.upload_attachment',
			entityType: 'report',
			entityId: String(reportId),
			details: { fileName: file.name, mimeType }
		});
	}
}
