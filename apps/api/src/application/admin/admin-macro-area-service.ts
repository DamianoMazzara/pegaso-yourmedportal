import type { AdminPayload } from '../support/auth-service.js';
import type { ActivityLogger } from '../support/activity-logger.js';
import type { MacroAreaRepository } from '../../infrastructure/repositories/macro-area-repository.js';
import { HttpError } from '../../rest/http-error.js';

export class AdminMacroAreaService {
	constructor(
		private readonly macroAreas: MacroAreaRepository,
		private readonly activity: ActivityLogger
	) {}

	list() {
		return this.macroAreas.listAllOrderByName();
	}

	async create(
		input: { name: string; slotDurationMinutes: number; parallelSlots: number },
		admin: AdminPayload
	) {
		const id = await this.macroAreas.insert({
			name: input.name.trim(),
			slotDurationMinutes: input.slotDurationMinutes,
			parallelSlots: input.parallelSlots
		});
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'macro_area.create',
			entityType: 'macro_area',
			entityId: String(id),
			details: { name: input.name }
		});
		return { id };
	}

	async update(
		input: { id: number; name: string; slotDurationMinutes: number; parallelSlots: number },
		admin: AdminPayload
	) {
		await this.macroAreas.update(input.id, {
			name: input.name.trim(),
			slotDurationMinutes: input.slotDurationMinutes,
			parallelSlots: input.parallelSlots
		});
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'macro_area.update',
			entityType: 'macro_area',
			entityId: String(input.id)
		});
		return { ok: true as const };
	}

	async delete_(input: { id: number }, admin: AdminPayload) {
		const used = await this.macroAreas.countVisitTypesByMacroAreaId(input.id);
		if (used > 0) {
			throw new HttpError(412, 'Macroarea in uso da tipologie visita');
		}
		await this.macroAreas.deleteById(input.id);
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'macro_area.delete',
			entityType: 'macro_area',
			entityId: String(input.id)
		});
		return { ok: true as const };
	}
}
