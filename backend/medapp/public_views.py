"""
Public-facing APIs: password reset and support contact (Phase 1 trust & friction).
"""

from __future__ import annotations

import logging
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers, status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .support_email import (
    mail_configured,
    send_support_auto_reply,
    send_support_inquiry_email,
    support_contact_email,
)
from .support_options import SUPPORT_PROBLEM_VALUES, SUPPORT_USER_TYPE_VALUES

logger = logging.getLogger(__name__)
User = get_user_model()


def _frontend_base() -> str:
    base = (getattr(settings, "MEDITAP_FRONTEND_URL", "") or "").strip().rstrip("/")
    return base or "http://localhost:8100"


def _from_email() -> str:
    return (getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip() or "noreply@meditap.ai"


def _send_user_email(*, subject: str, message: str, recipient: str) -> None:
    send_mail(
        subject,
        message,
        _from_email(),
        [recipient],
        fail_silently=False,
    )


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, max_length=128)
    password_confirm = serializers.CharField(write_only=True, max_length=128)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        min_len = int(getattr(settings, "MEDITAP_REGISTER_MIN_PASSWORD_LENGTH", 8) or 8)
        if len(attrs["password"]) < min_len:
            raise serializers.ValidationError(
                {
                    "password": [
                        f"This password is too short. It must contain at least {min_len} characters."
                    ]
                }
            )
        return attrs


class SupportContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, trim_whitespace=True)
    email = serializers.EmailField()
    user_type = serializers.ChoiceField(choices=sorted(SUPPORT_USER_TYPE_VALUES))
    problem_category = serializers.ChoiceField(choices=sorted(SUPPORT_PROBLEM_VALUES))
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True, trim_whitespace=True)
    message = serializers.CharField(
        max_length=8000,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )

    def validate(self, attrs):
        category = attrs.get("problem_category", "")
        message = (attrs.get("message") or "").strip()
        if category == "other" and not message:
            raise serializers.ValidationError(
                {"message": "Please describe your issue when selecting Something else."}
            )
        attrs["message"] = message
        attrs["phone"] = (attrs.get("phone") or "").strip()
        return attrs


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def support_config(request):
    """Public support contact details for the SPA."""
    return Response(
        {
            "contact_email": support_contact_email(),
            "mail_configured": mail_configured(),
        }
    )

def _user_from_uid(uid_b64: str) -> User | None:
    try:
        uid = force_str(urlsafe_base64_decode(uid_b64))
        return User.objects.filter(pk=uid).first()
    except (TypeError, ValueError, OverflowError):
        return None


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def password_reset_request(request):
    """
    Request a password reset link by email.
    Always returns success when the payload is valid (avoids account enumeration).
    """
    ser = PasswordResetRequestSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    email = ser.validated_data["email"].strip().lower()
    user = User.objects.filter(email__iexact=email).order_by("pk").first()
    email_sent = False

    if user and user.is_active:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_url = (
            f"{_frontend_base()}/reset-password?"
            f"uid={quote(uid, safe='')}&token={quote(token, safe='')}"
        )
        subject = "Reset your MediTap password"
        body = (
            f"Hello,\n\n"
            f"We received a request to reset the password for your MediTap account "
            f"({user.get_username()}).\n\n"
            f"Open this link to choose a new password (link expires when unused):\n"
            f"{reset_url}\n\n"
            f"If you did not request this, you can ignore this email.\n\n"
            f"— MediTap Support\n"
        )
        try:
            _send_user_email(subject=subject, message=body, recipient=user.email)
            email_sent = True
        except Exception:
            logger.exception("password_reset_request: failed to send email to %s", email)

    return Response(
        {
            "detail": (
                "If an account exists for that email, we sent password reset instructions. "
                "Check your inbox and spam folder."
            ),
            "email_sent": email_sent,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Set a new password using uid + token from the reset email."""
    ser = PasswordResetConfirmSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = ser.validated_data
    user = _user_from_uid(data["uid"])
    if user is None or not user.is_active:
        return Response(
            {"detail": "Invalid or expired reset link. Request a new reset from the log in page."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not default_token_generator.check_token(user, data["token"]):
        return Response(
            {"detail": "Invalid or expired reset link. Request a new reset from the log in page."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not getattr(settings, "MEDITAP_REGISTER_SKIP_PASSWORD_VALIDATORS", False):
        try:
            validate_password(data["password"], user=user)
        except DjangoValidationError as e:
            return Response({"password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(data["password"])
    user.save(update_fields=["password"])
    return Response({"detail": "Your password has been updated. You can log in now."})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def support_contact(request):
    """Forward support form to the configured inbox."""
    ser = SupportContactSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    data = ser.validated_data
    contact_email = support_contact_email()
    try:
        send_support_inquiry_email(data=data)
        send_support_auto_reply(data=data)
    except Exception:
        logger.exception("support_contact: failed to send mail")
        return Response(
            {
                "detail": (
                    f"Could not send your message right now. Email {contact_email} directly."
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            "detail": (
                "Thank you. We received your support request and will respond within "
                "one business day."
            )
        },
        status=status.HTTP_201_CREATED,
    )
