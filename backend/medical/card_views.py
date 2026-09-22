"""Authenticated card issuance and the public profile a tap opens."""

from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from medapp.admin_ops import user_is_admin_operator

from .card_profile import (
    accept_sun_tap,
    assign_active_card,
    bind_uid,
    card_for_token,
    issue_card,
    public_profile,
    revoke_card,
)
from .models import Patient, PatientCard
from .sun_crypto import SunError


def _can_manage(request, patient: Patient) -> bool:
    return user_is_admin_operator(request) and patient is not None


def _card_summary(card: PatientCard) -> dict:
    return {
        "card_id": str(card.card_id),
        "patient_id": str(card.patient_id),
        "card_uid": card.card_uid,
        "label": card.label,
        "revoked_at": card.revoked_at.isoformat() if card.revoked_at else None,
        "created_at": card.created_at.isoformat(),
    }


def _managed_card(request, card_id):
    card = get_object_or_404(PatientCard.objects.select_related("patient"), card_id=card_id)
    if not _can_manage(request, card.patient):
        return None
    return card


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def patient_card_directory(request):
    """Every chart, for staff who assign the physical card."""
    if not user_is_admin_operator(request):
        return Response({"detail": "Staff sign-in is required."}, status=403)
    patients = Patient.objects.select_related("portal_user").prefetch_related("cards").order_by(
        "family_name", "given_name"
    )
    rows = []
    for patient in patients:
        username = patient.portal_user.username if patient.portal_user_id else ""
        rows.append(
            {
                "patient_id": str(patient.patient_id),
                "given_name": patient.given_name,
                "family_name": patient.family_name,
                "date_of_birth": patient.date_of_birth.isoformat(),
                "email": patient.email or "",
                "username": username,
                "cards": [
                    _card_summary(card)
                    for card in patient.cards.all()
                    if card.revoked_at is None
                ],
            }
        )
    return Response(rows)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assign_patient_card(request):
    if not user_is_admin_operator(request):
        return Response({"detail": "Staff sign-in is required."}, status=403)
    patient_id = (request.data.get("patient") or request.data.get("patient_id") or "").strip()
    if not patient_id:
        return Response({"detail": "patient is required."}, status=400)
    patient = get_object_or_404(Patient, patient_id=patient_id)
    try:
        card = assign_active_card(patient)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)
    body = _card_summary(card)
    body["patient_name"] = f"{patient.given_name} {patient.family_name}".strip()
    return Response(body)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def patient_cards(request):
    if request.method == "GET":
        patient_id = (request.query_params.get("patient") or "").strip()
        if not patient_id:
            return Response({"detail": "Query parameter patient is required."}, status=400)
        patient = get_object_or_404(Patient, patient_id=patient_id)
        if not _can_manage(request, patient):
            return Response({"detail": "You cannot view cards for this patient."}, status=403)
        rows = PatientCard.objects.filter(patient=patient).order_by("-created_at")
        return Response([_card_summary(row) for row in rows])

    patient_id = (request.data.get("patient") or request.data.get("patient_id") or "").strip()
    if not patient_id:
        return Response({"detail": "patient is required."}, status=400)
    patient = get_object_or_404(Patient, patient_id=patient_id)
    if not _can_manage(request, patient):
        return Response({"detail": "You cannot issue a card for this patient."}, status=403)
    label = str(request.data.get("label") or "")
    base_url = str(request.data.get("base_url") or "").strip() or None
    card, token, url = issue_card(
        patient=patient,
        issued_by=request.user,
        label=label,
        base_url=base_url,
    )
    body = _card_summary(card)
    body["token"] = token
    body["url"] = url
    return Response(body, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bind_patient_card_uid(request, card_id):
    card = _managed_card(request, card_id)
    if card is None:
        return Response({"detail": "You cannot update this card."}, status=403)
    raw_uid = str(request.data.get("card_uid") or "")
    try:
        bind_uid(card, raw_uid)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)
    return Response(_card_summary(card))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def revoke_patient_card(request, card_id):
    card = _managed_card(request, card_id)
    if card is None:
        return Response({"detail": "You cannot revoke this card."}, status=403)
    revoke_card(card)
    return Response(_card_summary(card))


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def card_profile(request, token):
    card = card_for_token(token)
    if card is None:
        return Response({"detail": "This card link is not active."}, status=404)
    return Response(public_profile(card))


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def card_sun_profile(request, card_id):
    """Open the limited profile for one DESFire SUN tap. A repeated URL is rejected."""
    picc = str(request.query_params.get("picc_data") or "")
    cmac = str(request.query_params.get("cmac") or "")
    if not picc or not cmac:
        return Response({"detail": "This card link is not active."}, status=404)
    try:
        with transaction.atomic():
            card = (
                PatientCard.objects.select_for_update()
                .select_related("patient")
                .filter(card_id=card_id)
                .first()
            )
            if card is None:
                return Response({"detail": "This card link is not active."}, status=404)
            profile = accept_sun_tap(card, picc, cmac)
    except SunError:
        return Response({"detail": "This card link is not active."}, status=404)
    return Response(profile)
