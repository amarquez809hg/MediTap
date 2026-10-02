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


class OwnChartOrIntakeEditorPermission(permissions.BasePermission):
    """
    Staff/editor/elevation may write any chart.
    A patient may PATCH their own Patient row (portal_user == request.user) so PDF
    intake can be saved from the user portal without staff elevation.
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
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return False
        return getattr(obj, "portal_user_id", None) == user.pk
