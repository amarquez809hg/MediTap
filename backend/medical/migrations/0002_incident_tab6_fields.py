# Generated manually for MediTap Tab6 incident log

import datetime

from django.db import migrations, models
from django.utils import timezone


def seed_demo_incidents(apps, schema_editor):
    Incident = apps.get_model("medical", "Incident")
    Patient = apps.get_model("medical", "Patient")
    Hospital = apps.get_model("medical", "Hospital")
    User = apps.get_model("auth", "User")

    if Incident.objects.filter(record_code__isnull=False).exclude(record_code="").exists():
        return
    patient = Patient.objects.order_by("created_at").first()
    hospital = Hospital.objects.order_by("created_at").first()
    user = User.objects.order_by("pk").first()
    if not patient or not hospital or not user:
        return

    def dt(y, m, d):
        return timezone.make_aware(datetime.datetime(y, m, d, 12, 0, 0))

    demos = [
        {
            "record_code": "I-2024-005",
            "incident_type": "Acute Respiratory Infection",
            "occurred_at": dt(2024, 10, 15),
            "summary": "Developed severe cough and fever over 3 days, leading to a prescription for Azithromycin.",
            "severity": "Medium",
            "location": "Home",
            "outcome": "Resolved with antibiotics (Primary Care)",
        },
        {
            "record_code": "I-2024-004",
            "incident_type": "Accidental Fall",
            "occurred_at": dt(2024, 8, 28),
            "summary": "Slipped on wet floor in the office kitchen. No loss of consciousness or fractures. Rested knee for 2 days.",
            "severity": "Low",
            "location": "Workplace",
            "outcome": "Minor bruising (Self-treated)",
        },
        {
            "record_code": "I-2023-012",
            "incident_type": "Severe Migraine Episode",
            "occurred_at": dt(2023, 12, 1),
            "summary": "Migraine persisted for over 24 hours, unresponsive to usual medication. Required stabilizing treatment at ER.",
            "severity": "High",
            "location": "Patient's Home",
            "outcome": "Managed with IV medication (Emergency Room visit)",
        },
    ]
    for row in demos:
        Incident.objects.create(
            patient=patient,
            hospital=hospital,
            created_by_user=user,
            occurred_at=row["occurred_at"],
            incident_type=row["incident_type"],
            summary=row["summary"],
            severity=row["severity"],
            location=row["location"],
            outcome=row["outcome"],
            record_code=row["record_code"],
        )


def unseed_demo_incidents(apps, schema_editor):
    Incident = apps.get_model("medical", "Incident")
    Incident.objects.filter(
        record_code__in=["I-2024-005", "I-2024-004", "I-2023-012"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="incident",
            name="severity",
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.AddField(
            model_name="incident",
            name="location",
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name="incident",
            name="outcome",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="incident",
            name="record_code",
            field=models.CharField(
                blank=True,
                help_text="Human-readable id shown in the app, e.g. I-2024-005",
                max_length=40,
                null=True,
            ),
        ),
        migrations.RunPython(seed_demo_incidents, unseed_demo_incidents),
    ]
