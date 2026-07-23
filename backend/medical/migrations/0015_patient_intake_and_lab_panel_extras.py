# Generated manually for Epic PDF intake: demographics extras + lab panel metadata

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0014_epic_link_fhir_sync"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="legal_sex",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="gender_identity",
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="sexual_orientation",
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="sex_at_birth_recorded_on",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="additional_emails",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Extra patient emails beyond the primary email field.",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="other_notes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientlabpanel",
            name="category",
            field=models.CharField(
                blank=True,
                default="lab",
                help_text="lab | imaging | vitals | clinical | social | contact",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="patientlabpanel",
            name="notes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientlabpanel",
            name="clinical_indication",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientlabpanel",
            name="impression",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientlabpanel",
            name="accession_number",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="patientlabpanel",
            name="modality",
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="patientlabpanel",
            name="signed_by",
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AlterField(
            model_name="patientlabpanel",
            name="components",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="List of {name, value?, textValue?, unit, range, critical, interpretation?}",
            ),
        ),
    ]
