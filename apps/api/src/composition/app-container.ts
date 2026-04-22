import { join as pathJoin } from 'node:path';
import { db } from '../db/index.js';
import { ActivityLogRepository } from '../infrastructure/repositories/activity-log-repository.js';
import { AdminUserRepository } from '../infrastructure/repositories/admin-user-repository.js';
import { BookingRepository } from '../infrastructure/repositories/booking-repository.js';
import { MacroAreaRepository } from '../infrastructure/repositories/macro-area-repository.js';
import { ReportAttachmentRepository } from '../infrastructure/repositories/report-attachment-repository.js';
import { ReportRepository } from '../infrastructure/repositories/report-repository.js';
import { VisitTypeRepository } from '../infrastructure/repositories/visit-type-repository.js';
import { AdminActivityService } from '../application/admin/admin-activity-service.js';
import { AdminAuthService } from '../application/admin/admin-auth-service.js';
import { AdminBookingService } from '../application/admin/admin-booking-service.js';
import { AdminMacroAreaService } from '../application/admin/admin-macro-area-service.js';
import { AdminReportService } from '../application/admin/admin-report-service.js';
import { AdminReportUploadService } from '../application/admin/admin-report-upload-service.js';
import { AdminUserService } from '../application/admin/admin-user-service.js';
import { AdminVisitTypeService } from '../application/admin/admin-visit-type-service.js';
import { PublicBookingService } from '../application/public/public-booking-service.js';
import { PublicCatalogService } from '../application/public/public-catalog-service.js';
import { PublicReportService } from '../application/public/public-report-service.js';
import { PublicSchedulingService } from '../application/public/public-scheduling-service.js';
import { ActivityLogger } from '../application/support/activity-logger.js';
import { AuthService } from '../application/support/auth-service.js';

export class AppContainer {
	readonly auth: AuthService;
	readonly publicCatalog: PublicCatalogService;
	readonly publicScheduling: PublicSchedulingService;
	readonly publicBooking: PublicBookingService;
	readonly publicReport: PublicReportService;
	readonly adminAuth: AdminAuthService;
	readonly adminMacroArea: AdminMacroAreaService;
	readonly adminVisitType: AdminVisitTypeService;
	readonly adminBooking: AdminBookingService;
	readonly adminReport: AdminReportService;
	readonly adminActivity: AdminActivityService;
	readonly adminUser: AdminUserService;
	readonly adminReportUpload: AdminReportUploadService;

	constructor(uploadDir: string) {
		const macroAreas = new MacroAreaRepository(db);
		const visitTypes = new VisitTypeRepository(db);
		const bookings = new BookingRepository(db);
		const reports = new ReportRepository(db);
		const reportAttachments = new ReportAttachmentRepository(db);
		const adminUsers = new AdminUserRepository(db);
		const activityLogs = new ActivityLogRepository(db);
		const activity = new ActivityLogger(activityLogs);
		const auth = new AuthService();

		this.auth = auth;
		this.publicCatalog = new PublicCatalogService(macroAreas, visitTypes);
		this.publicScheduling = new PublicSchedulingService(visitTypes, macroAreas, bookings);
		this.publicBooking = new PublicBookingService(visitTypes, macroAreas, bookings);
		this.publicReport = new PublicReportService(reports, visitTypes, reportAttachments);
		this.adminAuth = new AdminAuthService(adminUsers, auth, activity, bookings, reports);
		this.adminMacroArea = new AdminMacroAreaService(macroAreas, activity);
		this.adminVisitType = new AdminVisitTypeService(visitTypes, activity);
		this.adminBooking = new AdminBookingService(bookings, visitTypes, macroAreas, activity);
		this.adminReport = new AdminReportService(reports, activity);
		this.adminActivity = new AdminActivityService(activityLogs);
		this.adminUser = new AdminUserService(adminUsers, activity);
		this.adminReportUpload = new AdminReportUploadService(reports, reportAttachments, activity, uploadDir);
	}
}

export function createDefaultAppContainer() {
	return new AppContainer(pathJoin(process.cwd(), 'uploads'));
}
