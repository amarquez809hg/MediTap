# Tab12 patient insurance: provider contact + JSON coverage details

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0002_incident_tab6_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="insuranceprovider",
            name="phone",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="insuranceprovider",
            name="email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name="insuranceprovider",
            name="website",
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name="patientinsurance",
            name="coverage_details",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
