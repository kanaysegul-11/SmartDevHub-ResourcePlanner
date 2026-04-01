import re
import unicodedata

from django.db import migrations
from django.db.models import Q


BROKEN_TURKISH_DOTTED_I_RE = re.compile(
    r"(^|[\s(\[{\"'/-])\?(?=[a-zçğıöşü])",
    re.UNICODE,
)


def restore_missing_turkish_dotted_i(value):
    if not isinstance(value, str) or not value:
        return value

    normalized = unicodedata.normalize("NFC", value)
    return BROKEN_TURKISH_DOTTED_I_RE.sub(r"\1İ", normalized)


def normalize_snippet_titles(apps, schema_editor):
    Snippet = apps.get_model("api", "Snippet")

    snippets = Snippet.objects.filter(
        Q(title__contains="?") | Q(description__contains="?")
    ).iterator()

    for snippet in snippets:
        update_fields = []
        normalized_title = restore_missing_turkish_dotted_i(snippet.title)
        normalized_description = restore_missing_turkish_dotted_i(snippet.description)

        if normalized_title != snippet.title:
            snippet.title = normalized_title
            update_fields.append("title")

        if normalized_description != snippet.description:
            snippet.description = normalized_description
            update_fields.append("description")

        if update_fields:
            snippet.save(update_fields=update_fields)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0022_preserve_library_content_on_user_delete"),
    ]

    operations = [
        migrations.RunPython(normalize_snippet_titles, migrations.RunPython.noop),
    ]
