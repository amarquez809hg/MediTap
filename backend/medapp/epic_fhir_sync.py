"""Map Epic FHIR Patient + Observation resources into MediTap Patient fields."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from django.utils import timezone

from medical import models

from .epic_fhir_client import read_patient_resource, read_vital_observations

# LOINC codes used for vitals mapping (Epic sandbox / US Core).
LOINC_HEIGHT = "8302-2"
LOINC_WEIGHT = "29463-7"
LOINC_SYSTOLIC = "8480-6"
LOINC_DIASTOLIC = "8462-4"
LOINC_HEART_RATE = "8867-4"


def _coding_codes(code_obj: dict | None) -> list[str]:
    if not isinstance(code_obj, dict):
        return []
    out: list[str] = []
    for c in code_obj.get("coding") or []:
        if isinstance(c, dict):
            code = c.get("code")
            if isinstance(code, str) and code.strip():
                out.append(code.strip())
    return out


def _obs_codes(obs: dict) -> list[str]:
    return _coding_codes(obs.get("code"))


def _quantity_value(qty: dict | None) -> tuple[float | None, str | None]:
    if not isinstance(qty, dict):
        return None, None
    val = qty.get("value")
    unit = qty.get("unit") or qty.get("code")
    try:
        return float(val), str(unit) if unit is not None else None
    except (TypeError, ValueError):
        return None, None


def _to_cm(value: float, unit: str | None) -> Decimal | None:
    u = (unit or "").lower()
    if u in ("cm", "centimeter", "centimeters"):
        cm = value
    elif u in ("m", "meter", "meters"):
        cm = value * 100.0
    elif u in ("[in_i]", "in", "inch", "inches"):
        cm = value * 2.54
    elif u in ("[ft_i]", "ft", "foot", "feet"):
        cm = value * 30.48
    else:
        cm = value
    try:
        return Decimal(str(round(cm, 2)))
    except InvalidOperation:
        return None


def _to_kg(value: float, unit: str | None) -> Decimal | None:
    u = (unit or "").lower()
    if u in ("kg", "kilogram", "kilograms"):
        kg = value
    elif u in ("g", "gram", "grams"):
        kg = value / 1000.0
    elif u in ("lb", "lbs", "[lb_av]", "pound", "pounds"):
        kg = value * 0.45359237
    else:
        kg = value
    try:
        return Decimal(str(round(kg, 2)))
    except InvalidOperation:
        return None


def _parse_fhir_date(raw: str | None) -> date | None:
    if not raw or not isinstance(raw, str):
        return None
    part = raw.strip()[:10]
    try:
        return date.fromisoformat(part)
    except ValueError:
        return None


def _parse_effective_datetime(obs: dict) -> datetime | None:
    eff = obs.get("effectiveDateTime") or obs.get("issued")
    if isinstance(eff, str):
        try:
            if eff.endswith("Z"):
                eff = eff[:-1] + "+00:00"
            return datetime.fromisoformat(eff.replace("Z", "+00:00"))
        except ValueError:
            return None
    period = obs.get("effectivePeriod")
    if isinstance(period, dict):
        start = period.get("start")
        if isinstance(start, str):
            try:
                if start.endswith("Z"):
                    start = start[:-1] + "+00:00"
                return datetime.fromisoformat(start.replace("Z", "+00:00"))
            except ValueError:
                return None
    return None


def _patient_name(resource: dict) -> tuple[str, str]:
    names = resource.get("name") or []
    chosen = None
    for n in names:
        if isinstance(n, dict) and n.get("use") == "official":
            chosen = n
            break
    if chosen is None and names:
        chosen = names[0] if isinstance(names[0], dict) else None
    if not chosen:
        return "", ""
    given_parts = chosen.get("given") or []
    given = " ".join(g for g in given_parts if isinstance(g, str)).strip()
    family = (chosen.get("family") or "").strip() if isinstance(chosen.get("family"), str) else ""
    return given, family


def _patient_telecom(resource: dict) -> tuple[str, str]:
    phone = ""
    email = ""
    for t in resource.get("telecom") or []:
        if not isinstance(t, dict):
            continue
        system = (t.get("system") or "").lower()
        val = (t.get("value") or "").strip()
        if not val:
            continue
        if system == "phone" and not phone:
            phone = val
        elif system == "email" and not email:
            email = val
    return phone, email


def _patient_address(resource: dict) -> str:
    for addr in resource.get("address") or []:
        if not isinstance(addr, dict):
            continue
        lines = [ln for ln in (addr.get("line") or []) if isinstance(ln, str) and ln.strip()]
        city = addr.get("city") or ""
        state = addr.get("state") or ""
        postal = addr.get("postalCode") or ""
        parts = lines + [p for p in (city, state, postal) if isinstance(p, str) and p.strip()]
        if parts:
            return ", ".join(str(p).strip() for p in parts)
    return ""


def _gender_label(resource: dict) -> str:
    g = (resource.get("gender") or "").lower()
    if g == "male":
        return "Male"
    if g == "female":
        return "Female"
    if g == "other":
        return "Other"
    if g == "unknown":
        return "Unknown"
    return ""


def apply_patient_resource(patient: models.Patient, resource: dict) -> list[str]:
    updated: list[str] = []
    given, family = _patient_name(resource)
    if given and patient.given_name != given:
        patient.given_name = given[:100]
        updated.append("given_name")
    if family and patient.family_name != family:
        patient.family_name = family[:100]
        updated.append("family_name")

    dob = _parse_fhir_date(resource.get("birthDate"))
    if dob and patient.date_of_birth != dob:
        patient.date_of_birth = dob
        updated.append("date_of_birth")

    phone, email = _patient_telecom(resource)
    if phone and patient.phone != phone:
        patient.phone = phone[:32]
        updated.append("phone")
    if email and patient.email != email:
        patient.email = email
        updated.append("email")

    address = _patient_address(resource)
    if address and patient.address != address:
        patient.address = address
        updated.append("address")

    gender = _gender_label(resource)
    if gender and patient.sex_at_birth != gender:
        patient.sex_at_birth = gender[:32]
        updated.append("sex_at_birth")

    return updated


def apply_vital_observations(patient: models.Patient, observations: list[dict]) -> list[str]:
    """Pick the most recent observation per vital type and apply to patient snapshot."""
    updated: list[str] = []
    best: dict[str, tuple[datetime | None, dict]] = {}

    for obs in observations:
        codes = _obs_codes(obs)
        if not codes:
            continue
        when = _parse_effective_datetime(obs)
        for code in codes:
            if code not in (
                LOINC_HEIGHT,
                LOINC_WEIGHT,
                LOINC_SYSTOLIC,
                LOINC_DIASTOLIC,
                LOINC_HEART_RATE,
            ):
                continue
            prev = best.get(code)
            if prev is None or (when and (prev[0] is None or when > prev[0])):
                best[code] = (when, obs)

    height_obs = best.get(LOINC_HEIGHT, (None, {}))[1]
    if height_obs:
        val, unit = _quantity_value(height_obs.get("valueQuantity"))
        if val is not None:
            cm = _to_cm(val, unit)
            if cm is not None and patient.height_cm != cm:
                patient.height_cm = cm
                updated.append("height_cm")

    weight_obs = best.get(LOINC_WEIGHT, (None, {}))[1]
    if weight_obs:
        val, unit = _quantity_value(weight_obs.get("valueQuantity"))
        if val is not None:
            kg = _to_kg(val, unit)
            if kg is not None and patient.weight_kg != kg:
                patient.weight_kg = kg
                updated.append("weight_kg")

    for obs in observations:
        codes = _obs_codes(obs)
        if LOINC_SYSTOLIC in codes or LOINC_DIASTOLIC in codes:
            for comp in obs.get("component") or []:
                if not isinstance(comp, dict):
                    continue
                comp_codes = _coding_codes(comp.get("code"))
                val, _ = _quantity_value(comp.get("valueQuantity"))
                if val is None:
                    continue
                iv = int(round(val))
                if LOINC_SYSTOLIC in comp_codes and patient.systolic_bp != iv:
                    patient.systolic_bp = iv
                    updated.append("systolic_bp")
                if LOINC_DIASTOLIC in comp_codes and patient.diastolic_bp != iv:
                    patient.diastolic_bp = iv
                    updated.append("diastolic_bp")

        if LOINC_SYSTOLIC in codes and "component" not in obs:
            val, _ = _quantity_value(obs.get("valueQuantity"))
            if val is not None:
                iv = int(round(val))
                if patient.systolic_bp != iv:
                    patient.systolic_bp = iv
                    updated.append("systolic_bp")
        if LOINC_DIASTOLIC in codes and "component" not in obs:
            val, _ = _quantity_value(obs.get("valueQuantity"))
            if val is not None:
                iv = int(round(val))
                if patient.diastolic_bp != iv:
                    patient.diastolic_bp = iv
                    updated.append("diastolic_bp")

    hr_obs = best.get(LOINC_HEART_RATE, (None, {}))[1]
    if hr_obs:
        val, _ = _quantity_value(hr_obs.get("valueQuantity"))
        if val is not None:
            iv = int(round(val))
            if patient.heart_rate_bpm != iv:
                patient.heart_rate_bpm = iv
                updated.append("heart_rate_bpm")

    if updated:
        vitals_times = [when for when, _ in best.values() if when]
        patient.vitals_recorded_at = max(vitals_times) if vitals_times else timezone.now()
        if "vitals_recorded_at" not in updated:
            updated.append("vitals_recorded_at")

    return list(dict.fromkeys(updated))


def sync_epic_into_patient(link: models.EpicPatientLink) -> dict:
    """Fetch Patient + vital Observations from Epic and merge into MediTap chart."""
    patient = link.patient
    patient_resource = read_patient_resource(link)
    observations = read_vital_observations(link)

    demo_updates = apply_patient_resource(patient, patient_resource)
    vital_updates = apply_vital_observations(patient, observations)
    all_updates = list(dict.fromkeys(demo_updates + vital_updates))

    if all_updates:
        patient.save(update_fields=all_updates + ["updated_at"])

    summary = {
        "updated_fields": all_updates,
        "observations_read": len(observations),
        "epic_patient_id": link.epic_patient_fhir_id,
    }
    link.last_sync_at = timezone.now()
    link.last_sync_summary = summary
    link.last_error = ""
    link.save(update_fields=["last_sync_at", "last_sync_summary", "last_error", "updated_at"])
    return summary
