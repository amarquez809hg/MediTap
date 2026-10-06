from rest_framework import permissions

from medapp.intake_editor import can_edit_intake_records


class IntakeEditorWritePermission(permissions.BasePermission):
    """
    Safe methods (GET, HEAD, OPTIONS): allowed when combined with IsAuthenticated.
    POST/PATCH/DELETE: staff / record-editor / elevation only (admin portal chart edits).
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return can_edit_intake_records(request)


def _user_login_emails(user) -> set[str]:
    emails: set[str] = set()
    for raw in (
        getattr(user, "email", None),
        getattr(user, "username", None),
    ):
        v = (raw or "").strip().lower()
        if v and "@" in v:
            emails.add(v)
    return emails


def user_may_write_patient_chart(user, patient) -> bool:
    """True when this login owns the chart or may claim an unlinked matching chart."""
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if getattr(patient, "portal_user_id", None) == user.pk:
        return True
    if getattr(patient, "portal_user_id", None) is not None:
        return False
    patient_email = (getattr(patient, "email", None) or "").strip().lower()
    if not patient_email:
        return False
    return patient_email in _user_login_emails(user)


class AuthenticatedCatalogWritePermission(permissions.BasePermission):
    """
    GET is open to signed-in users.
    POST/PATCH: any authenticated user may add catalog rows used by PDF intake
    (hospitals, insurance providers/policies). Deletes stay staff-only.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if can_edit_intake_records(request):
            return True
        if request.method in ("POST", "PUT", "PATCH"):
            user = getattr(request, "user", None)
            return bool(user is not None and user.is_authenticated)
        return False


class OwnChartRelatedWritePermission(permissions.BasePermission):
    """
    Staff may write any related clinical row.
    A patient may POST/PATCH/DELETE rows on their own chart so PDF intake
    Save can populate Labs, Incidents, Insurance, and other dashboard tabs.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if can_edit_intake_records(request):
            return True
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return False
        if request.method != "POST":
            return True
        pid = request.data.get("patient") if hasattr(request, "data") else None
        if not pid:
            return False
        from .models import Patient

        patient = Patient.objects.filter(patient_id=pid).first()
        return user_may_write_patient_chart(user, patient)

    def has_object_permission(self, request, view, obj):
        if can_edit_intake_records(request):
            return True
        patient = getattr(obj, "patient", None)
        return user_may_write_patient_chart(getattr(request, "user", None), patient)


class OwnChartOrIntakeEditorPermission(permissions.BasePermission):
    """
    Staff/editor/elevation may write any chart.
    A patient may PATCH their own Patient row (portal_user match) or claim an
    unlinked chart whose email matches their login — so PDF intake Save works
    from the user portal without staff elevation.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if can_edit_intake_records(request):
            return True
        user = getattr(request, "user", None)
        return bool(user is not None and user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if can_edit_intake_records(request):
            return True
        return user_may_write_patient_chart(getattr(request, "user", None), obj)
