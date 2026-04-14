# Tab7 patient lab panels (structured components JSON)

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0003_insurance_provider_contact_and_coverage_details"),
    ]

    operations = [
        migrations.CreateModel(
            name="PatientLabPanel",
            fields=[
                (
                    "lab_panel_id",
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
                        help_text="Optional human-readable id, e.g. L-2024-001",
                        max_length=40,
                        null=True,
                    ),
                ),
                ("test_name", models.CharField(max_length=200)),
                ("collected_on", models.DateField()),
                ("status", models.CharField(default="Reviewed", max_length=32)),
                ("is_new", models.BooleanField(default=False)),
                (
                    "components",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="List of {name, value, unit, range, critical, interpretation?}",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lab_panels",
                        to="medical.patient",
                    ),
                ),
            ],
            options={
                "ordering": ["-collected_on", "-created_at"],
            },
        ),
    ]
