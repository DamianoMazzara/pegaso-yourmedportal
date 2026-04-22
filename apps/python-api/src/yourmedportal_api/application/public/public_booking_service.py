from __future__ import annotations

from yourmedportal_api.lib.codes import new_booking_code
from yourmedportal_api.lib.email import send_email_stub
from yourmedportal_api.lib.calendar import parse_slot_iso_to_naive_for_mysql
from yourmedportal_api.infrastructure.repositories.booking_repository import BookingRepository
from yourmedportal_api.infrastructure.repositories.macro_area_repository import MacroAreaRepository
from yourmedportal_api.infrastructure.repositories.visit_type_repository import VisitTypeRepository
from yourmedportal_api.rest.http_error import HttpError


class PublicBookingService:
    def __init__(
        self,
        visit_types: VisitTypeRepository,
        macro_areas: MacroAreaRepository,
        bookings: BookingRepository,
    ) -> None:
        self._visit_types = visit_types
        self._macro_areas = macro_areas
        self._bookings = bookings

    def create_booking(
        self,
        *,
        visit_type_id: int,
        slot_start_iso: str,
        first_name: str,
        last_name: str,
        fiscal_code: str,
        age: int,
        address: str,
        phone: str,
        email: str | None,
    ) -> dict[str, str]:
        from datetime import datetime

        try:
            slot_start = parse_slot_iso_to_naive_for_mysql(slot_start_iso)
        except Exception:
            raise HttpError(400, "Data/ora non valida")
        v = self._visit_types.select_id_and_macro_area_id_by_id(visit_type_id)
        if not v:
            raise HttpError(404, "Tipologia non trovata")
        ma_rows = self._macro_areas.find_by_id(v[0][1])
        if not ma_rows:
            raise HttpError(404, "Macroarea non trovata")
        ma = ma_rows[0]
        used = self._bookings.count_confirmed_at_macro_area_slot(ma.id, slot_start)
        if used >= ma.parallel_slots:
            raise HttpError(409, "Slot non più disponibile")
        code = new_booking_code()
        email_n = email.strip() if email and email.strip() else None
        self._bookings.insert(
            code=code,
            fiscal_code=fiscal_code,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            age=age,
            address=address.strip(),
            phone=phone.strip(),
            email=email_n,
            visit_type_id=visit_type_id,
            slot_start=slot_start,
            status="confirmed",
        )
        send_email_stub("booking_confirmed", email_n, {"code": code, "slot": slot_start.isoformat()})
        return {"code": code}

    def cancel_booking(self, fiscal_code: str, code: str) -> dict[str, bool]:
        normalized = code.strip().upper()
        rows = self._bookings.find_by_code_and_fiscal(normalized, fiscal_code)
        if not rows:
            raise HttpError(404, "Prenotazione non trovata")
        b = rows[0]
        if b.status == "cancelled":
            return {"ok": True}
        self._bookings.set_status(b.id, "cancelled")
        send_email_stub("booking_cancelled", b.email, {"code": b.code})
        return {"ok": True}
