from __future__ import annotations

from sqlalchemy import asc, delete, func, select, update
from sqlalchemy.orm import Session

from yourmedportal_api.db.models import MacroArea, VisitType


class MacroAreaRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def list_public_order_by_name(self) -> list[dict[str, int | str]]:
        rows = self._s.execute(
            select(MacroArea.id, MacroArea.name).order_by(asc(MacroArea.name))
        ).all()
        return [{"id": r[0], "name": r[1]} for r in rows]

    def find_by_id(self, id_: int) -> list[MacroArea]:
        return list(self._s.scalars(select(MacroArea).where(MacroArea.id == id_)))

    def list_all_order_by_name(self) -> list[dict[str, int | str]]:
        rows = self._s.scalars(select(MacroArea).order_by(MacroArea.name)).all()
        return [self._row_to_dict(m) for m in rows]

    @staticmethod
    def _row_to_dict(m: MacroArea) -> dict[str, int | str]:
        return {
            "id": m.id,
            "name": m.name,
            "slotDurationMinutes": m.slot_duration_minutes,
            "parallelSlots": m.parallel_slots,
            "createdAt": m.created_at,
        }

    def insert(self, name: str, slot_duration_minutes: int, parallel_slots: int) -> int:
        m = MacroArea(
            name=name,
            slot_duration_minutes=slot_duration_minutes,
            parallel_slots=parallel_slots,
        )
        self._s.add(m)
        self._s.flush()
        return int(m.id)

    def update(
        self,
        id_: int,
        name: str,
        slot_duration_minutes: int,
        parallel_slots: int,
    ) -> None:
        self._s.execute(
            update(MacroArea)
            .where(MacroArea.id == id_)
            .values(
                name=name,
                slot_duration_minutes=slot_duration_minutes,
                parallel_slots=parallel_slots,
            )
        )

    def delete_by_id(self, id_: int) -> None:
        self._s.execute(delete(MacroArea).where(MacroArea.id == id_))

    def count_visit_types_by_macro_area_id(self, macro_area_id: int) -> int:
        q = select(func.count()).select_from(VisitType).where(VisitType.macro_area_id == macro_area_id)
        return int(self._s.scalar(q) or 0)
