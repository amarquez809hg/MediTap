# Add Simplified Chinese (Mandarin) UI locale.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("medical", "0012_portal_user_preferences"),
    ]

    operations = [
        migrations.AlterField(
            model_name="portaluserpreferences",
            name="locale",
            field=models.CharField(
                choices=[
                    ("en", "English"),
                    ("es", "Spanish"),
                    ("zh", "Chinese (Simplified)"),
                ],
                default="en",
                max_length=8,
            ),
        ),
    ]
