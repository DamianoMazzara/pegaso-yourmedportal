from __future__ import annotations

from yourmedportal_api.infrastructure.repositories.macro_area_repository import MacroAreaRepository
from yourmedportal_api.infrastructure.repositories.visit_type_repository import VisitTypeRepository


class PublicCatalogService:
    def __init__(
        self,
        macro_areas: MacroAreaRepository,
        visit_types: VisitTypeRepository,
    ) -> None:
        self._macro_areas = macro_areas
        self._visit_types = visit_types

    def macro_areas_list(self) -> list[dict[str, int | str]]:
        return self._macro_areas.list_public_order_by_name()

    def visit_types_list(self) -> list[dict[str, int | str | None]]:
        return self._visit_types.list_public_order_by_name()
