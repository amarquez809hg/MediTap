"""Create, bind, or revoke the secret URL stored on a patient's DESFire card."""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from medical.card_profile import bind_uid, issue_card, revoke_card
from medical.models import Patient, PatientCard


class Command(BaseCommand):
    help = "Issue a public profile URL for a DESFire card, bind its UID, or revoke it."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="", help="Patient email (portal or chart).")
        parser.add_argument("--patient-id", default="", help="Patient UUID.")
        parser.add_argument("--label", default="", help="Optional label, such as wristband.")
        parser.add_argument(
            "--base-url",
            default="",
            help="Frontend origin written into the card URL. Default: MEDITAP_FRONTEND_URL or http://localhost:8100.",
        )
        parser.add_argument("--card-id", default="", help="Existing card UUID, for --bind-uid or --revoke.")
        parser.add_argument("--bind-uid", default="", help="Hex UID read from the card.")
        parser.add_argument("--revoke", action="store_true", help="Revoke the card given by --card-id.")

    def handle(self, *args, **options):
        if options["revoke"] or options["bind_uid"]:
            card_id = (options["card_id"] or "").strip()
            if not card_id:
                raise CommandError("--card-id is required with --revoke or --bind-uid.")
            try:
                card = PatientCard.objects.select_related("patient").get(card_id=card_id)
            except PatientCard.DoesNotExist as exc:
                raise CommandError(f"No card {card_id}.") from exc
            if options["revoke"]:
                revoke_card(card)
                self.stdout.write(self.style.SUCCESS(f"Revoked card {card.card_id}."))
                return
            try:
                bind_uid(card, options["bind_uid"])
            except ValueError as exc:
                raise CommandError(str(exc)) from exc
            self.stdout.write(self.style.SUCCESS(f"Bound UID {card.card_uid} to card {card.card_id}."))
            return

        patient = self._patient(options["email"], options["patient_id"])
        _card, token, url = issue_card(
            patient=patient,
            issued_by=None,
            label=options["label"],
            base_url=options["base_url"] or None,
        )
        self.stdout.write(self.style.SUCCESS("Card link issued. The token is shown once."))
        self.stdout.write(f"patient: {patient.family_name}, {patient.given_name} ({patient.patient_id})")
        self.stdout.write(f"card_id: {_card.card_id}")
        self.stdout.write(f"url: {url}")
        self.stdout.write(f"token: {token}")
        self.stdout.write("")
        self.stdout.write("Burn that URL onto the card on the reader:")
        self.stdout.write(
            f"  ~/acr1311-env/bin/python tools/desfire/burn_profile_url.py --url {url!s}"
        )

    def _patient(self, email: str, patient_id: str) -> Patient:
        email = email.strip()
        patient_id = patient_id.strip()
        if not email and not patient_id:
            raise CommandError("Pass --email or --patient-id.")
        qs = Patient.objects.all()
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if email:
            qs = qs.filter(email__iexact=email)
        patient = qs.first()
        if patient is None:
            raise CommandError("No matching patient.")
        return patient
