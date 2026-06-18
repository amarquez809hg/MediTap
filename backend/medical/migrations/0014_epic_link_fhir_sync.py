# Epic FHIR sync: encrypted OAuth tokens + last sync metadata.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0013_portal_user_preferences_zh_locale"),
    ]

    operations = [
        migrations.AddField(
            model_name="epicpatientlink",
            name="access_token_encrypted",
            field=models.TextField(
                blank=True,
                help_text="Encrypted OAuth access token (never exposed via API).",
            ),
        ),
        migrations.AddField(
            model_name="epicpatientlink",
            name="refresh_token_encrypted",
            field=models.TextField(
                blank=True,
                help_text="Encrypted OAuth refresh token for FHIR reads between sessions.",
            ),
        ),
        migrations.AddField(
            model_name="epicpatientlink",
            name="access_token_expires_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When the stored access token expires (refreshed automatically on sync).",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="epicpatientlink",
            name="last_sync_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Last successful FHIR import into the MediTap patient chart.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="epicpatientlink",
            name="last_sync_summary",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Summary of the last sync (updated fields, observation counts, etc.).",
            ),
        ),
    ]
