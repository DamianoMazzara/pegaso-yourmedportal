from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from sqlalchemy import and_, desc, func, select, update
from sqlalchemy.orm import Session

from yourmedportal_api.db.models import Report, VisitType
from yourmedportal_api.lib.calendar import format_slot_from_db_to_iso


class ReportRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def count_by_status(self, status: Literal["pending", "ready"]) -> int:
        q = select(func.count()).select_from(Report).where(Report.status == status)
        return int(self._s.scalar(q) or 0)

    def find_by_code_and_fiscal(self, code: str, fiscal_code: str) -> list[Report]:
        return list(
            self._s.scalars(
                select(Report).where(and_(Report.code == code, Report.fiscal_code == fiscal_code))
            )
        )

    def find_by_id(self, id_: int) -> list[Report]:
        return list(self._s.scalars(select(Report).where(Report.id == id_)))

    def list_admin_with_visit_type_name(self) -> list[dict[str, Any]]:
        rows = self._s.execute(
            select(
                Report.id,
                Report.code,
                Report.fiscal_code,
                Report.first_name,
                Report.last_name,
                Report.status,
                Report.exam_date,
                Report.notes,
                VisitType.name,
            )
            .join(VisitType, Report.visit_type_id == VisitType.id)
            .order_by(desc(Report.exam_date))
        ).all()
        out: list[dict[str, Any]] = []
        for r in rows:
            ex: datetime = r[6]
            ex_iso = format_slot_from_db_to_iso(ex) if isinstance(ex, datetime) else str(ex)
            out.append(
                {
                    "id": r[0],
                    "code": r[1],
                    "fiscalCode": r[2],
                    "firstName": r[3],
                    "lastName": r[4],
                    "status": r[5],
                    "examDate": ex_iso,
                    "notes": r[7],
                    "visitTypeName": r[8],
                }
            )
        return out

    def insert(
        self,
        code: str,
        fiscal_code: str,
        first_name: str,
        last_name: str,
        visit_type_id: int,
        exam_date: datetime,
        notes: str | None,
        status: Literal["pending", "ready"],
    ) -> int:
        rep = Report(
            code=code,
            fiscal_code=fiscal_code,
            first_name=first_name,
            last_name=last_name,
            visit_type_id=visit_type_id,
            exam_date=exam_date,
            notes=notes,
            status=status,
        )
        self._s.add(rep)
        self._s.flush()
        return int(rep.id)

    def set_notes(self, id_: int, notes: str | None) -> None:
        self._s.execute(update(Report).where(Report.id == id_).values(notes=notes))

    def set_status(self, id_: int, status: Literal["pending", "ready"]) -> None:
        self._s.execute(update(Report).where(Report.id == id_).values(status=status))
