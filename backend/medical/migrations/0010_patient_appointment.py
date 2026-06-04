import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0009_patient_demographics_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PatientAppointment",
            fields=[
                (
                    "appointment_id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "display_code",
                    models.CharField(
                        blank=True,
                        help_text="Human-readable id shown in the app, e.g. APPT-24001",
                        max_length=40,
                    ),
                ),
                (
                    "date_label",
                    models.CharField(
                        help_text="Display date, e.g. Wednesday, Nov 27",
                        max_length=120,
                    ),
                ),
                (
                    "time_label",
                    models.CharField(
                        help_text="Display time, e.g. 10:00 AM", max_length=32
                    ),
                ),
                ("specialist", models.CharField(max_length=200)),
                ("department", models.CharField(blank=True, max_length=120)),
                (
                    "visit_type",
                    models.CharField(default="In-Office Visit", max_length=64),
                ),
                ("status", models.CharField(default="Pending", max_length=32)),
                ("reason_for_visit", models.TextField(blank=True)),
                ("location", models.CharField(blank=True, max_length=200)),
                ("duration", models.CharField(blank=True, max_length=32)),
                ("patient_instructions", models.TextField(blank=True)),
                ("clinical_notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="appointments",
                        to="medical.patient",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
