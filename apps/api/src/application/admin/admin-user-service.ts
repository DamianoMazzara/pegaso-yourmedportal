import bcrypt from 'bcryptjs';
import type { AdminPayload } from '../support/auth-service.js';
import type { ActivityLogger } from '../support/activity-logger.js';
import type { AdminUserRepository } from '../../infrastructure/repositories/admin-user-repository.js';
import { HttpError } from '../../rest/http-error.js';

export class AdminUserService {
	constructor(
		private readonly users: AdminUserRepository,
		private readonly activity: ActivityLogger
	) {}

	list() {
		return this.users.listOrderByEmail();
	}

	async create(
		input: { email: string; name: string; password: string },
		admin: AdminPayload
	) {
		const passwordHash = bcrypt.hashSync(input.password, 10);
		try {
			const id = await this.users.insert({
				email: input.email,
				name: input.name.trim(),
				passwordHash
			});
			await this.activity.log({
				adminUserId: Number(admin.sub),
				action: 'admin_user.create',
				entityType: 'admin_user',
				entityId: String(id)
			});
			return { id };
		} catch {
			throw new HttpError(409, 'Email già registrata');
		}
	}
}
