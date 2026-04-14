from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from api.software_asset_live_csv import (
    get_default_live_license_directory,
    sync_live_license_csv_directory,
)


def get_default_actor():
    return (
        User.objects.filter(is_staff=True).order_by("id").first()
        or User.objects.filter(is_superuser=True).order_by("id").first()
        or User.objects.order_by("id").first()
    )


class Command(BaseCommand):
    help = "Sync assigned software assets from per-user live CSV files."

    def add_arguments(self, parser):
        parser.add_argument(
            "--directory",
            default=str(get_default_live_license_directory()),
            help="Directory that contains per-user live CSV files.",
        )

    def handle(self, *args, **options):
        actor = get_default_actor()
        summary = sync_live_license_csv_directory(options["directory"], actor=actor)

        for result in summary.results:
            if result.source_file == "__missing_sources__":
                if result.archived_count:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Archived {result.archived_count} assets whose source CSV files disappeared."
                        )
                    )
                continue

            self.stdout.write(
                f"{result.source_file}: "
                f"created={result.created_count}, "
                f"updated={result.updated_count}, "
                f"skipped={result.skipped_count}, "
                f"archived={result.archived_count}, "
                f"errors={len(result.errors)}"
            )
            for error in result.errors:
                self.stdout.write(self.style.ERROR(f"  - {error}"))

        self.stdout.write(
            self.style.SUCCESS(
                "Live CSV sync complete. "
                f"created={summary.created_count}, "
                f"updated={summary.updated_count}, "
                f"skipped={summary.skipped_count}, "
                f"archived={summary.archived_count}, "
                f"errors={summary.error_count}"
            )
        )
