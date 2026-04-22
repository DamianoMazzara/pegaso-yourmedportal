from __future__ import annotations

import bcrypt
from sqlalchemy.exc import IntegrityError

from yourmedportal_api.application.support.activity_logger import ActivityLogger
from yourmedportal_api.application.support.auth_service import AdminPayload
from yourmedportal_api.infrastructure.repositories.admin_user_repository import AdminUserRepository
from yourmedportal_api.rest.http_error import HttpError


class AdminUserService:
    def __init__(self, users: AdminUserRepository, activity: ActivityLogger) -> None:
        self._users = users
        self._activity = activity

    def list(self) -> list[dict]:
        return self._users.list_order_by_email()

    def create(
        self, email: str, name: str, password: str, admin: AdminPayload
    ) -> dict:
        salt = bcrypt.gensalt(rounds=10)
        password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("ascii")
        try:
            new_id = self._users.insert(email, name.strip(), password_hash)
        except IntegrityError:
            raise HttpError(409, "Email già registrata")
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="admin_user.create",
            entity_type="admin_user",
            entity_id=str(new_id),
        )
        return {"id": new_id}
