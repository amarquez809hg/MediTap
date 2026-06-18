"""Encrypt Epic OAuth tokens at rest (Fernet keyed from Django SECRET_KEY or override)."""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet() -> Fernet:
    raw = (
        getattr(settings, "EPIC_TOKEN_ENCRYPTION_KEY", "") or settings.SECRET_KEY
    ).encode("utf-8")
    key = base64.urlsafe_b64encode(hashlib.sha256(raw).digest())
    return Fernet(key)


def encrypt_epic_token(plain: str) -> str:
    if not plain:
        return ""
    return _fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt_epic_token(cipher: str) -> str:
    if not cipher:
        return ""
    try:
        return _fernet().decrypt(cipher.encode("ascii")).decode("utf-8")
    except InvalidToken as e:
        raise ValueError("Could not decrypt Epic token.") from e


def clear_epic_tokens(link) -> None:
    link.access_token_encrypted = ""
    link.refresh_token_encrypted = ""
    link.access_token_expires_at = None
