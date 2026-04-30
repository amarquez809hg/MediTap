"""
Delete every Django User (and dependent auth state).

Incidents reference users with PROTECT, so all Incident rows are deleted first.
Patient rows and catalogs are kept; only user-linked auth data is removed.

Usage (Docker, from docker/):

    docker compose -f docker-compose.yml exec backend python manage.py wipe_users --yes
"""

from __future__ import annotations

from django.contrib.admin.models import LogEntry
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand
from django.db import transaction

from medical.models import HospitalUser, Incident


class Command(BaseCommand):
    help = "Delete ALL Django users, JWT blacklist tokens, incidents (PROTECT), and hospital-user links."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            dest="confirm",
            help="Required. Confirms you want to delete all accounts.",
        )

    def handle(self, *args, **options):
        if not options["confirm"]:
            self.stderr.write(
                self.style.ERROR(
                    "Refusing: this deletes every user. Re-run with --yes\n"
                    "Example: python manage.py wipe_users --yes"
                )
            )
            return

        try:
            from rest_framework_simplejwt.token_blacklist.models import (
                BlacklistedToken,
                OutstandingToken,
            )
        except Exception:  # pragma: no cover
            BlacklistedToken = OutstandingToken = None  # type: ignore

        with transaction.atomic():
            if BlacklistedToken is not None:
                n_bt = BlacklistedToken.objects.count()
                BlacklistedToken.objects.all().delete()
                self.stdout.write(f"Deleted {n_bt} blacklisted token row(s).")
            if OutstandingToken is not None:
                n_ot = OutstandingToken.objects.count()
                OutstandingToken.objects.all().delete()
                self.stdout.write(f"Deleted {n_ot} outstanding token row(s).")

            n_log = LogEntry.objects.count()
            LogEntry.objects.all().delete()
            self.stdout.write(f"Deleted {n_log} admin log entr(y/ies).")

            n_sess = Session.objects.count()
            Session.objects.all().delete()
            self.stdout.write(f"Deleted {n_sess} session row(s).")

            n_inc = Incident.objects.count()
            Incident.objects.all().delete()
            self.stdout.write(f"Deleted {n_inc} incident(s) (and related lab results).")

            n_hu = HospitalUser.objects.count()
            HospitalUser.objects.all().delete()
            self.stdout.write(f"Deleted {n_hu} hospital user link(s).")

            n_u = User.objects.count()
            User.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {n_u} Django user(s)."))

        self.stdout.write(
            self.style.WARNING(
                "Create a new superuser if you need admin: python manage.py createsuperuser"
            )
        )
