from __future__ import annotations

from yourmedportal_api.application.support.activity_logger import ActivityLogger
from yourmedportal_api.application.support.auth_service import AdminPayload
from yourmedportal_api.infrastructure.repositories.visit_type_repository import VisitTypeRepository
from yourmedportal_api.rest.http_error import HttpError


class AdminVisitTypeService:
    def __init__(self, visit_types: VisitTypeRepository, activity: ActivityLogger) -> None:
        self._vt = visit_types
        self._activity = activity

    def list(self) -> list[dict]:
        return self._vt.list_admin_with_macro_name()

    def create(
        self, name: str, description: str | None, macro_area_id: int, admin: AdminPayload
    ) -> dict:
        new_id = self._vt.insert(
            name.strip(), description.strip() if description and description.strip() else None, macro_area_id
        )
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="visit_type.create",
            entity_type="visit_type",
            entity_id=str(new_id),
        )
        return {"id": new_id}

    def update(
        self,
        id_: int,
        name: str,
        description: str | None,
        macro_area_id: int,
        admin: AdminPayload,
    ) -> dict:
        self._vt.update(
            id_,
            name.strip(),
            description.strip() if description and description.strip() else None,
            macro_area_id,
        )
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="visit_type.update",
            entity_type="visit_type",
            entity_id=str(id_),
        )
        return {"ok": True}

    def delete(self, id_: int, admin: AdminPayload) -> dict:
        bc = self._vt.count_bookings_by_visit_type_id(id_)
        rc = self._vt.count_reports_by_visit_type_id(id_)
        if bc + rc > 0:
            raise HttpError(412, "Tipologia collegata a prenotazioni o referti")
        self._vt.delete_by_id(id_)
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="visit_type.delete",
            entity_type="visit_type",
            entity_id=str(id_),
        )
        return {"ok": True}
