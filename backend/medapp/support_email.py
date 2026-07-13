"""
Outbound email for MediTap support contact (Cargo Pulse / Lomont pattern).
"""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone

from .support_options import problem_category_label, user_type_label

logger = logging.getLogger(__name__)


def support_inbox() -> str:
    inbox = (getattr(settings, "MEDITAP_SUPPORT_INBOX", "") or "").strip()
    if inbox:
        return inbox
    return (getattr(settings, "MEDITAP_SUPPORT_CONTACT_EMAIL", "") or "").strip()


def support_contact_email() -> str:
    return (
        (getattr(settings, "MEDITAP_SUPPORT_CONTACT_EMAIL", "") or "").strip()
        or support_inbox()
        or "support@meditap.ai"
    )


def from_email() -> str:
    return (getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip() or "noreply@meditap.ai"


def mail_configured() -> bool:
    backend = (getattr(settings, "EMAIL_BACKEND", "") or "").strip()
    if "console" in backend:
        return True
    return bool(
        (getattr(settings, "EMAIL_HOST_USER", "") or "").strip()
        and (getattr(settings, "EMAIL_HOST_PASSWORD", "") or "").strip()
    )


def send_support_inquiry_email(*, data: dict[str, Any]) -> bool:
    """Forward a support form submission to the configured MediTap inbox."""
    inbox = support_inbox()
    if not inbox:
        logger.warning("Support inquiry from %s but no inbox is configured.", data.get("email"))
        return False

    submitted_local = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M %Z")
    category = problem_category_label(data["problem_category"])
    subject = f"[MediTap Support] {category} — {data['email']}"
    body = "\n".join(
        [
            "New support request on meditap.ai",
            "",
            f"Issue: {category}",
            f"User type: {user_type_label(data['user_type'])}",
            f"Name: {data.get('name') or '—'}",
            f"Email: {data['email']}",
            f"Phone: {data.get('phone') or '—'}",
            "",
            "Message:",
            (data.get("message") or "").strip() or "—",
            "",
            f"Submitted: {submitted_local}",
        ]
    )

    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email(),
        to=[inbox],
        reply_to=[data["email"]],
    )
    message.send(fail_silently=False)
    logger.info("Support inquiry from %s emailed to %s", data["email"], inbox)
    return True


def send_support_auto_reply(*, data: dict[str, Any]) -> None:
    category = problem_category_label(data["problem_category"])
    subject = "We received your MediTap support request"
    body = (
        f"Hi {data['name']},\n\n"
        f"Thank you for contacting MediTap. We received your request about "
        f"\"{category}\" and aim to reply within one business day.\n\n"
        f"If you need urgent clinical care, contact your provider or emergency services "
        f"directly — MediTap support cannot provide medical advice.\n\n"
        f"— MediTap Support\n"
        f"{support_contact_email()}\n"
    )
    EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email(),
        to=[data["email"]],
    ).send(fail_silently=False)
