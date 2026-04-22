from __future__ import annotations

from typing import Any

from yourmedportal_api.infrastructure.repositories.activity_log_repository import ActivityLogRepository


class ActivityLogger:
    def __init__(self, logs: ActivityLogRepository) -> None:
        self._logs = logs

    def log(
        self,
        *,
        admin_user_id: int | None,
        action: str,
        entity_type: str,
        entity_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self._logs.insert(
            admin_user_id=admin_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
