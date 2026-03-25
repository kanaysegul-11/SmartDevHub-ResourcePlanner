from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0019_alter_comment_id_alter_employmentstatus_id_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserNotification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("type", models.CharField(choices=[("task", "Task"), ("project", "Project"), ("message", "Message"), ("comment", "Comment"), ("snippet", "Snippet"), ("system", "System")], default="system", max_length=20)),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField(blank=True)),
                ("link", models.CharField(blank=True, max_length=255)),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="sent_notifications", to=settings.AUTH_USER_MODEL)),
                ("recipient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notifications", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "User Notification",
                "verbose_name_plural": "User Notifications",
                "ordering": ["-created_at"],
            },
        ),
    ]
