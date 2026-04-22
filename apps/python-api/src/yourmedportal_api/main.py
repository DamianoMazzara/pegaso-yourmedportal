from __future__ import annotations

import logging
import urllib.parse
from typing import Any

from fastapi import Body, Depends, FastAPI, File, Header, Path, Query, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session

from yourmedportal_api.application.support.auth_service import AdminPayload
from yourmedportal_api.composition.app_container import AppContainer
from yourmedportal_api.config import get_settings
from yourmedportal_api.db.session import get_db
from yourmedportal_api.http import schemas
from yourmedportal_api.load_root_env import load_root_env
from yourmedportal_api.rest.http_error import HttpError
from yourmedportal_api.lib import cf as cf_lib

load_root_env()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yourmedportal_api")


def get_container(db: Session = Depends(get_db)) -> AppContainer:
    return AppContainer(db, get_settings().resolve_upload_path())


def _bearer(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization[7:].strip() or None


async def get_admin(
    c: AppContainer = Depends(get_container),
    authorization: str | None = Header(None, alias="Authorization"),
) -> AdminPayload:
    token = _bearer(authorization)
    admin = c.auth.verify_admin_token(token)
    if not admin:
        raise HttpError(401, "Unauthorized")
    return admin


def validate_cf_query(s: str) -> str:
    n = cf_lib.normalize_fiscal_code(s)
    if not cf_lib.is_valid_fiscal_code_format(n):
        raise ValueError
    return n


def create_app() -> FastAPI:
    application = FastAPI(
        title="YourMedPortal API",
        version="1.0.0",
        docs_url=None,
        redoc_url=None,
        description="REST JSON sotto /api, file su /public/attachments e /upload, admin con JWT (login in /api/admin).",
    )

    @application.exception_handler(HttpError)
    async def _http_err(_: Request, exc: HttpError) -> JSONResponse:
        return JSONResponse({"error": exc.message}, status_code=exc.status)

    @application.exception_handler(RequestValidationError)
    async def _val(_: Request, exc: RequestValidationError) -> JSONResponse:
        for e in exc.errors():
            if "fiscal" in str(e).lower() or e.get("type") in ("value_error",):
                msg = str(e.get("msg", ""))
                if "Codice fiscale" in msg or "fiscalCode" in str(e.get("loc", ())):
                    return JSONResponse({"error": "Codice fiscale non valido"}, status_code=400)
        return JSONResponse({"error": "Validazione", "details": exc.errors()}, status_code=422)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @application.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    @application.get("/swagger", include_in_schema=False)
    async def swagger() -> Any:
        return get_swagger_ui_html(openapi_url="/openapi.json", title="YourMedPortal API")

    @application.get("/api/public/macro-areas")
    def public_macro(c: AppContainer = Depends(get_container)) -> Any:
        return c.public_catalog.macro_areas_list()

    @application.get("/api/public/visit-types")
    def public_vt(c: AppContainer = Depends(get_container)) -> Any:
        return c.public_catalog.visit_types_list()

    @application.get("/api/public/available-slots")
    def available(
        c: AppContainer = Depends(get_container),
        visitTypeId: int = Query(..., ge=1),
        date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    ) -> Any:
        return c.public_scheduling.available_slots(visitTypeId, date)

    @application.get("/api/public/week-availability")
    def week_av(
        c: AppContainer = Depends(get_container),
        visitTypeId: int = Query(..., ge=1),
        weekStart: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    ) -> Any:
        return c.public_scheduling.week_availability(visitTypeId, weekStart)

    @application.post("/api/public/bookings")
    def create_pub(
        body: schemas.PublicBookingCreate, c: AppContainer = Depends(get_container)
    ) -> Any:
        return c.public_booking.create_booking(
            visit_type_id=body.visitTypeId,
            slot_start_iso=body.slotStartIso,
            first_name=body.firstName,
            last_name=body.lastName,
            fiscal_code=body.fiscalCode,
            age=body.age,
            address=body.address,
            phone=body.phone,
            email=body.email,
        )

    @application.post("/api/public/bookings/cancel")
    def cancel_pub(
        body: schemas.PublicBookingCancel, c: AppContainer = Depends(get_container)
    ) -> Any:
        return c.public_booking.cancel_booking(body.fiscalCode, body.code)

    @application.get("/api/public/reports")
    def pub_report(
        c: AppContainer = Depends(get_container),
        fiscalCode: str = Query(min_length=1),
        code: str = Query(min_length=1),
    ) -> Any:
        try:
            fc = validate_cf_query(fiscalCode)
        except ValueError:
            return JSONResponse({"error": "Codice fiscale non valido"}, status_code=400)
        return c.public_report.get_report(fc, code)

    @application.get("/public/attachments/{id}")
    def pub_att(
        id: int = Path(..., ge=1),
        c: AppContainer = Depends(get_container),
        fiscalCode: str = Query(min_length=1),
        reportCode: str = Query(min_length=1),
    ) -> Response:
        try:
            fc = validate_cf_query(fiscalCode.strip())
        except ValueError:
            return PlainTextResponse("Bad request", status_code=400)
        report_code = reportCode.strip().upper()
        r = c.admin_report_upload.get_public_attachment(id, fc, report_code)
        if r["kind"] == "not_found":
            return PlainTextResponse("Non trovato", status_code=404)
        if r["kind"] == "missing_file":
            return PlainTextResponse("File mancante", status_code=404)
        r_ok = r
        if r_ok["kind"] != "ok":
            raise RuntimeError
        name = r_ok["originalName"]
        disp = f'inline; filename="{urllib.parse.quote(name)}"'
        return Response(
            content=r_ok["body"],
            media_type=r_ok["mimeType"],
            headers={"Content-Disposition": disp},
        )

    @application.post("/api/admin/login")
    def login(
        body: schemas.AdminLoginBody,
        c: AppContainer = Depends(get_container),
        x_forwarded_for: str | None = Header(None, alias="X-Forwarded-For"),
    ) -> Any:
        return c.admin_auth.login(str(body.email), body.password, x_forwarded_for)

    @application.get("/api/admin/me")
    def me(
        c: AppContainer = Depends(get_container), admin: AdminPayload = Depends(get_admin)
    ) -> Any:
        return c.admin_auth.me(admin)

    @application.get("/api/admin/stats")
    def stats(c: AppContainer = Depends(get_container), _: AdminPayload = Depends(get_admin)) -> Any:
        return c.admin_auth.stats()

    @application.get("/api/admin/macro-areas")
    def ma_list(c: AppContainer = Depends(get_container), _: AdminPayload = Depends(get_admin)) -> Any:
        return c.admin_macro_area.list()

    @application.post("/api/admin/macro-areas")
    def ma_create(
        body: schemas.AdminMacroCreate,
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_macro_area.create(
            body.name, body.slotDurationMinutes, body.parallelSlots, admin
        )

    @application.patch("/api/admin/macro-areas/{id}")
    def ma_patch(
        id: int = Path(..., ge=1),
        body: schemas.AdminMacroPatch = Body(...),
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_macro_area.update(
            id, body.name, body.slotDurationMinutes, body.parallelSlots, admin
        )

    @application.delete("/api/admin/macro-areas/{id}")
    def ma_delete(
        id: int = Path(..., ge=1),
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_macro_area.delete(id, admin)

    @application.get("/api/admin/visit-types")
    def vt_list(c: AppContainer = Depends(get_container), _: AdminPayload = Depends(get_admin)) -> Any:
        return c.admin_visit_type.list()

    @application.post("/api/admin/visit-types")
    def vt_create(
        body: schemas.AdminVisitTypeCreate,
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_visit_type.create(body.name, body.description, body.macroAreaId, admin)

    @application.patch("/api/admin/visit-types/{id}")
    def vt_patch(
        id: int = Path(..., ge=1),
        body: schemas.AdminVisitTypePatch = Body(...),
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_visit_type.update(
            id, body.name, body.description, body.macroAreaId, admin
        )

    @application.delete("/api/admin/visit-types/{id}")
    def vt_delete(
        id: int = Path(..., ge=1),
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_visit_type.delete(id, admin)

    @application.get("/api/admin/bookings")
    def b_list(
        c: AppContainer = Depends(get_container),
        _: AdminPayload = Depends(get_admin),
        status: str | None = Query(None),
        from_: str | None = Query(None, alias="from"),
        to: str | None = Query(None),
        macroAreaId: int | None = Query(None, ge=1, alias="macroAreaId"),
        orderAsc: str | None = Query(None, alias="orderAsc"),
    ) -> Any:
        oa: bool | None
        if orderAsc == "true":
            oa = True
        elif orderAsc == "false":
            oa = False
        else:
            oa = None
        return c.admin_booking.list(
            status=status, from_=from_, to=to, macroAreaId=macroAreaId, order_asc=oa
        )

    @application.post("/api/admin/bookings")
    def b_create(
        body: schemas.AdminBookingCreate,
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_booking.create(
            visit_type_id=body.visitTypeId,
            slot_start_iso=body.slotStartIso,
            first_name=body.firstName,
            last_name=body.lastName,
            fiscal_code=body.fiscalCode,
            age=body.age,
            address=body.address,
            phone=body.phone,
            email=body.email,
            admin=admin,
        )

    @application.post("/api/admin/bookings/{id}/cancel")
    def b_cancel(
        id: int = Path(..., ge=1),
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_booking.cancel(id, admin)

    @application.patch("/api/admin/bookings/{id}/patient")
    def b_patient(
        id: int = Path(..., ge=1),
        body: schemas.AdminBookingPatientPatch = Body(...),
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_booking.update_patient(
            id_=id,
            first_name=body.firstName,
            last_name=body.lastName,
            fiscal_code=body.fiscalCode,
            age=body.age,
            address=body.address,
            phone=body.phone,
            email=body.email,
            admin=admin,
        )

    @application.get("/api/admin/reports")
    def r_list(c: AppContainer = Depends(get_container), _: AdminPayload = Depends(get_admin)) -> Any:
        return c.admin_report.list()

    @application.post("/api/admin/reports")
    def r_create(
        body: schemas.AdminReportCreate,
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_report.create(
            fiscal_code=body.fiscalCode,
            first_name=body.firstName,
            last_name=body.lastName,
            visit_type_id=body.visitTypeId,
            exam_date_iso=body.examDateIso,
            notes=body.notes,
            admin=admin,
        )

    @application.patch("/api/admin/reports/{id}/notes")
    def r_notes(
        id: int = Path(..., ge=1),
        body: schemas.AdminReportNotesPatch = Body(...),
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_report.set_notes(id, body.notes, admin)

    @application.get("/api/admin/activity-logs")
    def logs(
        c: AppContainer = Depends(get_container),
        _: AdminPayload = Depends(get_admin),
        limit: int | None = Query(None, ge=1, le=500),
    ) -> Any:
        return c.admin_activity.list(limit=limit)

    @application.get("/api/admin/users")
    def u_list(c: AppContainer = Depends(get_container), _: AdminPayload = Depends(get_admin)) -> Any:
        return c.admin_user.list()

    @application.post("/api/admin/users")
    def u_create(
        body: schemas.AdminUserCreate,
        c: AppContainer = Depends(get_container),
        admin: AdminPayload = Depends(get_admin),
    ) -> Any:
        return c.admin_user.create(body.email, body.name, body.password, admin)

    @application.post("/upload/report/{reportId}")
    async def upload(
        reportId: int = Path(..., ge=1),
        c: AppContainer = Depends(get_container),
        file: UploadFile = File(...),
        authorization: str | None = Header(None, alias="Authorization"),
    ) -> Any:
        token = _bearer(authorization)
        admin = c.auth.verify_admin_token(token)
        if not admin:
            return JSONResponse({"error": "Unauthorized"}, status_code=401)
        data = await file.read()
        if not data:
            return JSONResponse({"error": "File mancante"}, status_code=400)
        try:
            c.admin_report_upload.upload_report_attachment(
                reportId,
                data,
                file.filename or "file",
                file.content_type or "application/octet-stream",
                admin,
            )
        except HttpError as e:
            return JSONResponse({"error": e.message}, status_code=e.status)
        return {"ok": True}

    return application


app = create_app()
