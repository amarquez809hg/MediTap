# Seed CBC / BMP / Lipid demo panels for patients who have none (same data as original SPA mocks).

from datetime import date

from django.db import migrations


def seed_default_lab_panels(apps, schema_editor):
    Patient = apps.get_model("medical", "Patient")
    PatientLabPanel = apps.get_model("medical", "PatientLabPanel")

    panels_data = [
        {
            "display_code": "L-2024-001",
            "test_name": "Complete Blood Count (CBC)",
            "collected_on": date(2025, 11, 5),
            "status": "Reviewed",
            "is_new": True,
            "components": [
                {
                    "name": "Hemoglobin",
                    "value": 14.5,
                    "unit": "g/dL",
                    "range": "13.5–17.5",
                    "critical": False,
                },
                {
                    "name": "WBC Count",
                    "value": 9.8,
                    "unit": "K/uL",
                    "range": "4.5–11.0",
                    "critical": False,
                },
                {
                    "name": "Platelets",
                    "value": 135,
                    "unit": "K/uL",
                    "range": "150–450",
                    "critical": True,
                    "interpretation": "Low",
                },
            ],
        },
        {
            "display_code": "L-2024-002",
            "test_name": "Basic Metabolic Panel (BMP)",
            "collected_on": date(2025, 10, 10),
            "status": "Reviewed",
            "is_new": False,
            "components": [
                {
                    "name": "Glucose (Fasting)",
                    "value": 115,
                    "unit": "mg/dL",
                    "range": "70–99",
                    "critical": True,
                    "interpretation": "High",
                },
                {
                    "name": "Potassium",
                    "value": 4.1,
                    "unit": "mmol/L",
                    "range": "3.5–5.1",
                    "critical": False,
                },
                {
                    "name": "Creatinine",
                    "value": 0.9,
                    "unit": "mg/dL",
                    "range": "0.6–1.3",
                    "critical": False,
                },
            ],
        },
        {
            "display_code": "L-2024-003",
            "test_name": "Lipid Panel",
            "collected_on": date(2025, 8, 15),
            "status": "Pending",
            "is_new": False,
            "components": [],
        },
    ]

    for patient in Patient.objects.all():
        if PatientLabPanel.objects.filter(patient=patient).exists():
            continue
        for row in panels_data:
            PatientLabPanel.objects.create(patient=patient, **row)


def unseed_default_lab_panels(apps, schema_editor):
    PatientLabPanel = apps.get_model("medical", "PatientLabPanel")
    PatientLabPanel.objects.filter(
        display_code__in=["L-2024-001", "L-2024-002", "L-2024-003"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0004_patient_lab_panel"),
    ]

    operations = [
        migrations.RunPython(seed_default_lab_panels, unseed_default_lab_panels),
    ]
