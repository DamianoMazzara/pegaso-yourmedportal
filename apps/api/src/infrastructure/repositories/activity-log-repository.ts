import { desc, eq } from 'drizzle-orm';
import { activityLogs, adminUsers } from '../../db/schema.js';
import type { AppDb } from '../database/app-db.js';

export class ActivityLogRepository {
	constructor(private readonly db: AppDb) {}

	async insert(input: {
		adminUserId: number | null;
		action: string;
		entityType: string;
		entityId?: string | null;
		details?: Record<string, unknown> | null;
	}) {
		await this.db.insert(activityLogs).values({
			adminUserId: input.adminUserId,
			action: input.action,
			entityType: input.entityType,
			entityId: input.entityId ?? null,
			details: input.details ?? null
		});
	}

	listWithAdminEmail(limit: number) {
		return this.db
			.select({
				id: activityLogs.id,
				action: activityLogs.action,
				entityType: activityLogs.entityType,
				entityId: activityLogs.entityId,
				details: activityLogs.details,
				createdAt: activityLogs.createdAt,
				adminEmail: adminUsers.email
			})
			.from(activityLogs)
			.leftJoin(adminUsers, eq(activityLogs.adminUserId, adminUsers.id))
			.orderBy(desc(activityLogs.createdAt))
			.limit(limit);
	}
}
