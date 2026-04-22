import bcrypt from 'bcryptjs';
import type { AdminPayload } from '../support/auth-service.js';
import type { AuthService } from '../support/auth-service.js';
import type { ActivityLogger } from '../support/activity-logger.js';
import type { AdminUserRepository } from '../../infrastructure/repositories/admin-user-repository.js';
import type { BookingRepository } from '../../infrastructure/repositories/booking-repository.js';
import type { ReportRepository } from '../../infrastructure/repositories/report-repository.js';
import { HttpError } from '../../rest/http-error.js';

export class AdminAuthService {
	constructor(
		private readonly users: AdminUserRepository,
		private readonly auth: AuthService,
		private readonly activity: ActivityLogger,
		private readonly bookings: BookingRepository,
		private readonly reports: ReportRepository
	) {}

	async login(input: { email: string; password: string }, req: Pick<Request, 'headers'>) {
		const [user] = await this.users.findByEmail(input.email);
		if (!user || !bcrypt.compareSync(input.password, user.passwordHash)) {
			throw new HttpError(401, 'Credenziali non valide');
		}
		const token = await this.auth.signAdminToken(user);
		await this.activity.log({
			adminUserId: user.id,
			action: 'admin.login',
			entityType: 'admin_user',
			entityId: String(user.id),
			details: { ip: req.headers.get('x-forwarded-for') }
		});
		return { token, user: { id: user.id, email: user.email, name: user.name } };
	}

	async me(admin: AdminPayload) {
		const id = Number(admin.sub);
		const [user] = await this.users.findById(id);
		if (!user) {
			throw new HttpError(401, 'Non autorizzato');
		}
		return { id: user.id, email: user.email, name: user.name };
	}

	async stats() {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const [bookingsTotal, bookingsTodayConfirmed, reportsPending, reportsReady] = await Promise.all([
			this.bookings.countAll(),
			this.bookings.countConfirmedFromDate(today),
			this.reports.countByStatus('pending'),
			this.reports.countByStatus('ready')
		]);
		return {
			bookingsTotal,
			bookingsTodayConfirmed,
			reportsPending,
			reportsReady
		};
	}
}
