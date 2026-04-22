from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from yourmedportal_api.db.models import Report, ReportAttachment


class ReportAttachmentRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def find_by_id_with_report(self, id_: int) -> list[dict[str, str]]:
        q = (
            select(
                ReportAttachment.stored_path,
                ReportAttachment.mime_type,
                ReportAttachment.original_name,
                Report.fiscal_code,
                Report.code,
                Report.status,
            )
            .join(Report, ReportAttachment.report_id == Report.id)
            .where(ReportAttachment.id == id_)
        )
        rows = self._s.execute(q).all()
        return [
            {
                "storedPath": r[0],
                "mimeType": r[1],
                "originalName": r[2],
                "fiscalCode": r[3],
                "code": r[4],
                "status": r[5],
            }
            for r in rows
        ]

    def list_by_report_id(
        self, report_id: int
    ) -> list[dict[str, int | str]]:
        q = select(
            ReportAttachment.id,
            ReportAttachment.original_name,
            ReportAttachment.mime_type,
        ).where(ReportAttachment.report_id == report_id)
        return [{"id": r[0], "originalName": r[1], "mimeType": r[2]} for r in self._s.execute(q).all()]

    def count_by_report_id(self, report_id: int) -> int:
        q = select(func.count()).select_from(ReportAttachment).where(ReportAttachment.report_id == report_id)
        return int(self._s.scalar(q) or 0)

    def insert(
        self,
        report_id: int,
        original_name: str,
        stored_path: str,
        mime_type: str,
        size_bytes: int,
    ) -> int:
        a = ReportAttachment(
            report_id=report_id,
            original_name=original_name,
            stored_path=stored_path,
            mime_type=mime_type,
            size_bytes=size_bytes,
        )
        self._s.add(a)
        self._s.flush()
        return int(a.id)
