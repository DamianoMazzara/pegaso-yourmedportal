from __future__ import annotations

from yourmedportal_api.application.support.activity_logger import ActivityLogger
from yourmedportal_api.application.support.auth_service import AdminPayload
from yourmedportal_api.infrastructure.repositories.macro_area_repository import MacroAreaRepository
from yourmedportal_api.rest.http_error import HttpError


class AdminMacroAreaService:
    def __init__(self, macro_areas: MacroAreaRepository, activity: ActivityLogger) -> None:
        self._macro = macro_areas
        self._activity = activity

    def list(self) -> list[dict]:
        return self._macro.list_all_order_by_name()

    def create(
        self, name: str, slot_duration_minutes: int, parallel_slots: int, admin: AdminPayload
    ) -> dict:
        new_id = self._macro.insert(
            name.strip(), slot_duration_minutes, parallel_slots
        )
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="macro_area.create",
            entity_type="macro_area",
            entity_id=str(new_id),
            details={"name": name},
        )
        return {"id": new_id}

    def update(
        self,
        id_: int,
        name: str,
        slot_duration_minutes: int,
        parallel_slots: int,
        admin: AdminPayload,
    ) -> dict:
        self._macro.update(
            id_, name.strip(), slot_duration_minutes, parallel_slots
        )
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="macro_area.update",
            entity_type="macro_area",
            entity_id=str(id_),
        )
        return {"ok": True}

    def delete(self, id_: int, admin: AdminPayload) -> dict:
        if self._macro.count_visit_types_by_macro_area_id(id_) > 0:
            raise HttpError(412, "Macroarea in uso da tipologie visita")
        self._macro.delete_by_id(id_)
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="macro_area.delete",
            entity_type="macro_area",
            entity_id=str(id_),
        )
        return {"ok": True}
