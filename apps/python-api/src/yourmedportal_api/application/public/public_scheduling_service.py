from __future__ import annotations

from datetime import datetime, timedelta

from yourmedportal_api.lib import calendar
from yourmedportal_api.lib.calendar import instant_ms_naive_rome, parse_day_only, to_iso_string_utc
from yourmedportal_api.infrastructure.repositories.booking_repository import BookingRepository
from yourmedportal_api.infrastructure.repositories.macro_area_repository import MacroAreaRepository
from yourmedportal_api.infrastructure.repositories.visit_type_repository import VisitTypeRepository
from yourmedportal_api.rest.http_error import HttpError


class PublicSchedulingService:
    def __init__(
        self,
        visit_types: VisitTypeRepository,
        macro_areas: MacroAreaRepository,
        bookings: BookingRepository,
    ) -> None:
        self._visit_types = visit_types
        self._macro_areas = macro_areas
        self._bookings = bookings

    def available_slots(self, visit_type_id: int, date: str) -> dict[str, list[str]]:
        v = self._visit_types.select_id_and_macro_area_id_by_id(visit_type_id)
        if not v:
            raise HttpError(404, "Tipologia non trovata")
        ma_rows = self._macro_areas.find_by_id(v[0][1])
        if not ma_rows:
            raise HttpError(404, "Macroarea non trovata")
        ma = ma_rows[0]
        day = parse_day_only(date)
        starts = calendar.list_slot_starts_for_day(day, ma.slot_duration_minutes)
        available: list[str] = []
        for slot_start_aware in starts:
            naive = slot_start_aware.replace(tzinfo=None)
            used = self._bookings.count_confirmed_at_macro_area_slot(ma.id, naive)
            if used < ma.parallel_slots:
                available.append(to_iso_string_utc(slot_start_aware))
        return {"slots": available}

    def week_availability(
        self,
        visit_type_id: int,
        week_start: str,
    ) -> dict[str, list[dict] | int]:
        v = self._visit_types.select_id_and_macro_area_id_by_id(visit_type_id)
        if not v:
            raise HttpError(404, "Tipologia non trovata")
        ma_rows = self._macro_areas.find_by_id(v[0][1])
        if not ma_rows:
            raise HttpError(404, "Macroarea non trovata")
        ma = ma_rows[0]

        week_start_day = parse_day_only(week_start)
        from_dt = datetime(week_start_day.year, week_start_day.month, week_start_day.day, 0, 0, 0, 0)
        end_day = from_dt + timedelta(days=6)
        to_dt = end_day.replace(hour=23, minute=59, second=59, microsecond=999000)

        usage = self._bookings.get_confirmed_counts_by_slot_in_range(ma.id, from_dt, to_dt)
        used_by_slot_ms: dict[float, int] = {}
        for row in usage:
            slot_naive, c = row[0], row[1]
            if isinstance(slot_naive, datetime):
                used_by_slot_ms[instant_ms_naive_rome(slot_naive)] = int(c)
            else:
                used_by_slot_ms[float(0)] = int(c)

        days: list[dict] = []
        for i in range(7):
            d = from_dt.date() + timedelta(days=i)
            starts = calendar.list_slot_starts_for_day(d, ma.slot_duration_minutes)
            y, mo, da = d.year, d.month, d.day
            date_str = f"{y}-{mo:02d}-{da:02d}"
            slots: list[dict] = []
            for slot_aware in starts:
                naive = slot_aware.replace(tzinfo=None)
                k = instant_ms_naive_rome(naive)
                used = used_by_slot_ms.get(k, 0)
                slots.append(
                    {
                        "startIso": to_iso_string_utc(slot_aware),
                        "available": used < ma.parallel_slots,
                    }
                )
            days.append({"date": date_str, "slots": slots})
        return {"days": days, "slotDurationMinutes": ma.slot_duration_minutes}
