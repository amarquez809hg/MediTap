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

logger = logging.getLogger(__name__)
User = get_user_model()


def _frontend_base() -> str:
    base = (getattr(settings, "MEDITAP_FRONTEND_URL", "") or "").strip().rstrip("/")
    return base or "http://localhost:8100"


def _support_inbox() -> str:
    return (getattr(settings, "MEDITAP_SUPPORT_INBOX", "") or "").strip() or "support@meditap.ai"


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
    subject = serializers.CharField(max_length=300, trim_whitespace=True)
    message = serializers.CharField(max_length=8000, trim_whitespace=True)


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
    inbox = _support_inbox()
    subject = f"[MediTap Support] {data['subject']}"
    body = (
        f"From: {data['name']} <{data['email']}>\n\n"
        f"{data['message']}\n"
    )
    try:
        send_mail(
            subject,
            body,
            _from_email(),
            [inbox],
            reply_to=[data["email"]],
            fail_silently=False,
        )
        auto_subject = "We received your MediTap support request"
        auto_body = (
            f"Hi {data['name']},\n\n"
            f"Thank you for contacting MediTap. We received your message about "
            f"\"{data['subject']}\" and aim to reply within one business day.\n\n"
            f"— MediTap Support\n"
        )
        _send_user_email(subject=auto_subject, message=auto_body, recipient=data["email"])
    except Exception:
        logger.exception("support_contact: failed to send mail")
        return Response(
            {"detail": "Could not send your message right now. Email support@meditap.ai directly."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            "detail": (
                "Thank you. We received your message and will respond within one business day."
            )
        },
        status=status.HTTP_201_CREATED,
    )
