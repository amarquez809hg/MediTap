"""
Build Keycloak password-grant username candidates.

1) Same browser session as the patient: if the staff field matches the patient’s email
   from the JWT but Keycloak’s internal username is different (e.g. mr.wayne vs email),
   we try preferred_username first — restores the usual “type my email” flow.

2) Optional dev-only: Admin REST email lookup when KEYCLOAK_DEV_MASTER_ADMIN_PASSWORD
   is set (local Docker Keycloak).
"""

from __future__ import annotations

import logging
from urllib.parse import urlparse

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _server_base_and_realm_from_token_url(token_url: str) -> tuple[str, str]:
    p = urlparse(token_url)
    parts = [x for x in p.path.strip("/").split("/") if x]
    try:
        i = parts.index("realms")
        realm = parts[i + 1]
    except (ValueError, IndexError) as e:
        raise ValueError(f"Cannot parse realm from KEYCLOAK_TOKEN_URL: {token_url!r}") from e
    return f"{p.scheme}://{p.netloc}", realm


def _fetch_master_admin_access_token(
    base: str, admin_user: str, admin_password: str
) -> str | None:
    url = f"{base}/realms/master/protocol/openid-connect/token"
    r = requests.post(
        url,
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": admin_user,
            "password": admin_password,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )
    if r.status_code != 200:
        logger.warning(
            "Dev Keycloak master token (for email→username lookup) failed: HTTP %s %s",
            r.status_code,
            (r.text or "")[:160],
        )
        return None
    return (r.json() or {}).get("access_token")


def _username_from_admin_user_list(users: object, want_email: str) -> str | None:
    if not isinstance(users, list):
        return None
    want = want_email.strip().lower()
    for u in users:
        if not isinstance(u, dict):
            continue
        em = (u.get("email") or "").strip().lower()
        if em == want:
            un = (u.get("username") or "").strip()
            return un or None
    return None


def _fetch_realm_username_for_email(
    base: str, realm: str, admin_bearer: str, email: str
) -> str | None:
    r = requests.get(
        f"{base}/admin/realms/{realm}/users",
        params={"email": email, "exact": "true"},
        headers={"Authorization": f"Bearer {admin_bearer}"},
        timeout=15,
    )
    if r.status_code != 200:
        logger.warning("Keycloak admin user-by-email (exact) failed: HTTP %s", r.status_code)
        return None
    un = _username_from_admin_user_list(r.json(), email)
    if un:
        return un

    r2 = requests.get(
        f"{base}/admin/realms/{realm}/users",
        params={"search": email, "max": "25"},
        headers={"Authorization": f"Bearer {admin_bearer}"},
        timeout=15,
    )
    if r2.status_code != 200:
        return None
    return _username_from_admin_user_list(r2.json(), email)


def staff_password_grant_username_variants(
    login_identifier: str,
    token_url: str,
    *,
    patient_claims: dict | None = None,
) -> list[str]:
    """
    Ordered usernames to try against Keycloak's password grant.
    """
    variants: list[str] = []
    seen: set[str] = set()

    def add(v: str) -> None:
        v = v.strip()
        if not v or v in seen:
            return
        seen.add(v)
        variants.append(v)

    staff = login_identifier.strip()
    staff_l = staff.lower()

    # Same Keycloak session as the patient: staff field is their email, username is mr.wayne, etc.
    if patient_claims and staff and "@" in staff:
        patient_emails: list[str] = []
        e = (patient_claims.get("email") or "").strip().lower()
        if e:
            patient_emails.append(e)
        pref0 = (patient_claims.get("preferred_username") or "").strip()
        if pref0 and "@" in pref0.lower():
            patient_emails.append(pref0.lower())
        same_session = bool(patient_emails) and staff_l in patient_emails
        if same_session:
            pref = pref0
            if pref and pref.lower() != staff_l:
                add(pref)
                add(pref.lower())

    admin_pw = (getattr(settings, "KEYCLOAK_DEV_MASTER_ADMIN_PASSWORD", "") or "").strip()
    if settings.DEBUG and admin_pw and "@" in login_identifier:
        try:
            base, realm = _server_base_and_realm_from_token_url(token_url)
            admin_user = (getattr(settings, "KEYCLOAK_DEV_MASTER_ADMIN_USER", "") or "admin").strip()
            tok = _fetch_master_admin_access_token(base, admin_user, admin_pw)
            if tok:
                resolved = _fetch_realm_username_for_email(base, realm, tok, login_identifier)
                if resolved:
                    add(resolved)
                    add(resolved.lower())
        except Exception as e:
            logger.warning("Keycloak dev email→username lookup skipped: %s", e)

    add(login_identifier)
    add(login_identifier.lower())
    return variants
