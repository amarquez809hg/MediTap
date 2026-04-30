"""
Staff elevation for patient intake: verify staff with Django (username/password) without
replacing the patient's browser session. Returns a short-lived signed JWT the SPA stores
and sends as X-Meditap-Elevation on writes.

Patient must present a valid SimpleJWT access token. Staff must be active and either
superuser or in MEDITAP_RECORD_EDITOR_ROLE (default Django group meditap-record-editor).
"""

from __future__ import annotations

import time

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from django.http import HttpResponseNotFound, JsonResponse
from django.views.decorators.http import require_GET
from jose import jwt as jose_jwt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


def _issue_elevation_response(patient_sub: str, staff_sub: str) -> Response:
    ttl = int(getattr(settings, "MEDITAP_ELEVATION_TTL_SECONDS", 1800) or 1800)
    now = int(time.time())
    exp = now + ttl
    signing_key = (
        getattr(settings, "MEDITAP_ELEVATION_SIGNING_KEY", "") or settings.SECRET_KEY
    )
    payload = {
        "typ": "meditap-patient-intake-elevation",
        "patient_sub": patient_sub,
        "staff_sub": staff_sub,
        "iat": now,
        "exp": exp,
    }
    elevation_token = jose_jwt.encode(payload, signing_key, algorithm="HS256")
    return Response({"elevation_token": elevation_token, "expires_in": ttl})


def _patient_sub_from_access_token(raw: str) -> str | None:
    try:
        validated = AccessToken(raw)
    except (InvalidToken, TokenError):
        return None
    sub = validated.get("sub")
    if sub is not None:
        return str(sub)
    uid = validated.get("user_id")
    return str(uid) if uid is not None else None


@require_GET
def staff_elevate_debug(request):
    """When DEBUG is on: confirm staff-elevate mode (no secrets)."""
    if not settings.DEBUG:
        return HttpResponseNotFound()
    editor = (getattr(settings, "MEDITAP_RECORD_EDITOR_ROLE", "") or "").strip() or (
        "meditap-record-editor"
    )
    return JsonResponse({"mode": "django", "record_editor_role": editor})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def staff_elevate_patient_intake(request):
    """
    POST JSON: { "username": "staff_user", "password": "..." }
    Requires Authorization: Bearer <patient SimpleJWT access token>.
    """
    auth = request.META.get("HTTP_AUTHORIZATION") or ""
    if not auth.startswith("Bearer "):
        return Response({"detail": "Missing bearer token."}, status=status.HTTP_401_UNAUTHORIZED)
    patient_token = auth[7:].strip()
    patient_sub = _patient_sub_from_access_token(patient_token)
    if not patient_sub:
        return Response({"detail": "Invalid patient token."}, status=status.HTTP_401_UNAUTHORIZED)

    username = (request.data.get("username") or "").strip()
    raw_password = request.data.get("password")
    if raw_password is not None and not isinstance(raw_password, str):
        password = str(raw_password)
    else:
        password = raw_password or ""
    if not username or not password:
        return Response(
            {"detail": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    staff = authenticate(request, username=username, password=password)
    if not staff or not staff.is_active:
        return Response(
            {"detail": "Invalid staff username or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    editor_role = (getattr(settings, "MEDITAP_RECORD_EDITOR_ROLE", "") or "").strip() or (
        "meditap-record-editor"
    )
    grp = Group.objects.filter(name=editor_role).first()
    allowed = staff.is_superuser or (
        grp is not None and staff.groups.filter(pk=grp.pk).exists()
    )
    if not allowed:
        return Response(
            {"detail": "This account is not allowed to edit patient intake."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return _issue_elevation_response(patient_sub, str(staff.pk))
