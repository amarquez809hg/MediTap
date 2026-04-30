"""
Ensure Django Auth Group for intake editors exists; optionally create the first superuser in DEBUG.

Superuser bootstrap (development only):
  Set MEDITAP_BOOTSTRAP_SUPERUSER_PASSWORD (and optionally MEDITAP_BOOTSTRAP_SUPERUSER_USERNAME,
  default ``admin``, and MEDITAP_BOOTSTRAP_SUPERUSER_EMAIL).
  Runs only when DEBUG is True and there is no superuser yet.

Usage::

    python manage.py bootstrap_meditap_access

Docker::

    docker compose exec backend python manage.py bootstrap_meditap_access
"""

from __future__ import annotations

import os

from django.conf import settings
from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand


def _editor_group_name() -> str:
    return (getattr(settings, "MEDITAP_RECORD_EDITOR_ROLE", "") or "").strip() or (
        "meditap-record-editor"
    )


class Command(BaseCommand):
    help = "Ensure meditap-record-editor group exists; optionally create first superuser (DEBUG + env)."

    def handle(self, *args, **options):
        name = _editor_group_name()
        grp, created = Group.objects.get_or_create(name=name)
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created group {name!r}."))
        else:
            self.stdout.write(f"Group {name!r} already exists.")

        pw = (os.getenv("MEDITAP_BOOTSTRAP_SUPERUSER_PASSWORD") or "").strip()
        if not pw:
            self.stdout.write(
                "No MEDITAP_BOOTSTRAP_SUPERUSER_PASSWORD — skipping auto superuser "
                "(use createsuperuser or Admin)."
            )
            return

        if not settings.DEBUG:
            self.stdout.write(
                self.style.WARNING(
                    "DEBUG is False — refusing to create superuser from environment variables."
                )
            )
            return

        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write("A superuser already exists — skipping bootstrap user.")
            return

        username = (os.getenv("MEDITAP_BOOTSTRAP_SUPERUSER_USERNAME") or "admin").strip() or "admin"
        email = (os.getenv("MEDITAP_BOOTSTRAP_SUPERUSER_EMAIL") or "").strip() or f"{username}@localhost"
        if User.objects.filter(username__iexact=username).exists():
            self.stdout.write(
                self.style.WARNING(
                    f"User {username!r} already exists but is not superuser — create superuser manually."
                )
            )
            return

        u = User.objects.create_superuser(username=username, email=email, password=pw)
        u.groups.add(grp)
        self.stdout.write(
            self.style.SUCCESS(
                f"Created superuser username={username!r} and added group {name!r} "
                f"(change password after first login)."
            )
        )
