"""Portal user UI preferences (language, theme, notifications) scoped to Django User."""

from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from medical.models import PortalUserPreferences
from medical.serializers import PortalUserPreferencesSerializer


def _preferences_for_user(user) -> PortalUserPreferences:
    prefs, _ = PortalUserPreferences.objects.get_or_create(user=user)
    return prefs


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_preferences(request):
    prefs = _preferences_for_user(request.user)

    if request.method == "GET":
        return Response(PortalUserPreferencesSerializer(prefs).data)

    ser = PortalUserPreferencesSerializer(prefs, data=request.data, partial=True)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data)
