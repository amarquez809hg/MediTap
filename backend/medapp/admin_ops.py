"""Helpers for admin on-behalf patient context and activity logging."""

from __future__ import annotations

import uuid
from typing import Any

from django.contrib.auth.models import User

from medical import models
from medical.patient_api_scoping import user_may_list_all_patients
from medapp.intake_editor import patient_has_intake_editor_role


HEADER_PATIENT_ID = "HTTP_X_MEDITAP_PATIENT_ID"


def request_admin_patient_id(request) -> str | None:
    raw = (request.META.get(HEADER_PATIENT_ID) or "").strip()
    if not raw:
        return None
    try:
        return str(uuid.UUID(raw))
    except (ValueError, TypeError, AttributeError):
        return None


def user_is_admin_operator(request) -> bool:
    user = getattr(request, "user", None)
    if user is None or not user.is_authenticated:
        return False
    return bool(
        user_may_list_all_patients(user) or patient_has_intake_editor_role(request)
    )


def log_admin_activity(
    *,
    actor: User | None,
    action: str,
    patient_id: str | None = None,
    detail: dict[str, Any] | None = None,
) -> models.AdminActivityEvent | None:
    patient = None
    if patient_id:
        try:
            patient = models.Patient.objects.filter(patient_id=patient_id).first()
        except Exception:
            patient = None
    try:
        return models.AdminActivityEvent.objects.create(
            actor=actor if getattr(actor, "is_authenticated", False) else None,
            action=(action or "unknown")[:64],
            patient=patient,
            detail=detail or {},
        )
    except Exception:
        return None
