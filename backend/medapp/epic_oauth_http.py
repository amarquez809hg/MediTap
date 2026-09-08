"""Shared Epic OAuth token endpoint HTTP helpers."""

from __future__ import annotations

import base64
import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings


def epic_token_form_post(form: dict[str, str]) -> dict:
    """
    POST to Epic's token URL.

    When EPIC_CLIENT_SECRET is set, Epic expects HTTP Basic auth (client_id:secret)
    for confidential clients — especially when refresh tokens / offline_access are used.
    """
    url = (getattr(settings, "EPIC_TOKEN_URL", "") or "").strip()
    if not url:
        raise ValueError("Epic token URL is not configured on the server.")

    payload = dict(form)
    client_id = (getattr(settings, "EPIC_CLIENT_ID", "") or "").strip()
    secret = (getattr(settings, "EPIC_CLIENT_SECRET", None) or "").strip()

    req = urllib.request.Request(url, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    if secret:
        creds = base64.b64encode(f"{client_id}:{secret}".encode()).decode("ascii")
        req.add_header("Authorization", f"Basic {creds}")
        payload.pop("client_secret", None)
    elif "client_secret" in payload:
        payload.pop("client_secret", None)

    req.data = urllib.parse.urlencode(payload).encode()

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode(errors="replace")
        raise ValueError(f"HTTP {e.code}: {err_body[:800]}") from e
