"""Authenticated card issuance and the public profile a tap opens."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from medapp.admin_ops import user_is_admin_operator

from .card_profile import bind_uid, card_for_token, issue_card, public_profile, revoke_card
from .models import Patient, PatientCard
from .patient_api_scoping import allowed_patient_ids


def _can_manage(request, patient: Patient) -> bool:
    if user_is_admin_operator(request):
        return True
    allowed = allowed_patient_ids(request)
    if allowed is None:
        return True
    return str(patient.patient_id) in allowed


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
