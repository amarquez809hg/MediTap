"""
Support form option catalogs (Cargo Pulse / MediTap pattern).
"""

from __future__ import annotations

SUPPORT_USER_TYPES: tuple[tuple[str, str], ...] = (
    ("visitor", "Visitor / not signed in"),
    ("patient", "Patient"),
    ("staff", "Staff or administrator"),
)

SUPPORT_PROBLEM_CATEGORIES: tuple[tuple[str, str], ...] = (
    ("account", "Account — sign in, sign up, or password"),
    ("intake", "Patient intake or demographics"),
    ("document_upload", "PDF upload or document parsing"),
    ("epic_integration", "Epic FHIR linking or health record sync"),
    ("staff_access", "Staff editing, roles, or admin panel"),
    ("clinical_data", "Appointments, labs, or health record tabs"),
    ("technical", "Website error or technical issue"),
    ("privacy_security", "Privacy, HIPAA, or account security"),
    ("other", "Something else — describe below"),
)

SUPPORT_USER_TYPE_VALUES = {value for value, _ in SUPPORT_USER_TYPES}
SUPPORT_PROBLEM_VALUES = {value for value, _ in SUPPORT_PROBLEM_CATEGORIES}

_USER_TYPE_LABELS = dict(SUPPORT_USER_TYPES)
_PROBLEM_LABELS = dict(SUPPORT_PROBLEM_CATEGORIES)


def user_type_label(value: str) -> str:
    return _USER_TYPE_LABELS.get(value, value)


def problem_category_label(value: str) -> str:
    return _PROBLEM_LABELS.get(value, value)
