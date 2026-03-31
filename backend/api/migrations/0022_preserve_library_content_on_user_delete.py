from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_teammessage_edit_and_delete_flags"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="comment",
            name="author",
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name="snippet",
            name="author",
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name="snippets", to=settings.AUTH_USER_MODEL),
        ),
    ]
