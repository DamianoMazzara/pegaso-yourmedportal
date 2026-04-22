from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_did = False


def load_root_env() -> None:
    global _did
    if _did:
        return
    here = Path(__file__).resolve()
    monorepo_root = here.parent.parent.parent.parent
    load_dotenv(monorepo_root / ".env")
    _did = True


def get_monorepo_root() -> Path:
    here = Path(__file__).resolve()
    return here.parent.parent.parent.parent
