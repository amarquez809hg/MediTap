"""Store the DESFire SUN keys for a card and retire its static link."""

from __future__ import annotations

import re
import secrets

from django.core.management.base import BaseCommand, CommandError

from medical.models import PatientCard

_KEY_RE = re.compile(r"^[0-9a-f]{32}$")


class Command(BaseCommand):
    help = "Turn on per-tap SUN links for one card. The old static URL stops opening the profile."

    def add_arguments(self, parser):
        parser.add_argument("--card-id", required=True, help="PatientCard UUID.")
        parser.add_argument("--meta-key", default="", help="32 hex chars. Generated when omitted.")
        parser.add_argument(
            "--file-key",
            default="",
            help="32 hex chars. Defaults to the meta-read key.",
        )
        parser.add_argument(
            "--counter",
            type=int,
            default=None,
            help="Last counter already consumed by a reader. The next tap must be higher.",
        )
        parser.add_argument(
            "--base-url",
            default="https://meditap.ai",
            help="Origin used in the burn command. No trailing path.",
        )

    def handle(self, *args, **options):
        try:
            card = PatientCard.objects.select_related("patient").get(card_id=options["card_id"])
        except PatientCard.DoesNotExist as exc:
            raise CommandError(f"No card {options['card_id']}.") from exc
        meta = self._key(options["meta_key"], "meta-key") if options["meta_key"] else ""
        file_key = self._key(options["file_key"], "file-key") if options["file_key"] else ""
        if not meta and card.sdm_meta_key:
            meta = card.sdm_meta_key
            file_key = file_key or card.sdm_file_key
        if not meta:
            meta = secrets.token_hex(16)
        file_key = file_key or meta
        card.sdm_meta_key = meta
        card.sdm_file_key = file_key
        if options["counter"] is not None:
            if options["counter"] < -1 or options["counter"] > 0xFFFFFF:
                raise CommandError("--counter must be from -1 to 16777215.")
            card.sdm_read_counter = options["counter"]
        card.save(update_fields=["sdm_meta_key", "sdm_file_key", "sdm_read_counter"])
        base = options["base_url"].strip().rstrip("/")
        sun_url = f"{base}/card/s/{card.card_id}"
        self.stdout.write(self.style.SUCCESS("Per-tap links are on. The old static URL no longer opens this profile."))
        self.stdout.write(f"patient: {card.patient.family_name}, {card.patient.given_name}")
        self.stdout.write(f"card_id: {card.card_id}")
        self.stdout.write(f"sun_url: {sun_url}")
        self.stdout.write(f"counter: {card.sdm_read_counter}")
        self.stdout.write(f"meta_key: {meta}")
        self.stdout.write(f"file_key: {file_key}")
        self.stdout.write("")
        self.stdout.write("Burn the card on the Mac (card on the ACR1311):")
        self.stdout.write(
            "  ~/acr1311-env/bin/python tools/desfire/burn_profile_url.py "
            f"--sun {sun_url} --sun-key {meta}"
        )

    def _key(self, raw: str, label: str) -> str:
        compact = re.sub(r"[^0-9A-Fa-f]", "", raw or "").lower()
        if not _KEY_RE.match(compact):
            raise CommandError(f"--{label} must be 32 hex characters.")
        return compact
