# Generated for MediTap per-user portal settings.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("medical", "0011_patient_vitals"),
    ]

    operations = [
        migrations.CreateModel(
            name="PortalUserPreferences",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "locale",
                    models.CharField(
                        choices=[("en", "English"), ("es", "Spanish")],
                        default="en",
                        max_length=8,
                    ),
                ),
                ("dark_mode", models.BooleanField(default=False)),
                ("push_notifications", models.BooleanField(default=True)),
                (
                    "card_status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("reported_lost", "Reported lost"),
                            ("inactive", "Inactive"),
                        ],
                        default="active",
                        max_length=32,
                    ),
                ),
                ("card_reported_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="portal_preferences",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "Portal user preferences",
            },
        ),
    ]
