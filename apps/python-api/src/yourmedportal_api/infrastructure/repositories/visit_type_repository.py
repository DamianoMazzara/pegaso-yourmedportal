from __future__ import annotations

from sqlalchemy import asc, delete, func, select, update
from sqlalchemy.orm import Session

from yourmedportal_api.db.models import Booking, MacroArea, Report, VisitType


class VisitTypeRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def list_public_order_by_name(self) -> list[dict[str, int | str | None]]:
        rows = self._s.scalars(select(VisitType).order_by(asc(VisitType.name))).all()
        return [
            {
                "id": v.id,
                "name": v.name,
                "description": v.description,
                "macroAreaId": v.macro_area_id,
            }
            for v in rows
        ]

    def select_id_and_macro_area_id_by_id(self, visit_type_id: int) -> list[tuple[int, int]]:
        row = self._s.execute(
            select(VisitType.id, VisitType.macro_area_id).where(VisitType.id == visit_type_id)
        ).first()
        return [(int(row[0]), int(row[1]))] if row else []

    def list_admin_with_macro_name(self) -> list[dict[str, int | str | None]]:
        rows = self._s.execute(
            select(
                VisitType.id,
                VisitType.name,
                VisitType.description,
                VisitType.macro_area_id,
                MacroArea.name,
            )
            .join(MacroArea, VisitType.macro_area_id == MacroArea.id)
            .order_by(asc(VisitType.name))
        ).all()
        return [
            {
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "macroAreaId": r[3],
                "macroAreaName": r[4],
            }
            for r in rows
        ]

    def insert(self, name: str, description: str | None, macro_area_id: int) -> int:
        v = VisitType(
            name=name,
            description=description,
            macro_area_id=macro_area_id,
        )
        self._s.add(v)
        self._s.flush()
        return int(v.id)

    def update(
        self,
        id_: int,
        name: str,
        description: str | None,
        macro_area_id: int,
    ) -> None:
        self._s.execute(
            update(VisitType)
            .where(VisitType.id == id_)
            .values(name=name, description=description, macro_area_id=macro_area_id)
        )

    def delete_by_id(self, id_: int) -> None:
        self._s.execute(delete(VisitType).where(VisitType.id == id_))

    def count_bookings_by_visit_type_id(self, visit_type_id: int) -> int:
        q = select(func.count()).select_from(Booking).where(Booking.visit_type_id == visit_type_id)
        return int(self._s.scalar(q) or 0)

    def count_reports_by_visit_type_id(self, visit_type_id: int) -> int:
        q = select(func.count()).select_from(Report).where(Report.visit_type_id == visit_type_id)
        return int(self._s.scalar(q) or 0)

    def select_name_by_id(self, visit_type_id: int) -> list[str]:
        row = self._s.execute(select(VisitType.name).where(VisitType.id == visit_type_id)).first()
        return [str(row[0])] if row else []
