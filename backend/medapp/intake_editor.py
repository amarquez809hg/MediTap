"""
Who may create/update/delete patient intake–style records (e.g. lab panels):
Django superuser, Django group MEDITAP_RECORD_EDITOR_ROLE (default meditap-record-editor),
or a valid X-Meditap-Elevation JWT from staff-elevate (patient_sub matches bearer sub).
Read-only access does not require this.
"""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth.models import Group
from jose import JWTError, jwt as jose_jwt
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


def _bearer_sub(request) -> str | None:
    auth = request.META.get("HTTP_AUTHORIZATION") or ""
    if not auth.startswith("Bearer "):
        return None
    raw = auth[7:].strip()
    try:
        validated = AccessToken(raw)
    except (InvalidToken, TokenError):
        return None
    sub = validated.get("sub")
    if sub is not None:
        return str(sub)
    uid = validated.get("user_id")
    return str(uid) if uid is not None else None


def patient_has_intake_editor_role(request) -> bool:
    role = (getattr(settings, "MEDITAP_RECORD_EDITOR_ROLE", "") or "").strip() or (
        "meditap-record-editor"
    )
    user = getattr(request, "user", None)
    if user is None or not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False):
        return True
    grp = Group.objects.filter(name=role).first()
    return bool(grp and user.groups.filter(pk=grp.pk).exists())


def intake_elevation_valid(request) -> bool:
    patient_sub = _bearer_sub(request)
    if not patient_sub:
        return False
    raw = (request.META.get("HTTP_X_MEDITAP_ELEVATION") or "").strip()
    if raw.startswith("Bearer "):
        raw = raw[7:].strip()
    if not raw:
        return False
    signing_key = (
        getattr(settings, "MEDITAP_ELEVATION_SIGNING_KEY", "") or settings.SECRET_KEY
    )
    try:
        payload = jose_jwt.decode(raw, signing_key, algorithms=["HS256"])
    except JWTError:
        return False
    if payload.get("typ") != "meditap-patient-intake-elevation":
        return False
    if str(payload.get("patient_sub") or "") != patient_sub:
        return False
    return True


def can_edit_intake_records(request) -> bool:
    user = getattr(request, "user", None)
    if user is not None and user.is_authenticated and getattr(user, "is_superuser", False):
        return True
    if patient_has_intake_editor_role(request):
        return True
    if intake_elevation_valid(request):
        return True
    return False
