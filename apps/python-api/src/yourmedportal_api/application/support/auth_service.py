from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import jwt

from yourmedportal_api.config import get_settings


@dataclass
class AdminPayload:
    sub: str
    email: str
    name: str


class AuthService:
    def sign_admin_token(self, user_id: int, email: str, name: str) -> str:
        s = get_settings()
        if not s.JWT_SECRET or len(s.JWT_SECRET) < 16:
            raise RuntimeError("JWT_SECRET must be set (min 16 chars)")
        now = int(time.time())
        payload: dict[str, Any] = {
            "sub": str(user_id),
            "email": email,
            "name": name,
            "iat": now,
            "exp": now + 7 * 24 * 3600,
        }
        token = jwt.encode(payload, s.JWT_SECRET, algorithm="HS256")
        if isinstance(token, bytes):
            return token.decode("ascii")
        return str(token)

    def verify_admin_token(self, token: str | None) -> AdminPayload | None:
        if not token:
            return None
        s = get_settings()
        if not s.JWT_SECRET:
            return None
        try:
            decoded = jwt.decode(token, s.JWT_SECRET, algorithms=["HS256"])
            sub = decoded.get("sub")
            email = decoded.get("email")
            name = decoded.get("name")
            if not isinstance(sub, str) or not isinstance(email, str) or not isinstance(name, str):
                return None
            return AdminPayload(sub=sub, email=email, name=name)
        except Exception:
            return None
