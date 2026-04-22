from __future__ import annotations

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

_ROME = ZoneInfo("Europe/Rome")

WINDOWS: list[tuple[int, int]] = [
    (9 * 60, 14 * 60),
    (16 * 60, 19 * 60),
]


def parse_day_only(iso_date: str) -> date:
    y, mo, d = (int(x) for x in iso_date.split("-"))
    return date(y, mo, d)


def _at_date_minutes(day: date, total_minutes: int) -> datetime:
    h, m = divmod(total_minutes, 60)
    return datetime(day.year, day.month, day.day, h, m, 0, 0, tzinfo=_ROME)


def list_slot_starts_for_day(day: date, slot_duration_minutes: int) -> list[datetime]:
    out: list[datetime] = []
    for start_min, end_min in WINDOWS:
        m = start_min
        while m + slot_duration_minutes <= end_min:
            out.append(_at_date_minutes(day, m))
            m += slot_duration_minutes
    return out


def to_iso_string_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=_ROME)
    utc = dt.astimezone(timezone.utc)
    ms = utc.microsecond // 1000
    s = utc.strftime("%Y-%m-%dT%H:%M:%S")
    return f"{s}.{ms:03d}Z"


def parse_slot_iso_to_naive_for_mysql(iso: str) -> datetime:
    s = iso.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        return dt
    rome = dt.astimezone(_ROME)
    return rome.replace(tzinfo=None)


def format_slot_from_db_to_iso(naive: datetime) -> str:
    rome_aware = datetime(
        naive.year,
        naive.month,
        naive.day,
        naive.hour,
        naive.minute,
        naive.second,
        naive.microsecond,
        tzinfo=_ROME,
    )
    return to_iso_string_utc(rome_aware)


def instant_ms_naive_rome(naive: datetime) -> float:
    return datetime(
        naive.year,
        naive.month,
        naive.day,
        naive.hour,
        naive.minute,
        naive.second,
        naive.microsecond,
        tzinfo=_ROME,
    ).timestamp() * 1000.0
