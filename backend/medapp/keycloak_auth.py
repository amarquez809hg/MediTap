"""
Validate Keycloak access tokens (RS256 / JWKS) for DRF.

Falls through to SimpleJWT only when the bearer token does not look like a
Keycloak realm token (see authenticate). Keycloak-shaped issuers that are not
allowed or fail verification raise AuthenticationFailed instead of hitting
SimpleJWT (which would return misleading token_not_valid errors).
"""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

_DEFAULT_AZP_CHECK = object()
from django.conf import settings
from django.contrib.auth.models import User
from jose import JWTError, jwk, jwt
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

_jwks_cache: dict[str, Any] = {"data": None, "fetched_at": 0.0}
JWKS_TTL_SECONDS = 300


def _issuer_allowed(iss: str) -> bool:
    allowed = getattr(settings, "KEYCLOAK_ALLOWED_ISSUERS", []) or []
    if iss in allowed:
        return True
    if getattr(settings, "KEYCLOAK_TRUST_ISSUER_SUFFIX", False):
        suffix = getattr(settings, "KEYCLOAK_ISSUER_SUFFIX", "") or ""
        if suffix and iss.startswith("http://") and iss.endswith(suffix):
            return True
    return False


def _get_jwks() -> dict[str, Any]:
    url = getattr(settings, "KEYCLOAK_JWKS_URL", "") or ""
    if not url:
        raise AuthenticationFailed("Keycloak JWKS URL is not configured.")
    now = time.time()
    if (
        _jwks_cache["data"] is not None
        and now - float(_jwks_cache["fetched_at"]) < JWKS_TTL_SECONDS
    ):
        return _jwks_cache["data"]
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
    except requests.RequestException as e:
        logger.warning("Keycloak JWKS fetch failed: %s", e)
        raise AuthenticationFailed("Could not load Keycloak signing keys.") from e
    _jwks_cache["data"] = data
    _jwks_cache["fetched_at"] = now
    return data


def _rsa_key_for_token(token: str, jwks: dict[str, Any]):
    try:
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")
    except JWTError:
        return None
    if not kid:
        return None
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return jwk.construct(key)
    return None


def _django_user_from_claims(claims: dict) -> User:
    sub = claims.get("sub")
    if not sub:
        raise AuthenticationFailed("Token missing subject.")
    preferred = (claims.get("preferred_username") or "").strip()
    email = (claims.get("email") or "").strip()
    username = preferred or email or f"kc_{sub}"
    username = username[:150]

    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            "email": email[:254] if email else "",
            "first_name": (claims.get("given_name") or "")[:150],
            "last_name": (claims.get("family_name") or "")[:150],
        },
    )
    if not created and email and user.email != email:
        user.email = email[:254]
        user.save(update_fields=["email"])
    return user


class KeycloakAuthentication(BaseAuthentication):
    """Use before SimpleJWT so Keycloak access tokens authenticate first."""

    keyword = "Bearer"

    def authenticate(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION") or ""
        if not auth.startswith("Bearer "):
            return None
        raw = auth[7:].strip()
        if not raw or raw.count(".") != 2:
            return None

        try:
            claims = jwt.get_unverified_claims(raw)
        except JWTError:
            return None

        iss = claims.get("iss") or ""
        if not iss or not _issuer_allowed(iss):
            # Do not fall through to SimpleJWT with a Keycloak access token — it only
            # produces confusing "token_not_valid" responses and hides the real issue.
            if iss and "/realms/" in str(iss).lower():
                raise AuthenticationFailed(
                    f"JWT issuer {iss!r} is not in KEYCLOAK_ALLOWED_ISSUERS. "
                    "Add it to the backend environment (comma-separated), or set "
                    "KEYCLOAK_TRUST_ISSUER_SUFFIX=1 in DEBUG for LAN-style hosts."
                )
            return None

        try:
            decoded = verify_keycloak_access_token_string(raw)
        except AuthenticationFailed:
            raise

        user = _django_user_from_claims(decoded)
        return (user, None)


def verify_keycloak_access_token_string(
    raw: str,
    *,
    expect_azp: str | None | Any = _DEFAULT_AZP_CHECK,
) -> dict:
    """
    Verify a Keycloak RS256 access token and return claims.

    expect_azp:
      - omitted: use KEYCLOAK_EXPECTED_AZP from settings (SPA default).
      - None: do not check azp.
      - str: require this azp value.
    """
    if not raw or raw.count(".") != 2:
        raise AuthenticationFailed("Malformed token.")

    try:
        claims = jwt.get_unverified_claims(raw)
    except JWTError:
        raise AuthenticationFailed("Invalid token.") from None

    iss = claims.get("iss") or ""
    if not iss or not _issuer_allowed(iss):
        raise AuthenticationFailed("Invalid token issuer.")

    jwks = _get_jwks()
    rsa_key = _rsa_key_for_token(raw, jwks)
    if rsa_key is None:
        raise AuthenticationFailed("Unknown signing key.")

    try:
        decoded = jwt.decode(
            raw,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except JWTError as e:
        raise AuthenticationFailed("Invalid or expired token.") from e

    if expect_azp is _DEFAULT_AZP_CHECK:
        expected_azp = getattr(settings, "KEYCLOAK_EXPECTED_AZP", "") or ""
        if expected_azp and decoded.get("azp") != expected_azp:
            raise AuthenticationFailed("Token not issued for this client.")
    elif expect_azp is not None:
        azp = decoded.get("azp")
        if azp == expect_azp:
            pass
        else:
            # Password-grant tokens sometimes omit `azp` but list the client in `aud`.
            aud_raw = decoded.get("aud")
            if isinstance(aud_raw, list):
                aud_has_client = expect_azp in aud_raw
            elif isinstance(aud_raw, str):
                aud_has_client = aud_raw == expect_azp
            else:
                aud_has_client = False
            if aud_has_client and azp in (None, ""):
                pass
            else:
                raise AuthenticationFailed("Token not issued for this client.")

    audience = getattr(settings, "KEYCLOAK_AUDIENCE", "") or ""
    if getattr(settings, "KEYCLOAK_VERIFY_AUDIENCE", False) and audience:
        aud = decoded.get("aud")
        ok = False
        if isinstance(aud, list):
            ok = audience in aud
        elif isinstance(aud, str):
            ok = aud == audience
        if not ok:
            raise AuthenticationFailed("Invalid token audience.")

    return decoded
