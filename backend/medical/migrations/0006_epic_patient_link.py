import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0005_seed_default_lab_panels"),
    ]

    operations = [
        migrations.CreateModel(
            name="EpicPatientLink",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("disconnected", "Disconnected"),
                            ("pending_auth", "Pending authorization"),
                            ("connected", "Connected"),
                            ("error", "Error"),
                        ],
                        default="disconnected",
                        max_length=32,
                    ),
                ),
                (
                    "epic_patient_fhir_id",
                    models.CharField(
                        blank=True,
                        help_text="Epic FHIR Patient.id after SMART authorize (or manual sandbox id for demos).",
                        max_length=128,
                    ),
                ),
                (
                    "fhir_server_base_url",
                    models.URLField(
                        blank=True,
                        help_text="FHIR base URL used when this link was established (sandbox issuer).",
                        max_length=500,
                        null=True,
                    ),
                ),
                ("last_error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "patient",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="epic_link",
                        to="medical.patient",
                    ),
                ),
            ],
        ),
    ]
