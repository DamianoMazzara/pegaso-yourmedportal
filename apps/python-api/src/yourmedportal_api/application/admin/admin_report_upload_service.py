from __future__ import annotations

import os
import uuid
from typing import Any, Literal, TypedDict

from yourmedportal_api.application.support.activity_logger import ActivityLogger
from yourmedportal_api.application.support.auth_service import AdminPayload
from yourmedportal_api.infrastructure.repositories.report_attachment_repository import ReportAttachmentRepository
from yourmedportal_api.infrastructure.repositories.report_repository import ReportRepository
from yourmedportal_api.lib.email import send_email_stub
from yourmedportal_api.rest.http_error import HttpError

MAX_FILE_BYTES = 10 * 1024 * 1024
ALLOWED_MIME = frozenset({"application/pdf", "image/jpeg", "image/png"})


class PublicAttachmentOk(TypedDict):
    kind: Literal["ok"]
    body: bytes
    mimeType: str
    originalName: str


class PublicAttachmentNotFound(TypedDict):
    kind: Literal["not_found"]


class PublicAttachmentMissingFile(TypedDict):
    kind: Literal["missing_file"]


PublicAttachmentResult = PublicAttachmentOk | PublicAttachmentNotFound | PublicAttachmentMissingFile


class AdminReportUploadService:
    def __init__(
        self,
        reports: ReportRepository,
        attachments: ReportAttachmentRepository,
        activity: ActivityLogger,
        upload_dir: str,
    ) -> None:
        self._reports = reports
        self._attachments = attachments
        self._activity = activity
        self._upload_dir = upload_dir

    def get_public_attachment(
        self, attachment_id: int, fiscal_code: str, report_code: str
    ) -> PublicAttachmentResult:
        rows = self._attachments.find_by_id_with_report(attachment_id)
        if not rows:
            return {"kind": "not_found"}
        r = rows[0]
        if r["status"] != "ready" or r["fiscalCode"] != fiscal_code or r["code"] != report_code:
            return {"kind": "not_found"}
        path = os.path.join(self._upload_dir, r["storedPath"])
        if not os.path.isfile(path):
            return {"kind": "missing_file"}
        with open(path, "rb") as f:
            body = f.read()
        return {
            "kind": "ok",
            "body": body,
            "mimeType": r["mimeType"],
            "originalName": r["originalName"],
        }

    def upload_report_attachment(
        self,
        report_id: int,
        file_bytes: bytes,
        file_name: str,
        content_type: str,
        admin: AdminPayload,
    ) -> None:
        rrows = self._reports.find_by_id(report_id)
        if not rrows:
            raise HttpError(404, "Referto non trovato")
        rep = rrows[0]
        n = self._attachments.count_by_report_id(report_id)
        if n >= 5:
            raise HttpError(400, "Massimo 5 allegati")
        if len(file_bytes) > MAX_FILE_BYTES:
            raise HttpError(400, "File troppo grande (max 10MB)")
        mime = (content_type or "application/octet-stream").split(";")[0].strip() or "application/octet-stream"
        if mime not in ALLOWED_MIME:
            raise HttpError(400, "Formato non consentito (PDF, JPG, PNG)")
        os.makedirs(self._upload_dir, exist_ok=True)
        ext = "pdf" if mime == "application/pdf" else "jpg" if mime == "image/jpeg" else "png"
        stored_name = f"{report_id}-{uuid.uuid4()!s}.{ext}"
        dest = os.path.join(self._upload_dir, stored_name)
        with open(dest, "wb") as w:
            w.write(file_bytes)
        self._attachments.insert(
            report_id=report_id,
            original_name=file_name or f"allegato.{ext}",
            stored_path=stored_name,
            mime_type=mime,
            size_bytes=len(file_bytes),
        )
        was_pending = rep.status == "pending"
        if was_pending:
            self._reports.set_status(report_id, "ready")
            urows = self._reports.find_by_id(report_id)
            code = urows[0].code if urows else None
            send_email_stub("report_ready", None, {"code": code})
        self._activity.log(
            admin_user_id=int(admin.sub),
            action="report.upload_attachment",
            entity_type="report",
            entity_id=str(report_id),
            details={"fileName": file_name, "mimeType": mime},
        )
