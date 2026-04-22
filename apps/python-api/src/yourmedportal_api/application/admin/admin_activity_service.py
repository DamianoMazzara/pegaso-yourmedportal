from __future__ import annotations

from datetime import datetime

from yourmedportal_api.infrastructure.repositories.activity_log_repository import ActivityLogRepository
from yourmedportal_api.lib.calendar import format_slot_from_db_to_iso


class AdminActivityService:
    def __init__(self, activity_logs: ActivityLogRepository) -> None:
        self._logs = activity_logs

    def list(self, limit: int | None) -> list[dict]:
        lim = limit if limit is not None else 100
        rows = self._logs.list_with_admin_email(lim)
        for r in rows:
            if isinstance(r.get("createdAt"), datetime):
                r["createdAt"] = format_slot_from_db_to_iso(r["createdAt"])
        return rows
