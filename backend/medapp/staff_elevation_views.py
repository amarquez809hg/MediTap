"""
Staff elevation for patient intake: verify staff credentials with Keycloak without
replacing the patient's browser session. Returns a short-lived signed JWT the SPA
stores and sends as X-Meditap-Elevation on writes (optional server enforcement later).

Requires a confidential Keycloak client with Direct Access Grants enabled
(KEYCLOAK_ELEVATE_CLIENT_ID / KEYCLOAK_ELEVATE_CLIENT_SECRET).
"""

from __future__ import annotations

import base64
import logging
import time

import requests
from django.conf import settings
from django.http import HttpResponseNotFound, JsonResponse
from django.views.decorators.http import require_GET
from jose import jwt as jose_jwt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from medapp.keycloak_auth import verify_keycloak_access_token_string
from medapp.keycloak_dev_user_lookup import staff_password_grant_username_variants

logger = logging.getLogger(__name__)


def _keycloak_password_grant(
    token_url: str,
    client_id: str,
    client_secret: str,
    username: str,
    password: str,
) -> requests.Response:
    """
    Keycloak accepts client auth as client_secret in the form body or via HTTP Basic
    (RFC 6749). Try body first, then Basic if Keycloak returns invalid_client.
    """
    form = {
        "grant_type": "password",
        "username": username,
        "password": password,
        "scope": "openid",
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    r1 = requests.post(
        token_url,
        data={
            **form,
            "client_id": client_id,
            "client_secret": client_secret,
        },
        headers=headers,
        timeout=20,
    )
    if r1.status_code == 200:
        return r1

    err = ""
    try:
        body = r1.json()
        err = str(body.get("error") or "")
    except Exception:
        pass

    if err != "invalid_client":
        return r1

    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode("ascii")
    r2 = requests.post(
        token_url,
        data={**form, "client_id": client_id},
        headers={**headers, "Authorization": f"Basic {basic}"},
        timeout=20,
    )
    if r2.status_code == 200:
        logger.info("Keycloak password grant succeeded using HTTP Basic client auth.")
        return r2
    return r2


def _keycloak_invalid_user_credentials(resp: requests.Response) -> bool:
    if resp.status_code == 200:
        return False
    try:
        body = resp.json()
        desc = f"{body.get('error_description') or ''} {body.get('error') or ''}".lower()
        return "invalid" in desc and (
            "credential" in desc or "user" in desc or "password" in desc
        )
    except Exception:
        return False


_PLACEHOLDER_SECRETS = frozenset(
    {"", "PASTE_CLIENT_SECRET_HERE", "your-secret", "CHANGE_ME"}
)


@require_GET
def staff_elevate_debug(request):
    """When DEBUG is on: verify env reached Django (does not expose the secret)."""
    if not settings.DEBUG:
        return HttpResponseNotFound()
    client_id = (getattr(settings, "KEYCLOAK_ELEVATE_CLIENT_ID", "") or "").strip()
    client_secret = (getattr(settings, "KEYCLOAK_ELEVATE_CLIENT_SECRET", "") or "").strip()
    token_url = (getattr(settings, "KEYCLOAK_TOKEN_URL", "") or "").strip()
    secret_ok = bool(client_secret) and client_secret not in _PLACEHOLDER_SECRETS
    admin_pw = (getattr(settings, "KEYCLOAK_DEV_MASTER_ADMIN_PASSWORD", "") or "").strip()
    return JsonResponse(
        {
            "staff_elevate_ready": bool(client_id and token_url and secret_ok),
            "client_id_set": bool(client_id),
            "token_url_set": bool(token_url),
            "secret_length": len(client_secret),
            "secret_is_placeholder_or_empty": not secret_ok,
            "dev_email_to_username_lookup": bool(settings.DEBUG and admin_pw),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def staff_elevate_patient_intake(request):
    """
    POST JSON: { "username": "staff_user", "password": "..." }
    Requires Authorization: Bearer <patient access token>.
    """
    client_id = (getattr(settings, "KEYCLOAK_ELEVATE_CLIENT_ID", "") or "").strip()
    client_secret = (getattr(settings, "KEYCLOAK_ELEVATE_CLIENT_SECRET", "") or "").strip()
    token_url = (getattr(settings, "KEYCLOAK_TOKEN_URL", "") or "").strip()

    if client_secret in _PLACEHOLDER_SECRETS:
        return Response(
            {
                "detail": (
                    "Staff sign-in is almost ready: the backend still has no real Keycloak client secret. "
                    "Set KEYCLOAK_ELEVATE_CLIENT_SECRET in docker/backend.dev.env or docker/.env "
                    "(docker/.env overrides), copy it from Keycloak → Clients → meditap-elevate → "
                    "Credentials, then run: docker compose -f docker/docker-compose.yml up -d --force-recreate backend. "
                    "With DEBUG=True, open GET /api/auth/staff-elevate/debug/ to verify the container sees a non-empty secret."
                ),
                "code": "secret_not_set",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not client_id or not token_url:
        return Response(
            {
                "detail": (
                    "Staff sign-in from this screen is not configured on the server. "
                    "Ask an administrator to set KEYCLOAK_ELEVATE_CLIENT_ID, "
                    "KEYCLOAK_ELEVATE_CLIENT_SECRET, and KEYCLOAK_TOKEN_URL."
                ),
                "code": "not_configured",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    auth = request.META.get("HTTP_AUTHORIZATION") or ""
    if not auth.startswith("Bearer "):
        return Response({"detail": "Missing bearer token."}, status=status.HTTP_401_UNAUTHORIZED)
    patient_token = auth[7:].strip()
    try:
        patient_claims = verify_keycloak_access_token_string(patient_token)
    except AuthenticationFailed as e:
        return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

    patient_sub = patient_claims.get("sub")
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

    username_variants = staff_password_grant_username_variants(
        username, token_url, patient_claims=patient_claims
    )

    try:
        tr: requests.Response | None = None
        for u in username_variants:
            tr = _keycloak_password_grant(
                token_url, client_id, client_secret, u, password
            )
            if tr.status_code == 200:
                break
    except requests.RequestException as e:
        logger.warning("Keycloak token request failed: %s", e)
        return Response(
            {"detail": "Could not reach identity server."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if tr.status_code != 200:
        detail = "Staff sign-in was rejected by the identity server."
        extra: dict[str, str] = {}
        if settings.DEBUG:
            try:
                body = tr.json()
                desc = body.get("error_description") or body.get("error")
                if desc:
                    extra["keycloak_error"] = str(desc)
            except Exception:
                extra["keycloak_error"] = f"HTTP {tr.status_code} (non-JSON body)"
        hint = (
            "Usually: wrong staff password, wrong client secret on the backend, "
            "or Direct access grants off for client "
            f"{client_id!r}. Compare KEYCLOAK_ELEVATE_CLIENT_SECRET with Keycloak → "
            "Clients → meditap-elevate → Credentials (docker/.env overrides backend.dev.env). "
            "If the staff user only signs in with Google, set a Keycloak password under "
            "Users → Credentials (the password grant cannot use Google’s password)."
        )
        if "@" in username and _keycloak_invalid_user_credentials(tr):
            hint += (
                " The direct-access (password) grant often requires the user’s Keycloak "
                "**Username** (Users → user → Details), not their email, even when the "
                "normal login screen accepts email."
            )
        return Response(
            {
                "detail": detail,
                "code": "keycloak_password_grant_failed",
                "hint": hint,
                **extra,
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    staff_access = (tr.json() or {}).get("access_token")
    if not staff_access:
        return Response(
            {"detail": "No access token returned from identity server."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    try:
        staff_claims = verify_keycloak_access_token_string(
            staff_access,
            expect_azp=client_id,
        )
    except AuthenticationFailed as e:
        return Response(
            {"detail": f"Staff token invalid: {e!s}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    roles = (staff_claims.get("realm_access") or {}).get("roles") or []
    editor_role = (getattr(settings, "MEDITAP_RECORD_EDITOR_ROLE", "") or "").strip() or (
        "meditap-record-editor"
    )
    if editor_role not in roles:
        return Response(
            {"detail": "This account is not allowed to edit patient intake."},
            status=status.HTTP_403_FORBIDDEN,
        )

    ttl = int(getattr(settings, "MEDITAP_ELEVATION_TTL_SECONDS", 1800) or 1800)
    now = int(time.time())
    exp = now + ttl
    signing_key = (
        getattr(settings, "MEDITAP_ELEVATION_SIGNING_KEY", "") or settings.SECRET_KEY
    )
    payload = {
        "typ": "meditap-patient-intake-elevation",
        "patient_sub": patient_sub,
        "staff_sub": staff_claims.get("sub") or "",
        "iat": now,
        "exp": exp,
    }
    elevation_token = jose_jwt.encode(payload, signing_key, algorithm="HS256")

    return Response(
        {
            "elevation_token": elevation_token,
            "expires_in": ttl,
        }
    )
