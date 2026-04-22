from __future__ import annotations

import json
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from yourmedportal_api.db.models import ActivityLog, AdminUser


class ActivityLogRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def insert(
        self,
        admin_user_id: int | None,
        action: str,
        entity_type: str,
        entity_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        log = ActivityLog(
            admin_user_id=admin_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
        self._s.add(log)

    def list_with_admin_email(self, limit: int) -> list[dict[str, Any]]:
        q = (
            select(
                ActivityLog.id,
                ActivityLog.action,
                ActivityLog.entity_type,
                ActivityLog.entity_id,
                ActivityLog.details,
                ActivityLog.created_at,
                AdminUser.email,
            )
            .select_from(ActivityLog)
            .outerjoin(AdminUser, ActivityLog.admin_user_id == AdminUser.id)
            .order_by(desc(ActivityLog.created_at))
            .limit(limit)
        )
        rows = self._s.execute(q).all()
        out: list[dict[str, Any]] = []
        for r in rows:
            det = r[4]
            if det is not None and not isinstance(det, dict):
                if isinstance(det, str):
                    try:
                        det = json.loads(det)
                    except Exception:
                        det = None
            out.append(
                {
                    "id": r[0],
                    "action": r[1],
                    "entityType": r[2],
                    "entityId": r[3],
                    "details": det,
                    "createdAt": r[5],
                    "adminEmail": r[6],
                }
            )
        return out
