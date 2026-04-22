import type { ActivityLogRepository } from '../../infrastructure/repositories/activity-log-repository.js';

export class AdminActivityService {
	constructor(private readonly activityLogs: ActivityLogRepository) {}

	async list(input: { limit?: number } | undefined) {
		const limit = input?.limit ?? 100;
		const rows = await this.activityLogs.listWithAdminEmail(limit);
		return rows.map((r) => ({
			...r,
			createdAt: r.createdAt.toISOString()
		}));
	}
}
