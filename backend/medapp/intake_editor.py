"""
Who may create/update/delete patient intake–style records (e.g. lab panels):
Django superuser, Keycloak realm role meditap-record-editor on the user's token,
or a valid X-Meditap-Elevation JWT from staff-elevate (patient_sub matches bearer sub).
Read-only access does not require this.
"""

from __future__ import annotations

from django.conf import settings
from jose import JWTError, jwt as jose_jwt
from rest_framework.exceptions import AuthenticationFailed

from medapp.keycloak_auth import verify_keycloak_access_token_string


def _bearer_sub(request) -> str | None:
    auth = request.META.get("HTTP_AUTHORIZATION") or ""
    if not auth.startswith("Bearer "):
        return None
    try:
        claims = verify_keycloak_access_token_string(auth[7:].strip())
    except AuthenticationFailed:
        return None
    sub = claims.get("sub")
    return str(sub) if sub else None


def patient_has_intake_editor_role(request) -> bool:
    role = (getattr(settings, "MEDITAP_RECORD_EDITOR_ROLE", "") or "").strip() or (
        "meditap-record-editor"
    )
    auth = request.META.get("HTTP_AUTHORIZATION") or ""
    if not auth.startswith("Bearer "):
        return False
    try:
        claims = verify_keycloak_access_token_string(auth[7:].strip())
    except AuthenticationFailed:
        return False
    roles = (claims.get("realm_access") or {}).get("roles") or []
    return role in roles


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
