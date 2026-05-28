from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medical', '0008_portal_user_onetoone'),
    ]

    operations = [
        migrations.AddField(
            model_name='patient',
            name='address',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='race',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='ethnicity',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='preferred_language',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='marital_status',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
    ]
