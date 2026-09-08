# Generated manually for document vault parse snapshot + apply

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0019_patient_document"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientdocument",
            name="parse_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="patientdocument",
            name="parsed_given_name",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="patientdocument",
            name="parsed_family_name",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
    ]
