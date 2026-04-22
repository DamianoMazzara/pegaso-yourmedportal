from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from yourmedportal_api.db.models import AdminUser


class AdminUserRepository:
    def __init__(self, session: Session) -> None:
        self._s = session

    def find_by_email(self, email: str) -> list[AdminUser]:
        return list(self._s.scalars(select(AdminUser).where(AdminUser.email == email)))

    def find_by_id(self, id_: int) -> list[AdminUser]:
        return list(self._s.scalars(select(AdminUser).where(AdminUser.id == id_)))

    def list_order_by_email(self) -> list[dict[str, int | str]]:
        rows = self._s.scalars(select(AdminUser).order_by(AdminUser.email)).all()
        return [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "createdAt": u.created_at,
            }
            for u in rows
        ]

    def insert(self, email: str, name: str, password_hash: str) -> int:
        u = AdminUser(
            email=email,
            name=name,
            password_hash=password_hash,
        )
        self._s.add(u)
        self._s.flush()
        return int(u.id)
