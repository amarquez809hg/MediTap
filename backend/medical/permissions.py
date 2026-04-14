from rest_framework import permissions

from medapp.intake_editor import can_edit_intake_records


class IntakeEditorWritePermission(permissions.BasePermission):
    """
    Safe methods (GET, HEAD, OPTIONS): allowed when combined with IsAuthenticated.
    POST/PATCH/DELETE: require Django superuser, realm meditap-record-editor, or staff elevation.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return can_edit_intake_records(request)
