import { eq } from 'drizzle-orm';
import { adminUsers } from '../../db/schema.js';
import type { AppDb } from '../database/app-db.js';

export class AdminUserRepository {
	constructor(private readonly db: AppDb) {}

	findByEmail(email: string) {
		return this.db.select().from(adminUsers).where(eq(adminUsers.email, email));
	}

	findById(id: number) {
		return this.db.select().from(adminUsers).where(eq(adminUsers.id, id));
	}

	listOrderByEmail() {
		return this.db
			.select({
				id: adminUsers.id,
				email: adminUsers.email,
				name: adminUsers.name,
				createdAt: adminUsers.createdAt
			})
			.from(adminUsers)
			.orderBy(adminUsers.email);
	}

	async insert(values: { email: string; name: string; passwordHash: string }) {
		const [res] = await this.db.insert(adminUsers).values(values);
		return res.insertId;
	}
}
