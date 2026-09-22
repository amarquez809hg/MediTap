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


def sun_enabled(card: PatientCard) -> bool:
    return bool(card.sdm_meta_key and card.sdm_file_key)


def card_for_token(token: str) -> PatientCard | None:
    digest = hash_token(token or "")
    card = (
        PatientCard.objects.select_related("patient")
        .filter(token_hash=digest, revoked_at__isnull=True)
        .first()
    )
    if card is None or sun_enabled(card):
        return None
    return card


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


def _iso(value) -> str | None:
    if value is None or value == "":
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def chart_profile(card: PatientCard) -> dict[str, Any]:
    """Full chart for a one-time SUN tap. Omits passwords, tokens, and card keys."""
    patient = card.patient
    profile = public_profile(card)
    contact = profile.get("emergency_contact")
    if contact is not None:
        contact["email"] = patient.emergency_contact_email or None
    profile.update(
        {
            "email": patient.email or None,
            "phone": patient.phone or None,
            "address": patient.address or None,
            "sex_at_birth": patient.sex_at_birth or None,
            "legal_sex": patient.legal_sex or None,
            "gender_identity": patient.gender_identity or None,
            "sexual_orientation": patient.sexual_orientation or None,
            "race": patient.race or None,
            "ethnicity": patient.ethnicity or None,
            "preferred_language": patient.preferred_language or None,
            "marital_status": patient.marital_status or None,
            "other_notes": patient.other_notes or None,
            "portal_username": getattr(getattr(patient, "portal_user", None), "username", None),
            "vitals": {
                "height_cm": _iso(patient.height_cm),
                "weight_kg": _iso(patient.weight_kg),
                "systolic_bp": patient.systolic_bp,
                "diastolic_bp": patient.diastolic_bp,
                "heart_rate_bpm": patient.heart_rate_bpm,
                "temperature_f": _iso(patient.temperature_f),
                "respiratory_rate": patient.respiratory_rate,
                "oxygen_saturation_pct": patient.oxygen_saturation_pct,
                "body_mass_index": _iso(patient.body_mass_index),
                "recorded_at": _iso(patient.vitals_recorded_at),
            },
            "medications": [
                {
                    "name": row.medication.generic_name,
                    "dosage": row.dosage or None,
                    "route": row.route or None,
                    "frequency": row.frequency or None,
                    "instructions": row.dosing_instructions or None,
                    "notes": row.notes or None,
                    "start_date": _iso(row.start_date),
                    "end_date": _iso(row.end_date),
                }
                for row in patient.medications.select_related("medication").order_by("medication__generic_name")
            ],
            "conditions": [
                {
                    "name": row.disease.name,
                    "severity": row.severity or None,
                    "active": row.is_active,
                    "diagnosed_on": _iso(row.diagnosis_date),
                    "notes": row.notes or None,
                }
                for row in patient.chronic_conditions.select_related("disease").order_by("disease__name")
            ],
            "insurance": [
                {
                    "provider": row.policy.provider.name,
                    "plan": row.policy.plan_name or None,
                    "policy_number": row.policy.policy_number,
                    "member_id": row.member_id or None,
                    "phone": row.policy.provider.phone or None,
                }
                for row in patient.policies.select_related("policy__provider").order_by("policy__provider__name")
            ],
            "appointments": [
                {
                    "when": " ".join(part for part in (row.date_label, row.time_label) if part),
                    "specialist": row.specialist,
                    "department": row.department or None,
                    "status": row.status or None,
                    "reason": row.reason_for_visit or None,
                    "location": row.location or None,
                }
                for row in patient.appointments.order_by("-created_at")[:20]
            ],
            "labs": [
                {
                    "name": row.test_name,
                    "collected_on": _iso(row.collected_on),
                    "status": row.status or None,
                    "notes": row.notes or None,
                    "impression": row.impression or None,
                    "components": [
                        {
                            "name": item.get("name"),
                            "value": item.get("value") if item.get("value") not in (None, "") else item.get("textValue"),
                            "unit": item.get("unit") or None,
                            "range": item.get("range") or None,
                        }
                        for item in (row.components if isinstance(row.components, list) else [])
                        if isinstance(item, dict)
                    ],
                }
                for row in patient.lab_panels.order_by("-collected_on")[:20]
            ],
            "visits": [
                {
                    "occurred_at": _iso(row.occurred_at),
                    "type": row.incident_type,
                    "summary": row.summary,
                    "clinical_notes": row.clinical_notes or None,
                    "diagnosis_code": row.diagnosis_code or None,
                    "home_instructions": row.home_instructions or None,
                    "hospital": row.hospital.name if row.hospital_id else None,
                }
                for row in patient.incidents.select_related("hospital").order_by("-occurred_at")[:20]
            ],
        }
    )
    return profile


def assign_active_card(patient: Patient) -> PatientCard:
    """Point the physical card at this patient. The link on the plastic stays the same."""
    active = PatientCard.objects.filter(revoked_at__isnull=True)
    card = active.exclude(card_uid="").order_by("-created_at").first() or active.order_by("-created_at").first()
    if card is None:
        raise ValueError("No active card to assign. Issue one before assigning a patient.")
    card.patient = patient
    card.save(update_fields=["patient"])
    return card


def accept_sun_tap(card: PatientCard, picc_hex: str, cmac_hex: str) -> dict[str, Any]:
    """Check one changing tap and remember its counter. Raises SunError on reject."""
    from .sun_crypto import SunError, open_sun

    if card.revoked_at is not None or not sun_enabled(card):
        raise SunError("This card link is not active.")
    try:
        meta = bytes.fromhex(card.sdm_meta_key)
        file_key = bytes.fromhex(card.sdm_file_key)
    except ValueError as exc:
        raise SunError("Stored SDM key is not hex.") from exc
    tap = open_sun(meta, file_key, picc_hex, cmac_hex)
    uid = tap.uid.hex().upper()
    if card.card_uid and card.card_uid != uid:
        raise SunError("This tap is for a different card.")
    if tap.read_ctr <= card.sdm_read_counter:
        raise SunError("This tap was already used.")
    card.sdm_read_counter = tap.read_ctr
    update = ["sdm_read_counter"]
    if not card.card_uid:
        card.card_uid = uid
        update.append("card_uid")
    card.save(update_fields=update)
    return chart_profile(card)
