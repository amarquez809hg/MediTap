"""
MediTap accounts: Django users + SimpleJWT (browser stores access/refresh tokens).

Register + /api/auth/me/; login uses /api/auth/token/; refresh uses MediTapTokenRefreshView
(MediTap access tokens include is_staff, is_superuser, realm_access.roles).
"""

from __future__ import annotations

import re

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class MediTapTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Claims shaped for the SPA: stable `sub`, profile hints, and `realm_access.roles` (Django groups)."""

    def validate(self, attrs):
        """Allow the `username` field to contain a registered email address."""
        raw = attrs.get("username")
        if isinstance(raw, str):
            candidate = raw.strip()
            if "@" in candidate:
                email = candidate.lower()
                user = User.objects.filter(email__iexact=email).order_by("pk").first()
                if user is not None:
                    attrs["username"] = user.get_username()
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["sub"] = str(user.pk)
        token["username"] = user.get_username()
        if user.email:
            token["email"] = user.email
        if user.first_name:
            token["given_name"] = user.first_name
        if user.last_name:
            token["family_name"] = user.last_name
        editor = (getattr(settings, "MEDITAP_RECORD_EDITOR_ROLE", "") or "").strip() or (
            "meditap-record-editor"
        )
        role_names = list(user.groups.values_list("name", flat=True))
        if user.is_superuser and editor not in role_names:
            role_names = [*role_names, editor]
        token["realm_access"] = {"roles": role_names}
        token["is_staff"] = bool(user.is_staff)
        token["is_superuser"] = bool(user.is_superuser)
        return token


class MediTapTokenObtainPairView(TokenObtainPairView):
    serializer_class = MediTapTokenObtainPairSerializer


class MediTapTokenRefreshSerializer(TokenRefreshSerializer):
    """Rotated access/refresh tokens carry the same MediTap custom claims as login."""

    def validate(self, attrs):
        refresh = self.token_class(attrs["refresh"])
        user_id = refresh.payload.get(api_settings.USER_ID_CLAIM, None)
        if not user_id:
            return super().validate(attrs)
        UserModel = get_user_model()
        try:
            user = UserModel.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except UserModel.DoesNotExist as e:
            raise AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            ) from e
        if not api_settings.USER_AUTHENTICATION_RULE(user):
            raise AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            )

        mt_refresh = MediTapTokenObtainPairSerializer.get_token(user)
        data: dict[str, str] = {"access": str(mt_refresh.access_token)}

        if api_settings.ROTATE_REFRESH_TOKENS:
            if api_settings.BLACKLIST_AFTER_ROTATION:
                try:
                    refresh.blacklist()
                except AttributeError:
                    pass
            data["refresh"] = str(mt_refresh)
        return data


class MediTapTokenRefreshView(TokenRefreshView):
    serializer_class = MediTapTokenRefreshSerializer


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    password_confirm = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_username(self, value: str) -> str:
        v = value.strip()
        if not re.match(r"^[\w.@+-]+$", v):
            raise serializers.ValidationError("Username may only contain letters, digits, and @/./+/-/_")
        if User.objects.filter(username__iexact=v).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return v

    def validate_email(self, value: str) -> str:
        e = value.strip().lower()
        if User.objects.filter(email__iexact=e).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return e

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)}) from e
        return attrs


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    ser = RegisterSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    data = ser.validated_data
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=data["username"],
                email=data["email"],
                password=data["password"],
            )
    except IntegrityError:
        return Response(
            {"detail": "Could not create user (duplicate)."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {"id": user.pk, "username": user.get_username(), "email": user.email or ""},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_me(request):
    u = request.user
    return Response(
        {
            "id": u.pk,
            "username": u.get_username(),
            "email": u.email or "",
            "is_staff": bool(u.is_staff),
            "is_superuser": bool(u.is_superuser),
        }
    )
