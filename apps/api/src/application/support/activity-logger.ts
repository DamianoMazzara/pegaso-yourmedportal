import type { ActivityLogRepository } from '../../infrastructure/repositories/activity-log-repository.js';

export class ActivityLogger {
	constructor(private readonly logs: ActivityLogRepository) {}

	log(input: {
		adminUserId: number | null;
		action: string;
		entityType: string;
		entityId?: string | null;
		details?: Record<string, unknown> | null;
	}): Promise<void> {
		return this.logs.insert(input);
	}
}
