import re

CF_RE = re.compile(r"^[A-Z0-9]{16}$", re.IGNORECASE)


def normalize_fiscal_code(cf: str) -> str:
    return cf.strip().upper().replace(" ", "")


def is_valid_fiscal_code_format(cf: str) -> bool:
    n = normalize_fiscal_code(cf)
    return bool(CF_RE.match(n))
