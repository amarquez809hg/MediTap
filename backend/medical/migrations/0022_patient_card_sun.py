from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0021_patient_card"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientcard",
            name="sdm_file_key",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="patientcard",
            name="sdm_meta_key",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="patientcard",
            name="sdm_read_counter",
            field=models.IntegerField(default=-1),
        ),
    ]
