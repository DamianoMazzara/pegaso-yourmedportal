from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from yourmedportal_api.config import get_settings

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        s = get_settings()
        if not s.DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set in environment")
        _engine = create_engine(
            s.sqlalchemy_url,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(), expire_on_commit=False, autoflush=False
        )
    return _session_factory


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    fac = get_session_factory()
    session = fac()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    fac = get_session_factory()
    session = fac()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
