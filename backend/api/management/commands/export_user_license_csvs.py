from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from api.software_asset_live_csv import (
    export_user_license_csvs,
    get_default_live_license_directory,
)


class Command(BaseCommand):
    help = "Export one live CSV file per user for assigned software assets."

    def add_arguments(self, parser):
        parser.add_argument(
            "--directory",
            default=str(get_default_live_license_directory()),
            help="Target directory for the generated CSV files.",
        )

    def handle(self, *args, **options):
        user_count = export_user_license_csvs(options["directory"])
        csv_count = User.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Exported {csv_count} user CSV files into {options['directory']}."
            )
        )
        self.stdout.write(f"Processed {user_count} users.")
