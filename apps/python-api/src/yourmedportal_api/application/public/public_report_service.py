from __future__ import annotations

from urllib.parse import quote

from yourmedportal_api.config import get_settings
from yourmedportal_api.lib.calendar import format_slot_from_db_to_iso
from yourmedportal_api.infrastructure.repositories.report_attachment_repository import ReportAttachmentRepository
from yourmedportal_api.infrastructure.repositories.report_repository import ReportRepository
from yourmedportal_api.infrastructure.repositories.visit_type_repository import VisitTypeRepository
from yourmedportal_api.rest.http_error import HttpError


class PublicReportService:
    def __init__(
        self,
        reports: ReportRepository,
        visit_types: VisitTypeRepository,
        attachments: ReportAttachmentRepository,
    ) -> None:
        self._reports = reports
        self._visit_types = visit_types
        self._attachments = attachments

    def get_report(self, fiscal_code: str, code: str) -> dict:
        normalized = code.strip().upper()
        rows = self._reports.find_by_code_and_fiscal(normalized, fiscal_code)
        if not rows:
            raise HttpError(404, "Referto non trovato")
        r = rows[0]
        vt_names = self._visit_types.select_name_by_id(r.visit_type_id)
        vtname = vt_names[0] if vt_names else "—"
        files = self._attachments.list_by_report_id(r.id) if r.status == "ready" else []
        base = get_settings().public_api_base()
        ex = r.exam_date
        exam_iso = format_slot_from_db_to_iso(ex) if hasattr(ex, "year") else str(ex)
        return {
            "status": r.status,
            "code": r.code,
            "examDate": exam_iso,
            "visitTypeName": vtname,
            "firstName": r.first_name,
            "lastName": r.last_name,
            "notes": r.notes,
            "attachments": [
                {
                    "id": f["id"],
                    "name": f["originalName"],
                    "mimeType": f["mimeType"],
                    "downloadUrl": (
                        f"{base}/public/attachments/{f['id']}"
                        f"?fiscalCode={quote(fiscal_code)}&reportCode={quote(normalized)}"
                    ),
                }
                for f in files
            ],
        }
