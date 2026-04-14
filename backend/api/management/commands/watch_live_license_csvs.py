import time
from pathlib import Path

from django.core.management.base import BaseCommand

from api.management.commands.sync_live_license_csvs import get_default_actor
from api.software_asset_live_csv import (
    get_default_live_license_directory,
    sync_live_license_csv_directory,
)


def snapshot_directory(directory):
    state = {}
    for csv_path in sorted(Path(directory).glob("*.csv")):
        if csv_path.is_file():
            stat = csv_path.stat()
            state[csv_path.name] = (stat.st_mtime_ns, stat.st_size)
    return state


class Command(BaseCommand):
    help = "Watch the live CSV directory and sync software assets when files change."

    def add_arguments(self, parser):
        parser.add_argument(
            "--directory",
            default=str(get_default_live_license_directory()),
            help="Directory that contains per-user live CSV files.",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=5,
            help="Polling interval in seconds.",
        )
        parser.add_argument(
            "--once",
            action="store_true",
            help="Run a single sync and exit.",
        )

    def handle(self, *args, **options):
        directory = Path(options["directory"])
        directory.mkdir(parents=True, exist_ok=True)
        actor = get_default_actor()

        if options["once"]:
            sync_live_license_csv_directory(directory, actor=actor)
            self.stdout.write(self.style.SUCCESS("Live CSV sync ran once."))
            return

        interval = max(int(options["interval"]), 2)
        self.stdout.write(
            self.style.SUCCESS(
                f"Watching {directory} for live CSV changes every {interval} seconds."
            )
        )

        last_synced_snapshot = {}
        pending_snapshot = None
        pending_since = None

        while True:
            current_snapshot = snapshot_directory(directory)

            if current_snapshot != last_synced_snapshot:
                if pending_snapshot != current_snapshot:
                    pending_snapshot = current_snapshot
                    pending_since = time.time()
                elif pending_since is not None and time.time() - pending_since >= interval:
                    summary = sync_live_license_csv_directory(directory, actor=actor)
                    self.stdout.write(
                        self.style.SUCCESS(
                            "Live CSV sync complete. "
                            f"created={summary.created_count}, "
                            f"updated={summary.updated_count}, "
                            f"archived={summary.archived_count}, "
                            f"errors={summary.error_count}"
                        )
                    )
                    last_synced_snapshot = snapshot_directory(directory)
                    pending_snapshot = None
                    pending_since = None

            time.sleep(interval)
