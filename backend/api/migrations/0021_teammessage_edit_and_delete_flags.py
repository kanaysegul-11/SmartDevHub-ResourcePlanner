from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0020_usernotification"),
    ]

    operations = [
        migrations.AddField(
            model_name="teammessage",
            name="deleted_for_everyone",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="teammessage",
            name="deleted_for_recipient",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="teammessage",
            name="deleted_for_sender",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="teammessage",
            name="edited_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
