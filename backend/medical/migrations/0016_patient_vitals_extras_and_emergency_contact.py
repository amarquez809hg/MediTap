from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0015_patient_intake_and_lab_panel_extras"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="temperature_f",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=5, null=True
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="temperature_c",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=5, null=True
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="respiratory_rate",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="oxygen_saturation_pct",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="body_mass_index",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=5, null=True
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="emergency_contact_name",
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="emergency_contact_relationship",
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="patient",
            name="emergency_contact_phone",
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
    ]
