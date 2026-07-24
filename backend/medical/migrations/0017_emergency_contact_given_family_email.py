from django.db import migrations, models


def split_legacy_emergency_names(apps, schema_editor):
    Patient = apps.get_model("medical", "Patient")
    for patient in Patient.objects.all().iterator():
        full = (getattr(patient, "emergency_contact_name", None) or "").strip()
        if not full:
            continue
        parts = full.split()
        if not parts:
            continue
        if not patient.emergency_contact_given_name:
            patient.emergency_contact_given_name = parts[0]
        if len(parts) > 1 and not patient.emergency_contact_family_name:
            patient.emergency_contact_family_name = " ".join(parts[1:])
        patient.save(
            update_fields=[
                "emergency_contact_given_name",
                "emergency_contact_family_name",
            ]
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0016_patient_vitals_extras_and_emergency_contact"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="emergency_contact_given_name",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="emergency_contact_family_name",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="emergency_contact_email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.RunPython(split_legacy_emergency_names, noop_reverse),
        migrations.RemoveField(
            model_name="patient",
            name="emergency_contact_name",
        ),
    ]
