"""
Epic FHIR (SMART) sandbox linking: OAuth authorize URL + code exchange (no token storage).
"""

from __future__ import annotations

import base64
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.core import signing
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from medical import models
from medical.patient_api_scoping import scoped_patient_queryset
from medical.permissions import IntakeEditorWritePermission
from medical.serializers import EpicPatientLinkSerializer

logger = logging.getLogger(__name__)


def _epic_oauth_configured() -> bool:
    return bool(
        getattr(settings, "EPIC_INTEGRATION_ENABLED", False)
        and (getattr(settings, "EPIC_FHIR_BASE_URL", "") or "").strip()
        and (getattr(settings, "EPIC_AUTHORIZE_URL", "") or "").strip()
        and (getattr(settings, "EPIC_TOKEN_URL", "") or "").strip()
        and (getattr(settings, "EPIC_CLIENT_ID", "") or "").strip()
        and (getattr(settings, "EPIC_REDIRECT_URI", "") or "").strip()
    )


def _state_signer() -> signing.TimestampSigner:
    return signing.TimestampSigner(salt="meditap.epic.oauth")


def _patient_from_state(state: str) -> models.Patient:
    raw = _state_signer().unsign(state, max_age=int(getattr(settings, "EPIC_OAUTH_STATE_MAX_AGE", 600)))
    return get_object_or_404(models.Patient, pk=raw)


def _http_form_post(url: str, form: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(form).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 — trusted config URL
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode(errors="replace")
        raise ValueError(f"HTTP {e.code}: {err_body[:800]}") from e


def _decode_jwt_payload_segment(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        seg = parts[1]
        pad = "=" * ((4 - len(seg) % 4) % 4)
        raw = base64.urlsafe_b64decode(seg + pad)
        return json.loads(raw.decode())
    except (ValueError, json.JSONDecodeError, TypeError):
        return None


def _extract_epic_patient_id(token_payload: dict) -> str | None:
    for key in ("patient", "sub"):
        val = token_payload.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


class EpicOAuthConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ok = _epic_oauth_configured()
        fhir = (getattr(settings, "EPIC_FHIR_BASE_URL", "") or "").strip()
        return Response(
            {
                "integration_enabled": ok,
                "sandbox": getattr(settings, "EPIC_SANDBOX", True),
                "fhir_base_url": fhir if ok else None,
                "authorize_url": (getattr(settings, "EPIC_AUTHORIZE_URL", "") or "").strip()
                if ok
                else None,
                "redirect_uri": (getattr(settings, "EPIC_REDIRECT_URI", "") or "").strip()
                if ok
                else None,
                "client_id": (getattr(settings, "EPIC_CLIENT_ID", "") or "").strip() if ok else None,
                "default_scope": (getattr(settings, "EPIC_DEFAULT_SCOPE", "") or "").strip()
                if ok
                else None,
                "hint": None
                if ok
                else "Set EPIC_INTEGRATION_ENABLED=1 and EPIC_* URLs, client id, and redirect URI on the backend.",
            }
        )


class PatientEpicLinkView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IntakeEditorWritePermission()]

    def get(self, request, patient_id):
        patient = get_object_or_404(scoped_patient_queryset(request), pk=patient_id)
        link, _ = models.EpicPatientLink.objects.get_or_create(patient=patient)
        return Response(EpicPatientLinkSerializer(link).data)

    def patch(self, request, patient_id):
        patient = get_object_or_404(scoped_patient_queryset(request), pk=patient_id)
        link, _ = models.EpicPatientLink.objects.get_or_create(patient=patient)
        ser = EpicPatientLinkSerializer(link, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(EpicPatientLinkSerializer(link).data)


class PrepareEpicAuthorizeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, patient_id):
        if not _epic_oauth_configured():
            return Response(
                {"detail": "Epic OAuth is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        patient = get_object_or_404(scoped_patient_queryset(request), pk=patient_id)
        link, _ = models.EpicPatientLink.objects.get_or_create(patient=patient)
        state = _state_signer().sign(str(patient.patient_id))
        link.status = models.EpicPatientLink.STATUS_PENDING_AUTH
        link.last_error = ""
        link.save(update_fields=["status", "last_error", "updated_at"])

        params = {
            "response_type": "code",
            "client_id": settings.EPIC_CLIENT_ID.strip(),
            "redirect_uri": settings.EPIC_REDIRECT_URI.strip(),
            "scope": (settings.EPIC_DEFAULT_SCOPE or "").strip(),
            "state": state,
            "aud": settings.EPIC_FHIR_BASE_URL.strip(),
        }
        q = urllib.parse.urlencode(params)
        authorize_url = f"{settings.EPIC_AUTHORIZE_URL.strip()}?{q}"
        return Response({"authorize_url": authorize_url, "state": state})


class EpicOAuthCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get("code") or "").strip()
        state = (request.data.get("state") or "").strip()
        if not code or not state:
            return Response(
                {"detail": "code and state are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            patient = _patient_from_state(state)
        except signing.SignatureExpired:
            return Response(
                {"detail": "OAuth state expired. Start Connect again from MediTap."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except signing.BadSignature:
            return Response(
                {"detail": "Invalid OAuth state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not _epic_oauth_configured():
            return Response(
                {"detail": "Epic OAuth is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        link, _ = models.EpicPatientLink.objects.get_or_create(patient=patient)
        form: dict[str, str] = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.EPIC_REDIRECT_URI.strip(),
            "client_id": settings.EPIC_CLIENT_ID.strip(),
        }
        secret = (getattr(settings, "EPIC_CLIENT_SECRET", None) or "").strip()
        if secret:
            form["client_secret"] = secret

        try:
            token_json = _http_form_post(settings.EPIC_TOKEN_URL.strip(), form)
        except ValueError as e:
            link.status = models.EpicPatientLink.STATUS_ERROR
            link.last_error = str(e)[:2000]
            link.save(update_fields=["status", "last_error", "updated_at"])
            logger.warning("Epic token exchange failed: %s", e)
            return Response(
                {"detail": "Token exchange failed.", "error": link.last_error},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        access = token_json.get("access_token")
        epic_pid = token_json.get("patient")
        if isinstance(epic_pid, str) and epic_pid.strip():
            pass
        elif isinstance(access, str):
            payload = _decode_jwt_payload_segment(access)
            if payload:
                epic_pid = _extract_epic_patient_id(payload)
        else:
            epic_pid = None

        link.status = models.EpicPatientLink.STATUS_CONNECTED
        link.last_error = ""
        link.fhir_server_base_url = settings.EPIC_FHIR_BASE_URL.strip()
        if isinstance(epic_pid, str) and epic_pid.strip():
            link.epic_patient_fhir_id = epic_pid.strip()
        link.save(
            update_fields=[
                "status",
                "last_error",
                "fhir_server_base_url",
                "epic_patient_fhir_id",
                "updated_at",
            ]
        )
        return Response(EpicPatientLinkSerializer(link).data)
