import type { AdminPayload } from '../support/auth-service.js';
import type { ActivityLogger } from '../support/activity-logger.js';
import type { VisitTypeRepository } from '../../infrastructure/repositories/visit-type-repository.js';
import { HttpError } from '../../rest/http-error.js';

export class AdminVisitTypeService {
	constructor(
		private readonly visitTypes: VisitTypeRepository,
		private readonly activity: ActivityLogger
	) {}

	list() {
		return this.visitTypes.listAdminWithMacroName();
	}

	async create(
		input: { name: string; description?: string; macroAreaId: number },
		admin: AdminPayload
	) {
		const id = await this.visitTypes.insert({
			name: input.name.trim(),
			description: input.description?.trim() || null,
			macroAreaId: input.macroAreaId
		});
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'visit_type.create',
			entityType: 'visit_type',
			entityId: String(id)
		});
		return { id };
	}

	async update(
		input: { id: number; name: string; description?: string; macroAreaId: number },
		admin: AdminPayload
	) {
		await this.visitTypes.update(input.id, {
			name: input.name.trim(),
			description: input.description?.trim() || null,
			macroAreaId: input.macroAreaId
		});
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'visit_type.update',
			entityType: 'visit_type',
			entityId: String(input.id)
		});
		return { ok: true as const };
	}

	async delete_(input: { id: number }, admin: AdminPayload) {
		const [bc, rc] = await Promise.all([
			this.visitTypes.countBookingsByVisitTypeId(input.id),
			this.visitTypes.countReportsByVisitTypeId(input.id)
		]);
		if (bc + rc > 0) {
			throw new HttpError(412, 'Tipologia collegata a prenotazioni o referti');
		}
		await this.visitTypes.deleteById(input.id);
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'visit_type.delete',
			entityType: 'visit_type',
			entityId: String(input.id)
		});
		return { ok: true as const };
	}
}
