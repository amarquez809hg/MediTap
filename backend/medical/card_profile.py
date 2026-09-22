"""Issue and resolve NFC card links for a limited public patient profile."""

from __future__ import annotations

import hashlib
import re
import secrets
from typing import Any

from django.conf import settings
from django.utils import timezone

from .models import Patient, PatientCard

_UID_RE = re.compile(r"^[0-9A-F]{8}$|^[0-9A-F]{14}$|^[0-9A-F]{20}$")


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def normalize_uid(raw: str) -> str:
    compact = re.sub(r"[^0-9A-Fa-f]", "", (raw or "").strip()).upper()
    if not _UID_RE.match(compact):
        raise ValueError("Card UID must be 4, 7, or 10 bytes of hex (8, 14, or 20 digits).")
    return compact


def frontend_base(override: str | None = None) -> str:
    base = (override or getattr(settings, "MEDITAP_FRONTEND_URL", "") or "").strip().rstrip("/")
    return base or "http://localhost:8100"


def profile_url(token: str, base_url: str | None = None) -> str:
    return f"{frontend_base(base_url)}/card/{token}"


def issue_card(
    *,
    patient: Patient,
    issued_by,
    label: str = "",
    base_url: str | None = None,
) -> tuple[PatientCard, str, str]:
    token = secrets.token_urlsafe(32)
    card = PatientCard.objects.create(
        patient=patient,
        token_hash=hash_token(token),
        label=(label or "").strip()[:80],
        issued_by=issued_by if getattr(issued_by, "is_authenticated", False) else None,
    )
    return card, token, profile_url(token, base_url)


def card_for_token(token: str) -> PatientCard | None:
    digest = hash_token(token or "")
    return (
        PatientCard.objects.select_related("patient")
        .filter(token_hash=digest, revoked_at__isnull=True)
        .first()
    )


def public_profile(card: PatientCard) -> dict[str, Any]:
    patient = card.patient
    allergies = [
        {
            "name": row.allergy.name,
            "severity": row.severity or None,
        }
        for row in patient.allergies.select_related("allergy").order_by("allergy__name")
    ]
    given = (patient.emergency_contact_given_name or "").strip()
    family = (patient.emergency_contact_family_name or "").strip()
    contact_name = " ".join(part for part in (given, family) if part)
    contact = None
    if contact_name or patient.emergency_contact_phone or patient.emergency_contact_relationship:
        contact = {
            "name": contact_name or None,
            "relationship": patient.emergency_contact_relationship or None,
            "phone": patient.emergency_contact_phone or None,
        }
    return {
        "given_name": patient.given_name,
        "family_name": patient.family_name,
        "date_of_birth": patient.date_of_birth.isoformat(),
        "blood_type": patient.blood_type or None,
        "allergies": allergies,
        "emergency_contact": contact,
    }


def bind_uid(card: PatientCard, raw_uid: str) -> PatientCard:
    card.card_uid = normalize_uid(raw_uid)
    card.save(update_fields=["card_uid"])
    return card


def revoke_card(card: PatientCard) -> PatientCard:
    if card.revoked_at is None:
        card.revoked_at = timezone.now()
        card.save(update_fields=["revoked_at"])
    return card
