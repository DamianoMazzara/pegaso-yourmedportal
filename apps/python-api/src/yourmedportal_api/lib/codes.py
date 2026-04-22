import secrets

_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def _suffix() -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(5))


def new_booking_code() -> str:
    return f"PN-{_suffix()}"


def new_report_code() -> str:
    return f"RF-{_suffix()}"
