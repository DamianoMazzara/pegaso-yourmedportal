from __future__ import annotations

from sqlalchemy.orm import Session

from yourmedportal_api.application.admin.admin_activity_service import AdminActivityService
from yourmedportal_api.application.admin.admin_auth_service import AdminAuthService
from yourmedportal_api.application.admin.admin_booking_service import AdminBookingService
from yourmedportal_api.application.admin.admin_macro_area_service import AdminMacroAreaService
from yourmedportal_api.application.admin.admin_report_service import AdminReportService
from yourmedportal_api.application.admin.admin_report_upload_service import AdminReportUploadService
from yourmedportal_api.application.admin.admin_user_service import AdminUserService
from yourmedportal_api.application.admin.admin_visit_type_service import AdminVisitTypeService
from yourmedportal_api.application.public.public_booking_service import PublicBookingService
from yourmedportal_api.application.public.public_catalog_service import PublicCatalogService
from yourmedportal_api.application.public.public_report_service import PublicReportService
from yourmedportal_api.application.public.public_scheduling_service import PublicSchedulingService
from yourmedportal_api.application.support.activity_logger import ActivityLogger
from yourmedportal_api.application.support.auth_service import AuthService
from yourmedportal_api.infrastructure.repositories.activity_log_repository import ActivityLogRepository
from yourmedportal_api.infrastructure.repositories.admin_user_repository import AdminUserRepository
from yourmedportal_api.infrastructure.repositories.booking_repository import BookingRepository
from yourmedportal_api.infrastructure.repositories.macro_area_repository import MacroAreaRepository
from yourmedportal_api.infrastructure.repositories.report_attachment_repository import ReportAttachmentRepository
from yourmedportal_api.infrastructure.repositories.report_repository import ReportRepository
from yourmedportal_api.infrastructure.repositories.visit_type_repository import VisitTypeRepository


class AppContainer:
    def __init__(self, session: Session, upload_dir: str) -> None:
        macro_areas = MacroAreaRepository(session)
        visit_types = VisitTypeRepository(session)
        bookings = BookingRepository(session)
        reports = ReportRepository(session)
        report_attachments = ReportAttachmentRepository(session)
        admin_users = AdminUserRepository(session)
        activity_logs = ActivityLogRepository(session)
        activity = ActivityLogger(activity_logs)
        auth = AuthService()

        self.auth = auth
        self.public_catalog = PublicCatalogService(macro_areas, visit_types)
        self.public_scheduling = PublicSchedulingService(visit_types, macro_areas, bookings)
        self.public_booking = PublicBookingService(visit_types, macro_areas, bookings)
        self.public_report = PublicReportService(reports, visit_types, report_attachments)
        self.admin_auth = AdminAuthService(admin_users, auth, activity, bookings, reports)
        self.admin_macro_area = AdminMacroAreaService(macro_areas, activity)
        self.admin_visit_type = AdminVisitTypeService(visit_types, activity)
        self.admin_booking = AdminBookingService(bookings, visit_types, macro_areas, activity)
        self.admin_report = AdminReportService(reports, activity)
        self.admin_activity = AdminActivityService(activity_logs)
        self.admin_user = AdminUserService(admin_users, activity)
        self.admin_report_upload = AdminReportUploadService(
            reports, report_attachments, activity, upload_dir
        )
