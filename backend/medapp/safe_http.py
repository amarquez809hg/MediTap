"""HTTPS-only urllib helpers for outbound Epic / Coverity-style server calls."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from urllib.parse import urlparse


def require_https_url(url: str, *, label: str = "URL") -> str:
    raw = (url or "").strip()
    if not raw:
        raise ValueError(f"{label} is empty.")
    parsed = urlparse(raw)
    if parsed.scheme.lower() != "https":
        raise ValueError(f"{label} must use https:// (got {parsed.scheme or 'none'}).")
    if not parsed.netloc:
        raise ValueError(f"{label} is missing a host.")
    return raw


def https_urlopen(req: urllib.request.Request, *, timeout: int = 60):
    """urlopen that rejects non-https request URLs (SSRF hardening)."""
    require_https_url(req.full_url, label="Request URL")
    return urllib.request.urlopen(req, timeout=timeout)  # nosec B310 — scheme checked above


def https_json_response(req: urllib.request.Request, *, timeout: int = 60) -> dict:
    try:
        with https_urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode(errors="replace")
        raise ValueError(f"HTTP {e.code}: {err_body[:800]}") from e
