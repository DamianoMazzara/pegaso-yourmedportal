from __future__ import annotations

import bcrypt
from yourmedportal_api.application.support.activity_logger import ActivityLogger
from yourmedportal_api.application.support.auth_service import AdminPayload, AuthService
from yourmedportal_api.infrastructure.repositories.admin_user_repository import AdminUserRepository
from yourmedportal_api.infrastructure.repositories.booking_repository import BookingRepository
from yourmedportal_api.infrastructure.repositories.report_repository import ReportRepository
from yourmedportal_api.rest.http_error import HttpError


class AdminAuthService:
    def __init__(
        self,
        users: AdminUserRepository,
        auth: AuthService,
        activity: ActivityLogger,
        bookings: BookingRepository,
        reports: ReportRepository,
    ) -> None:
        self._users = users
        self._auth = auth
        self._activity = activity
        self._bookings = bookings
        self._reports = reports

    def login(self, email: str, password: str, x_forwarded_for: str | None) -> dict:
        rows = self._users.find_by_email(email)
        user = rows[0] if rows else None
        if not user or not bcrypt.checkpw(
            password.encode("utf-8"), user.password_hash.encode("utf-8")
        ):
            raise HttpError(401, "Credenziali non valide")
        token = self._auth.sign_admin_token(user.id, user.email, user.name)
        self._activity.log(
            admin_user_id=user.id,
            action="admin.login",
            entity_type="admin_user",
            entity_id=str(user.id),
            details={"ip": x_forwarded_for},
        )
        return {
            "token": token,
            "user": {"id": user.id, "email": user.email, "name": user.name},
        }

    def me(self, admin: AdminPayload) -> dict:
        uid = int(admin.sub)
        rows = self._users.find_by_id(uid)
        if not rows:
            raise HttpError(401, "Non autorizzato")
        u = rows[0]
        return {"id": u.id, "email": u.email, "name": u.name}

    def stats(self) -> dict:
        from datetime import datetime

        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return {
            "bookingsTotal": self._bookings.count_all(),
            "bookingsTodayConfirmed": self._bookings.count_confirmed_from_date(today),
            "reportsPending": self._reports.count_by_status("pending"),
            "reportsReady": self._reports.count_by_status("ready"),
        }
