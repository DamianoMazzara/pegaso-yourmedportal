from __future__ import annotations

from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from yourmedportal_api.lib import cf as cf_lib


def validate_fiscal_code_value(v: str) -> str:
    n = cf_lib.normalize_fiscal_code(v)
    if not cf_lib.is_valid_fiscal_code_format(n):
        raise ValueError("Codice fiscale non valido")
    return n


class PublicBookingCreate(BaseModel):
    visitTypeId: int
    slotStartIso: str
    firstName: str = Field(min_length=1, max_length=128)
    lastName: str = Field(min_length=1, max_length=128)
    fiscalCode: str
    age: int = Field(ge=0, le=130)
    address: str = Field(min_length=1, max_length=512)
    phone: str = Field(min_length=1, max_length=64)
    email: str | None = None

    @field_validator("fiscalCode", mode="before")
    @classmethod
    def _cf(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise TypeError
        return validate_fiscal_code_value(v)


class PublicBookingCancel(BaseModel):
    fiscalCode: str
    code: str = Field(min_length=1)

    @field_validator("fiscalCode", mode="before")
    @classmethod
    def _cf(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise TypeError
        return validate_fiscal_code_value(v)


class AdminLoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class AdminMacroCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slotDurationMinutes: int = Field(ge=5, le=240)
    parallelSlots: int = Field(ge=1, le=50)


class AdminMacroPatch(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slotDurationMinutes: int = Field(ge=5, le=240)
    parallelSlots: int = Field(ge=1, le=50)


class AdminVisitTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    macroAreaId: int = Field(ge=1)


class AdminVisitTypePatch(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    macroAreaId: int = Field(ge=1)


class AdminBookingCreate(BaseModel):
    visitTypeId: int = Field(ge=1)
    slotStartIso: str
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)
    fiscalCode: str
    age: int = Field(ge=0, le=130)
    address: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    email: str | None = None

    @field_validator("fiscalCode", mode="before")
    @classmethod
    def _cf(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise TypeError
        return validate_fiscal_code_value(v)


class AdminBookingPatientPatch(BaseModel):
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)
    fiscalCode: str
    age: int = Field(ge=0, le=130)
    address: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    email: str | None = None

    @field_validator("fiscalCode", mode="before")
    @classmethod
    def _cf(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise TypeError
        return validate_fiscal_code_value(v)


class AdminReportCreate(BaseModel):
    fiscalCode: str
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)
    visitTypeId: int = Field(ge=1)
    examDateIso: str
    notes: str | None = None

    @field_validator("fiscalCode", mode="before")
    @classmethod
    def _cf(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise TypeError
        return validate_fiscal_code_value(v)


class AdminReportNotesPatch(BaseModel):
    notes: str | None = None


class AdminUserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1)
    password: str = Field(min_length=8)
