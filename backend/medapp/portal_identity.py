"""Portal role / home resolution for MediTap user vs admin shells."""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser


ROLE_PATIENT = "patient"
ROLE_STAFF = "staff"
ROLE_ORG_ADMIN = "org_admin"

PORTAL_USER = "user"
PORTAL_ADMIN = "admin"

_PERM_PATIENT = (
    "chart:read",
    "chart:write_own",
    "appointments:read",
    "appointments:write_own",
)
_PERM_STAFF = (
    *_PERM_PATIENT,
    "chart:write_elevated",
    "patients:list",
    "admin_portal:access",
)
_PERM_ORG_ADMIN = (
    *_PERM_STAFF,
    "hospitals:manage",
    "integrations:manage",
)


def _record_editor_role_name() -> str:
    return (getattr(settings, "MEDITAP_RECORD_EDITOR_ROLE", "") or "").strip() or (
        "meditap-record-editor"
    )


def _group_names(user: AbstractBaseUser) -> list[str]:
    if not getattr(user, "is_authenticated", False):
        return []
    try:
        return list(user.groups.values_list("name", flat=True))
    except Exception:
        return []


def _hospital_membership(user: AbstractBaseUser) -> tuple[list[str], str | None]:
    """Return (org_ids as strings, HospitalUser.role or None)."""
    try:
        # Reverse OneToOne raises RelatedObjectDoesNotExist when missing.
        hu = user.hospital_user  # type: ignore[attr-defined]
    except Exception:
        return [], None
    try:
        if hu is None or not getattr(hu, "is_active", True):
            return [], None
        hid = getattr(hu, "hospital_id", None)
        org_ids = [str(hid)] if hid is not None else []
        return org_ids, getattr(hu, "role", None)
    except Exception:
        return [], None


def resolve_portal_identity(user: AbstractBaseUser) -> dict[str, Any]:
    """
    Stable portal identity for /api/auth/me/ and JWT claims.

    Roles: patient | staff | org_admin
    portal_home: user | admin
    """
    groups = _group_names(user)
    org_ids, hospital_role = _hospital_membership(user)
    editor = _record_editor_role_name()
    is_super = bool(getattr(user, "is_superuser", False))
    is_staff_flag = bool(getattr(user, "is_staff", False))
    has_editor = editor in groups or is_super
    is_hospital_admin = hospital_role == "HOSPITAL_ADMIN"
    is_hospital_staff = hospital_role == "HOSPITAL_STAFF"

    if is_super or is_hospital_admin:
        role = ROLE_ORG_ADMIN
        permissions = list(_PERM_ORG_ADMIN)
        portal_home = PORTAL_ADMIN
    elif is_staff_flag or has_editor or is_hospital_staff:
        role = ROLE_STAFF
        permissions = list(_PERM_STAFF)
        portal_home = PORTAL_ADMIN
    else:
        role = ROLE_PATIENT
        permissions = list(_PERM_PATIENT)
        portal_home = PORTAL_USER

    return {
        "role": role,
        "org_ids": org_ids,
        "permissions": permissions,
        "portal_home": portal_home,
        "groups": groups,
    }
