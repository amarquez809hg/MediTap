"""
Limit patient-related API rows to the signed-in portal user unless the caller
is staff, a superuser, or has the intake record-editor role (hospital workflows).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.contrib.auth.models import User
from django.db.models import Q, QuerySet

from medapp.intake_editor import patient_has_intake_editor_role

from . import models

if TYPE_CHECKING:
    from rest_framework.request import Request


def user_may_list_all_patients(user: User) -> bool:
    if not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    return False


def scoped_patient_queryset(request: Request) -> QuerySet[models.Patient]:
    user = request.user
    base = models.Patient.objects.all().order_by("-created_at")
    if not user.is_authenticated:
        return base.none()
    if user_may_list_all_patients(user):
        return base
    if patient_has_intake_editor_role(request):
        return base
    email = (getattr(user, "email", None) or "").strip()
    username = (getattr(user, "username", None) or "").strip()
    login_emails = [e for e in (email, username) if e and "@" in e]
    if login_emails:
        email_q = Q()
        for e in login_emails:
            email_q |= Q(portal_user__isnull=True, email__iexact=e)
        return base.filter(Q(portal_user=user) | email_q).distinct()
    return base.filter(portal_user=user)


def allowed_patient_ids(request: Request) -> list[str] | None:
    """
    None = no restriction (staff / record editor). Empty list = no access.
    """
    user = request.user
    if not user.is_authenticated:
        return []
    if user_may_list_all_patients(user) or patient_has_intake_editor_role(request):
        return None
    return [str(pk) for pk in scoped_patient_queryset(request).values_list("patient_id", flat=True)]


def filter_by_allowed_patients(
    request: Request, qs: QuerySet, patient_field: str = "patient_id"
) -> QuerySet:
    ids = allowed_patient_ids(request)
    if ids is None:
        return qs
    if not ids:
        return qs.none()
    return qs.filter(**{f"{patient_field}__in": ids})
