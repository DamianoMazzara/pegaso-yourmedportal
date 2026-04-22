from __future__ import annotations

from yourmedportal_api.lib.codes import new_booking_code
from yourmedportal_api.lib.email import send_email_stub
from yourmedportal_api.lib.calendar import parse_slot_iso_to_naive_for_mysql
from yourmedportal_api.application.support.activity_logger import ActivityLogger
from yourmedportal_api.application.support.auth_service import AdminPayload
from yourmedportal_api.infrastructure.repositories.booking_repository import BookingRepository
from yourmedportal_api.infrastructure.repositories.macro_area_repository import MacroAreaRepository
from yourmedportal_api.infrastructure.repositories.visit_type_repository import VisitTypeRepository
from yourmedportal_api.rest.http_error import HttpError


class AdminBookingService:
    def __init__(
        self,
        bookings: BookingRepository,
        visit_types: VisitTypeRepository,
        macro_areas: MacroAreaRepository,
        activity: ActivityLogger,
    ) -> None:
        self._bookings = bookings
        self._visit_types = visit_types
        self._macro = macro_areas
        self._activity = activity

    def list(
        self,
        *,
        status: str | None = None,
        from_: str | None = None,
        to: str | None = None,
        macro_area_id: int | None = None,
        order_asc: bool | None = None,
    ) -> list[dict]:
        return self._bookings.list_admin(
            status, from_, to, macro_area_id, order_asc
        )

    def create(
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
        admin: AdminPayload,
    ) -> dict:
        try:
            slot_start = parse_slot_iso_to_naive_for_mysql(slot_start_iso)
        except Exception:
            raise HttpError(400, "Data/ora non valida")
        v = self._visit_types.select_id_and_macro_area_id_by_id(visit_type_id)
        if not v:
            raise HttpError(404, "Tipologia non trovata")
        ma_rows = self._macro.find_by_id(v[0][1])
        if not ma_rows:
            raise HttpError(404, "Macroarea non trovata")
        ma = ma_rows[0]
        if self._bookings.count_confirmed_at_macro_area_slot(ma.id, slot_start) >= ma.parallel_slots:
            raise HttpError(409, "Slot pieno")
        code = new_booking_code()
        email_n = email.strip() if email and email.strip() else None
        bid = self._bookings.insert(
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
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="booking.create",
            entity_type="booking",
            entity_id=str(bid),
            details={"code": code},
        )
        send_email_stub("booking_confirmed", email_n, {"code": code})
        return {"id": bid, "code": code}

    def cancel(self, id_: int, admin: AdminPayload) -> dict:
        rows = self._bookings.find_by_id(id_)
        if not rows:
            raise HttpError(404, "Prenotazione non trovata")
        b = rows[0]
        self._bookings.set_status(id_, "cancelled")
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="booking.cancel",
            entity_type="booking",
            entity_id=str(id_),
        )
        send_email_stub("booking_cancelled", b.email, {"code": b.code})
        return {"ok": True}

    def update_patient(
        self,
        *,
        id_: int,
        first_name: str,
        last_name: str,
        fiscal_code: str,
        age: int,
        address: str,
        phone: str,
        email: str | None,
        admin: AdminPayload,
    ) -> dict:
        email_n = email.strip() if email and email.strip() else None
        self._bookings.update_patient(
            id_, first_name.strip(), last_name.strip(), fiscal_code, age, address.strip(), phone.strip(), email_n
        )
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="booking.update_patient",
            entity_type="booking",
            entity_id=str(id_),
        )
        return {"ok": True}
