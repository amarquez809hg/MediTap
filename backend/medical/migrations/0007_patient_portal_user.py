# Generated manually for MediTap portal scoping.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_portal_user_from_email(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Patient = apps.get_model("medical", "Patient")
    for u in User.objects.exclude(email__isnull=True).exclude(email=""):
        email = (u.email or "").strip()
        if not email:
            continue
        Patient.objects.filter(portal_user__isnull=True, email__iexact=email).update(
            portal_user_id=u.pk
        )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("medical", "0006_epic_patient_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="portal_user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="patient_profile",
                to=settings.AUTH_USER_MODEL,
                unique=True,
            ),
        ),
        migrations.RunPython(backfill_portal_user_from_email, migrations.RunPython.noop),
    ]
