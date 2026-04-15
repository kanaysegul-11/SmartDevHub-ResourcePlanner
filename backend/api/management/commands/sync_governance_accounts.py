from django.core.management.base import BaseCommand

from api.governance_services import scan_github_repository, sync_github_repositories
from api.models import GithubAccount, GithubRepository


class Command(BaseCommand):
    help = (
        "Refresh connected GitHub repositories and optionally run governance scans "
        "for active repositories."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--account-id",
            type=int,
            dest="account_id",
            help="Limit the sync to a single GitHub account id.",
        )
        parser.add_argument(
            "--scan",
            action="store_true",
            help="Run a governance scan after repository refresh.",
        )
        parser.add_argument(
            "--repository-id",
            type=int,
            dest="repository_id",
            help="Limit scans to a single repository id.",
        )

    def handle(self, *args, **options):
        account_queryset = GithubAccount.objects.filter(is_active=True).select_related("user")
        if options.get("account_id"):
            account_queryset = account_queryset.filter(id=options["account_id"])

        account_count = 0
        scan_count = 0

        for account in account_queryset:
            account_count += 1
            synced_count = sync_github_repositories(account=account)
            self.stdout.write(
                self.style.SUCCESS(
                    f"[account:{account.id}] synced {synced_count} repositories for {account.github_username}"
                )
            )

            if not options.get("scan"):
                continue

            repository_queryset = GithubRepository.objects.filter(
                account=account,
                is_active=True,
            ).select_related("account", "standard_profile")
            if options.get("repository_id"):
                repository_queryset = repository_queryset.filter(id=options["repository_id"])

            for repository in repository_queryset:
                scan = scan_github_repository(
                    repository=repository,
                    triggered_by=account.user,
                    scan_type="scheduled",
                )
                scan_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"[repo:{repository.id}] {repository.full_name} scored {scan.score}"
                    )
                )

        if not account_count:
            self.stdout.write(self.style.WARNING("No active GitHub account found for sync."))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Governance sync completed for {account_count} account(s) with {scan_count} scan(s)."
            )
        )
