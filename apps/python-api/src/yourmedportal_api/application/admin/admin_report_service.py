from __future__ import annotations

from datetime import datetime

from yourmedportal_api.lib.codes import new_report_code
from yourmedportal_api.lib.email import send_email_stub
from yourmedportal_api.lib.calendar import parse_slot_iso_to_naive_for_mysql
from yourmedportal_api.application.support.activity_logger import ActivityLogger
from yourmedportal_api.application.support.auth_service import AdminPayload
from yourmedportal_api.infrastructure.repositories.report_repository import ReportRepository


class AdminReportService:
    def __init__(self, reports: ReportRepository, activity: ActivityLogger) -> None:
        self._reports = reports
        self._activity = activity

    def list(self) -> list[dict]:
        return self._reports.list_admin_with_visit_type_name()

    def create(
        self,
        *,
        fiscal_code: str,
        first_name: str,
        last_name: str,
        visit_type_id: int,
        exam_date_iso: str,
        notes: str | None,
        admin: AdminPayload,
    ) -> dict:
        try:
            exam = parse_slot_iso_to_naive_for_mysql(exam_date_iso)
        except Exception:
            exam = datetime.fromisoformat(exam_date_iso.replace("Z", "+00:00"))
            if exam.tzinfo is not None:
                exam = exam.replace(tzinfo=None)
        code = new_report_code()
        new_id = self._reports.insert(
            code=code,
            fiscal_code=fiscal_code,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            visit_type_id=visit_type_id,
            exam_date=exam,
            notes=notes.strip() if notes and notes.strip() else None,
            status="pending",
        )
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="report.create",
            entity_type="report",
            entity_id=str(new_id),
            details={"code": code},
        )
        send_email_stub("report_created", None, {"code": code})
        return {"id": new_id, "code": code}

    def set_notes(
        self, id_: int, notes: str | None, admin: AdminPayload
    ) -> dict:
        self._reports.set_notes(id_, notes.strip() if notes and notes.strip() else None)
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="report.update_notes",
            entity_type="report",
            entity_id=str(id_),
        )
        return {"ok": True}
