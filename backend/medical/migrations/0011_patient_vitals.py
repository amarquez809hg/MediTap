from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medical', '0010_patient_appointment'),
    ]

    operations = [
        migrations.AddField(
            model_name='patient',
            name='height_cm',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='weight_kg',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='systolic_bp',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='diastolic_bp',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='heart_rate_bpm',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='vitals_recorded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
