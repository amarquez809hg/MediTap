"""
Delete specific Django portal logins by username (not every user).

Unblocks Incident.created_by_user PROTECT, detaches Patient.portal_user so charts
are kept by default, then deletes the User rows (and CASCADE hospital links / prefs).

Usage on the meditap.ai host (adjust to your process layout):

    python manage.py delete_portal_users HaroldJennings PriyaKapoor --yes

    # also wipe those users' Patient charts:
    python manage.py delete_portal_users HaroldJennings PriyaKapoor --yes --delete-patients
"""

from __future__ import annotations

from django.contrib.admin.models import LogEntry
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from medical.models import HospitalUser, Incident, Patient


class Command(BaseCommand):
    help = "Delete named Django users; keep patient charts unless --delete-patients."

    def add_arguments(self, parser):
        parser.add_argument(
            "usernames",
            nargs="+",
            help="Exact usernames to delete (case-insensitive match).",
        )
        parser.add_argument(
            "--yes",
            action="store_true",
            dest="confirm",
            help="Required. Confirms deletion of the named accounts.",
        )
        parser.add_argument(
            "--delete-patients",
            action="store_true",
            help="Also delete Patient charts linked via portal_user (default: detach only).",
        )

    def handle(self, *args, **options):
        if not options["confirm"]:
            self.stderr.write(
                self.style.ERROR(
                    "Refusing: re-run with --yes\n"
                    "Example: python manage.py delete_portal_users HaroldJennings PriyaKapoor --yes"
                )
            )
            return

        names = [n.strip() for n in options["usernames"] if n and n.strip()]
        if not names:
            self.stderr.write(self.style.ERROR("No usernames given."))
            return

        try:
            from rest_framework_simplejwt.token_blacklist.models import (
                BlacklistedToken,
                OutstandingToken,
            )
        except Exception:  # pragma: no cover
            BlacklistedToken = OutstandingToken = None  # type: ignore

        deleted = 0
        missing: list[str] = []

        with transaction.atomic():
            for name in names:
                user = User.objects.filter(username__iexact=name).order_by("pk").first()
                if user is None:
                    missing.append(name)
                    continue

                uname = user.get_username()
                uid = user.pk

                if OutstandingToken is not None:
                    tokens = OutstandingToken.objects.filter(user=user)
                    if BlacklistedToken is not None:
                        BlacklistedToken.objects.filter(token__in=tokens).delete()
                    n_ot = tokens.count()
                    tokens.delete()
                    self.stdout.write(f"  {uname}: cleared {n_ot} JWT outstanding token(s).")

                LogEntry.objects.filter(user=user).delete()

                n_inc = Incident.objects.filter(created_by_user=user).count()
                Incident.objects.filter(created_by_user=user).delete()
                if n_inc:
                    self.stdout.write(f"  {uname}: deleted {n_inc} incident(s) (PROTECT unblock).")

                patient = Patient.objects.filter(portal_user=user).first()
                if patient is not None:
                    if options["delete_patients"]:
                        pid = patient.patient_id
                        patient.delete()
                        self.stdout.write(f"  {uname}: deleted patient chart {pid}.")
                    else:
                        patient.portal_user = None
                        patient.save(update_fields=["portal_user", "updated_at"])
                        self.stdout.write(
                            f"  {uname}: detached patient chart {patient.patient_id} (kept)."
                        )

                HospitalUser.objects.filter(user=user).delete()
                user.delete()
                deleted += 1
                self.stdout.write(self.style.SUCCESS(f"Deleted user {uname!r} (id={uid})."))

        for name in missing:
            self.stdout.write(self.style.WARNING(f"No user matched username {name!r}."))

        self.stdout.write(
            self.style.SUCCESS(f"Done. Deleted {deleted} account(s); {len(missing)} not found.")
        )
        self.stdout.write(
            "Re-register or createsuperuser/register flow when you have passwords to store."
        )
