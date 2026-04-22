from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from sqlalchemy import and_, asc, desc, func, select, update
from sqlalchemy.orm import Session

from yourmedportal_api.db.models import Booking, VisitType
from yourmedportal_api.lib.calendar import format_slot_from_db_to_iso


class BookingRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def count_all(self) -> int:
        q = select(func.count()).select_from(Booking)
        return int(self._s.scalar(q) or 0)

    def count_confirmed_from_date(self, from_date: datetime) -> int:
        q = select(func.count()).select_from(Booking).where(
            and_(Booking.status == "confirmed", Booking.slot_start >= from_date)
        )
        return int(self._s.scalar(q) or 0)

    def count_confirmed_at_macro_area_slot(
        self,
        macro_area_id: int,
        slot_start: datetime,
    ) -> int:
        q = (
            select(func.count())
            .select_from(Booking)
            .join(VisitType, Booking.visit_type_id == VisitType.id)
            .where(
                and_(
                    VisitType.macro_area_id == macro_area_id,
                    Booking.status == "confirmed",
                    Booking.slot_start == slot_start,
                )
            )
        )
        return int(self._s.scalar(q) or 0)

    def get_confirmed_counts_by_slot_in_range(
        self,
        macro_area_id: int,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[tuple[datetime, int]]:
        q = (
            select(Booking.slot_start, func.count())
            .select_from(Booking)
            .join(VisitType, Booking.visit_type_id == VisitType.id)
            .where(
                and_(
                    VisitType.macro_area_id == macro_area_id,
                    Booking.status == "confirmed",
                    Booking.slot_start >= from_dt,
                    Booking.slot_start <= to_dt,
                )
            )
            .group_by(Booking.slot_start)
        )
        return [(r[0], int(r[1])) for r in self._s.execute(q).all()]

    def insert(
        self,
        code: str,
        fiscal_code: str,
        first_name: str,
        last_name: str,
        age: int,
        address: str,
        phone: str,
        email: str | None,
        visit_type_id: int,
        slot_start: datetime,
        status: Literal["confirmed", "cancelled"],
    ) -> int:
        b = Booking(
            code=code,
            fiscal_code=fiscal_code,
            first_name=first_name,
            last_name=last_name,
            age=age,
            address=address,
            phone=phone,
            email=email,
            visit_type_id=visit_type_id,
            slot_start=slot_start,
            status=status,
        )
        self._s.add(b)
        self._s.flush()
        return int(b.id)

    def find_by_code_and_fiscal(self, code: str, fiscal_code: str) -> list[Booking]:
        return list(
            self._s.scalars(
                select(Booking).where(and_(Booking.code == code, Booking.fiscal_code == fiscal_code))
            )
        )

    def find_by_id(self, id_: int) -> list[Booking]:
        return list(self._s.scalars(select(Booking).where(Booking.id == id_)))

    def set_status(self, id_: int, status: Literal["confirmed", "cancelled"]) -> None:
        self._s.execute(update(Booking).where(Booking.id == id_).values(status=status))

    def update_patient(
        self,
        id_: int,
        first_name: str,
        last_name: str,
        fiscal_code: str,
        age: int,
        address: str,
        phone: str,
        email: str | None,
    ) -> None:
        self._s.execute(
            update(Booking)
            .where(Booking.id == id_)
            .values(
                first_name=first_name,
                last_name=last_name,
                fiscal_code=fiscal_code,
                age=age,
                address=address,
                phone=phone,
                email=email,
            )
        )

    @staticmethod
    def _parse_from_to_bounds(
        from_s: str | None,
        to_s: str | None,
    ) -> tuple[datetime | None, datetime | None]:
        from_dt: datetime | None = None
        to_dt: datetime | None = None
        if from_s:
            fs = from_s.strip()
            if len(fs) >= 10 and fs[4] == "-" and fs[7] == "-":
                y, mo, d = int(fs[0:4]), int(fs[5:7]), int(fs[8:10])
                from_dt = datetime(y, mo, d, 0, 0, 0, 0)
            else:
                from_dt = datetime.fromisoformat(fs.replace("Z", "+00:00"))
                if from_dt.tzinfo is not None:
                    from_dt = from_dt.replace(tzinfo=None)
        if to_s:
            ts = to_s.strip()
            if len(ts) >= 10 and ts[4] == "-" and ts[7] == "-":
                y, mo, d = int(ts[0:4]), int(ts[5:7]), int(ts[8:10])
                to_dt = datetime(y, mo, d, 23, 59, 59, 999000)
            else:
                t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if t.tzinfo is not None:
                    t = t.replace(tzinfo=None)
                to_dt = t.replace(hour=23, minute=59, second=59, microsecond=999000)
        return from_dt, to_dt

    def list_admin(
        self,
        status: str | None = None,
        from_: str | None = None,
        to: str | None = None,
        macro_area_id: int | None = None,
        order_asc: bool | None = None,
    ) -> list[dict[str, Any]]:
        q = select(
            Booking.id,
            Booking.code,
            Booking.fiscal_code,
            Booking.first_name,
            Booking.last_name,
            Booking.age,
            Booking.address,
            Booking.phone,
            Booking.email,
            Booking.slot_start,
            Booking.status,
            Booking.visit_type_id,
            VisitType.name,
        ).join(VisitType, Booking.visit_type_id == VisitType.id)
        conds: list[Any] = []
        if status and status != "all":
            conds.append(Booking.status == status)
        from_dt, to_dt = self._parse_from_to_bounds(from_, to)
        if from_dt is not None:
            conds.append(Booking.slot_start >= from_dt)
        if to_dt is not None:
            conds.append(Booking.slot_start <= to_dt)
        if macro_area_id is not None:
            conds.append(VisitType.macro_area_id == macro_area_id)
        if conds:
            q = q.where(and_(*conds))
        use_asc = bool(order_asc) if order_asc is not None else False
        q = q.order_by(asc(Booking.slot_start) if use_asc else desc(Booking.slot_start))
        rows = self._s.execute(q).all()
        out: list[dict[str, Any]] = []
        for r in rows:
            ss = r[9]
            slot_s = format_slot_from_db_to_iso(ss) if isinstance(ss, datetime) else str(ss)
            out.append(
                {
                    "id": r[0],
                    "code": r[1],
                    "fiscalCode": r[2],
                    "firstName": r[3],
                    "lastName": r[4],
                    "age": r[5],
                    "address": r[6],
                    "phone": r[7],
                    "email": r[8],
                    "slotStart": slot_s,
                    "status": r[10],
                    "visitTypeId": r[11],
                    "visitTypeName": r[12],
                }
            )
        return out
