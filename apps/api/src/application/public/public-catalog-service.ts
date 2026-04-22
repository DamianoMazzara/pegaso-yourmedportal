import type { MacroAreaRepository } from '../../infrastructure/repositories/macro-area-repository.js';
import type { VisitTypeRepository } from '../../infrastructure/repositories/visit-type-repository.js';

export class PublicCatalogService {
	constructor(
		private readonly macroAreas: MacroAreaRepository,
		private readonly visitTypes: VisitTypeRepository
	) {}

	macroAreasList() {
		return this.macroAreas.listPublicOrderByName();
	}

	visitTypesList() {
		return this.visitTypes.listPublicOrderByName();
	}
}
