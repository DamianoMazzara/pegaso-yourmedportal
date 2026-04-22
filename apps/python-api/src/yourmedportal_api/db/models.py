from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, text
from sqlalchemy.dialects.mysql import ENUM
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

BookingEnum = ENUM("confirmed", "cancelled", name="bookings_status")
ReportEnum = ENUM("pending", "ready", name="reports_status")


class Base(DeclarativeBase):
    pass


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column("password_hash", String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        "created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class MacroArea(Base):
    __tablename__ = "macro_areas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slot_duration_minutes: Mapped[int] = mapped_column("slot_duration_minutes", Integer, nullable=False)
    parallel_slots: Mapped[int] = mapped_column(
        "parallel_slots", Integer, nullable=False, default=1, server_default=text("1")
    )
    created_at: Mapped[datetime] = mapped_column(
        "created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class VisitType(Base):
    __tablename__ = "visit_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    macro_area_id: Mapped[int] = mapped_column("macro_area_id", Integer, ForeignKey("macro_areas.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        "created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    fiscal_code: Mapped[str] = mapped_column("fiscal_code", String(16), nullable=False)
    first_name: Mapped[str] = mapped_column("first_name", String(128), nullable=False)
    last_name: Mapped[str] = mapped_column("last_name", String(128), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    address: Mapped[str] = mapped_column(String(512), nullable=False)
    phone: Mapped[str] = mapped_column(String(64), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    visit_type_id: Mapped[int] = mapped_column("visit_type_id", Integer, ForeignKey("visit_types.id"), nullable=False)
    slot_start: Mapped[datetime] = mapped_column("slot_start", DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
        BookingEnum,
        nullable=False,
        default="confirmed",
    )
    created_at: Mapped[datetime] = mapped_column(
        "created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    fiscal_code: Mapped[str] = mapped_column("fiscal_code", String(16), nullable=False)
    first_name: Mapped[str] = mapped_column("first_name", String(128), nullable=False)
    last_name: Mapped[str] = mapped_column("last_name", String(128), nullable=False)
    visit_type_id: Mapped[int] = mapped_column("visit_type_id", Integer, ForeignKey("visit_types.id"), nullable=False)
    exam_date: Mapped[datetime] = mapped_column("exam_date", DateTime, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(ReportEnum, nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        "created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class ReportAttachment(Base):
    __tablename__ = "report_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column("report_id", Integer, ForeignKey("reports.id"), nullable=False)
    original_name: Mapped[str] = mapped_column("original_name", String(512), nullable=False)
    stored_path: Mapped[str] = mapped_column("stored_path", String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column("mime_type", String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column("size_bytes", Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        "created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_user_id: Mapped[Optional[int]] = mapped_column("admin_user_id", Integer, ForeignKey("admin_users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    entity_type: Mapped[str] = mapped_column("entity_type", String(64), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column("entity_id", String(64), nullable=True)
    details: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "created_at", DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
