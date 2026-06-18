"""Minimal Epic FHIR R4 read client with OAuth token refresh."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from medical import models

from .epic_token_crypto import decrypt_epic_token, encrypt_epic_token

logger = logging.getLogger(__name__)


def _http_form_post(url: str, form: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(form).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode(errors="replace")
        raise ValueError(f"HTTP {e.code}: {err_body[:800]}") from e


def _fhir_get(url: str, access_token: str) -> dict:
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {access_token}")
    req.add_header("Accept", "application/fhir+json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode(errors="replace")
        raise ValueError(f"FHIR HTTP {e.code}: {err_body[:800]}") from e


def _store_tokens(link: models.EpicPatientLink, token_json: dict) -> None:
    access = token_json.get("access_token")
    refresh = token_json.get("refresh_token")
    expires_in = token_json.get("expires_in")
    fields = ["updated_at"]
    if isinstance(access, str) and access.strip():
        link.access_token_encrypted = encrypt_epic_token(access.strip())
        fields.append("access_token_encrypted")
        if expires_in is not None:
            try:
                link.access_token_expires_at = timezone.now() + timedelta(
                    seconds=int(expires_in)
                )
                fields.append("access_token_expires_at")
            except (TypeError, ValueError):
                pass
    if isinstance(refresh, str) and refresh.strip():
        link.refresh_token_encrypted = encrypt_epic_token(refresh.strip())
        fields.append("refresh_token_encrypted")
    link.save(update_fields=fields)


def ensure_fresh_access_token(link: models.EpicPatientLink) -> str:
    """Return a valid access token, refreshing via refresh_token when needed."""
    now = timezone.now()
    if link.access_token_encrypted:
        expires = link.access_token_expires_at
        if expires is None or expires > now + timedelta(seconds=30):
            return decrypt_epic_token(link.access_token_encrypted)

    refresh = decrypt_epic_token(link.refresh_token_encrypted)
    if not refresh:
        raise ValueError(
            "No valid Epic OAuth session. Connect Epic (sandbox) again from Admin Panel."
        )

    token_url = (getattr(settings, "EPIC_TOKEN_URL", "") or "").strip()
    if not token_url:
        raise ValueError("Epic token URL is not configured on the server.")

    form: dict[str, str] = {
        "grant_type": "refresh_token",
        "refresh_token": refresh,
        "client_id": settings.EPIC_CLIENT_ID.strip(),
    }
    secret = (getattr(settings, "EPIC_CLIENT_SECRET", None) or "").strip()
    if secret:
        form["client_secret"] = secret

    token_json = _http_form_post(token_url, form)
    _store_tokens(link, token_json)
    access = token_json.get("access_token")
    if not isinstance(access, str) or not access.strip():
        raise ValueError("Epic token refresh did not return an access token.")
    return access.strip()


def fhir_base_for_link(link: models.EpicPatientLink) -> str:
    base = (link.fhir_server_base_url or "").strip()
    if not base:
        base = (getattr(settings, "EPIC_FHIR_BASE_URL", "") or "").strip()
    return base.rstrip("/")


def read_patient_resource(link: models.EpicPatientLink) -> dict:
    epic_id = (link.epic_patient_fhir_id or "").strip()
    if not epic_id:
        raise ValueError("Epic Patient.id is not set on this link.")
    token = ensure_fresh_access_token(link)
    base = fhir_base_for_link(link)
    url = f"{base}/Patient/{urllib.parse.quote(epic_id, safe='')}"
    return _fhir_get(url, token)


def read_vital_observations(link: models.EpicPatientLink) -> list[dict]:
    epic_id = (link.epic_patient_fhir_id or "").strip()
    if not epic_id:
        raise ValueError("Epic Patient.id is not set on this link.")
    token = ensure_fresh_access_token(link)
    base = fhir_base_for_link(link)
    params = urllib.parse.urlencode(
        {
            "patient": epic_id,
            "category": "vital-signs",
            "_count": "50",
        }
    )
    url = f"{base}/Observation?{params}"
    bundle = _fhir_get(url, token)
    entries = bundle.get("entry") or []
    out: list[dict] = []
    for entry in entries:
        resource = entry.get("resource")
        if isinstance(resource, dict) and resource.get("resourceType") == "Observation":
            out.append(resource)
    return out
