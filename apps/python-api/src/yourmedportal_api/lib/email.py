from __future__ import annotations

import logging
from typing import Any, Literal

EmailKind = Literal[
    "booking_confirmed",
    "booking_cancelled",
    "report_created",
    "report_ready",
]

log = logging.getLogger(__name__)


def send_email_stub(
    kind: EmailKind,
    to: str | None,
    payload: dict[str, Any],
) -> None:
    if not to:
        return
    log.info("[email:%s] to=%s %s", kind, to, payload)
