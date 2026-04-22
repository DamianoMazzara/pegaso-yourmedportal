from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

from yourmedportal_api.load_root_env import load_root_env


@lru_cache
def get_settings() -> "Settings":
    load_root_env()
    return Settings()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        extra="ignore",
    )

    DATABASE_URL: str = Field(default="")
    JWT_SECRET: str = Field(default="")
    API_PORT: int = Field(default=3001)
    PUBLIC_API_URL: str | None = Field(default=None)
    UPLOAD_DIR: str | None = Field(default=None)

    @computed_field
    @property
    def sqlalchemy_url(self) -> str:
        u = self.DATABASE_URL
        if u.startswith("mysql://"):
            return u.replace("mysql://", "mysql+pymysql://", 1)
        return u

    def resolve_upload_path(self) -> str:
        if self.UPLOAD_DIR:
            return self.UPLOAD_DIR
        return str(Path.cwd() / "uploads")

    def public_api_base(self) -> str:
        if self.PUBLIC_API_URL:
            return str(self.PUBLIC_API_URL).rstrip("/")
        return f"http://localhost:{self.API_PORT}"
