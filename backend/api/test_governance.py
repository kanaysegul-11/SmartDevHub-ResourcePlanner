import base64
import hashlib
import hmac
import json
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .governance_services import (
    evaluate_commit_quality,
    evaluate_pull_request_quality,
    evaluate_source_bundle,
    ensure_default_standard_profile,
    ensure_repository_webhook,
    fetch_repository_source_bundle,
    finalize_stale_governance_runs,
    prepare_ai_remediation_bundle,
    queue_due_polling_refreshes,
    scan_github_repository,
    sync_github_repositories,
)
from .models import (
    AICodeRequest,
    CodeViolation,
    DeveloperRepositoryScore,
    GithubAccount,
    GithubCommitActivity,
    GithubPullRequestActivity,
    GithubRepository,
    RepositoryScan,
    StandardProfile,
    StandardRule,
)


class GovernanceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="member",
            password="strong-pass-123",
            email="member@example.com",
        )
        self.client.force_authenticate(user=self.user)

    def test_admin_can_create_starter_standard_profile(self):
        admin_user = User.objects.create_user(
            username="governance-admin",
            password="strong-pass-123",
            email="governance-admin@example.com",
            is_staff=True,
        )
        self.client.force_authenticate(user=admin_user)

        response = self.client.post("/api/standard-profiles/create-starter-profile/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(StandardProfile.objects.filter(is_default=True).exists())
        self.assertGreaterEqual(
            StandardRule.objects.filter(profile__is_default=True).count(),
            5,
        )
        self.assertEqual(response.data["name"], "Default Engineering Standard")

    @patch("api.governance_views.connect_github_account")
    def test_github_account_connect_endpoint_returns_masked_token(self, mock_connect):
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        mock_connect.return_value = account

        response = self.client.post(
            "/api/github-accounts/",
            {"access_token": "ghp_exampletoken1234"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["github_username"], "member-github")
        self.assertEqual(response.data["masked_token"], "***1234")
        self.assertNotIn("access_token", response.data)

    def test_admin_github_account_list_defaults_to_own_accounts_only(self):
        admin_user = User.objects.create_user(
            username="governance-admin",
            password="strong-pass-123",
            email="governance-admin@example.com",
            is_staff=True,
        )
        GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        self.client.force_authenticate(user=admin_user)

        response = self.client.get("/api/github-accounts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    @patch("api.views.queue_governance_login_sync")
    def test_login_response_queues_governance_sync(self, mock_queue_governance_login_sync):
        mock_queue_governance_login_sync.return_value = {
            "status": "queued",
            "account_count": 0,
        }

        response = self.client.post(
            "/api/login/",
            {
                "username": "member",
                "password": "strong-pass-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["governance_sync"]["status"], "queued")
        mock_queue_governance_login_sync.assert_called_once()

    @patch("api.views.queue_governance_login_sync")
    def test_login_response_survives_governance_sync_failure(self, mock_queue_governance_login_sync):
        mock_queue_governance_login_sync.side_effect = RuntimeError(
            "cannot schedule new futures after shutdown"
        )

        response = self.client.post(
            "/api/login/",
            {
                "username": "member",
                "password": "strong-pass-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["governance_sync"]["status"], "skipped")
        self.assertEqual(response.data["governance_sync"]["reason"], "login_sync_failed")

    def test_ai_validate_endpoint_creates_request_and_flags_var_usage(self):
        profile = ensure_default_standard_profile(created_by=self.user)

        response = self.client.post(
            "/api/ai-code-requests/validate/",
            {
                "standard_profile_id": profile.id,
                "provider_name": "openai",
                "model_name": "gpt-4",
                "task_summary": "Create a utility function",
                "prompt": "Write a small JS helper.",
                "output_files": [
                    {
                        "path": "src/utils/helper.js",
                        "content": "var total = 1;\nfunction helper() {\n  return total;\n}\n",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["validation_result"]["status"], "needs_changes")
        self.assertGreaterEqual(
            response.data["validation_result"]["violation_count"],
            2,
        )
        self.assertEqual(AICodeRequest.objects.count(), 1)
        self.assertEqual(AICodeRequest.objects.first().provider_name, "openai")

    def test_ai_prepare_endpoint_returns_standard_prompt_bundle(self):
        profile = ensure_default_standard_profile(created_by=self.user)

        response = self.client.post(
            "/api/ai-code-requests/prepare/",
            {
                "standard_profile_id": profile.id,
                "task_summary": "Generate a repository-ready service function.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profile_id"], profile.id)
        self.assertEqual(response.data["profile_name"], profile.name)
        self.assertIn("system_prompt", response.data)
        self.assertIn("output_contract", response.data)

    @patch("api.governance_services.fetch_recent_pull_request_items")
    @patch("api.governance_services.fetch_recent_commit_items")
    @patch("api.governance_services.fetch_latest_author_for_path")
    @patch("api.governance_services.fetch_recent_commit_activity")
    @patch("api.governance_services.fetch_repository_source_bundle")
    def test_repository_scan_service_records_violations_and_developer_scores(
        self,
        mock_source_bundle,
        mock_commit_activity,
        mock_latest_author,
        mock_commit_items,
        mock_pull_request_items,
    ):
        profile = ensure_default_standard_profile(created_by=self.user)
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="Python",
        )

        mock_source_bundle.return_value = {
            "commit_sha": "abc123",
            "tree_items": [
                {"path": "README.md"},
                {"path": "src/main.py"},
            ],
            "files": [
                {
                    "path": "src/main.py",
                    "content": (
                        "badName = 1\n\n"
                        "def oversized_function():\n"
                        "    line_1 = 1\n"
                        "    line_2 = 2\n"
                        "    line_3 = 3\n"
                        "    line_4 = 4\n"
                        "    line_5 = 5\n"
                        "    line_6 = 6\n"
                        "    line_7 = 7\n"
                        "    line_8 = 8\n"
                        "    line_9 = 9\n"
                        "    line_10 = 10\n"
                        "    line_11 = 11\n"
                        "    line_12 = 12\n"
                        "    line_13 = 13\n"
                        "    line_14 = 14\n"
                        "    line_15 = 15\n"
                        "    line_16 = 16\n"
                        "    line_17 = 17\n"
                        "    line_18 = 18\n"
                        "    line_19 = 19\n"
                        "    line_20 = 20\n"
                        "    return badName\n"
                    ),
                }
            ],
        }
        mock_commit_activity.return_value = {
            "member-github": {"display_name": "member-github", "commit_count": 3}
        }
        mock_latest_author.return_value = {
            "login": "member-github",
            "commit_sha": "abc123",
            "display_name": "member-github",
        }
        mock_commit_items.return_value = [
            {
                "sha": "abc123",
                "author_login": "member-github",
                "author_name": "member-github",
                "message_title": "feat: add smart governance flow",
                "message_body": "Adds the core dashboard metrics.",
                "additions": 120,
                "deletions": 10,
                "changed_files_count": 4,
                "commit_url": "https://example.com/commit/abc123",
                "committed_at": timezone.now(),
                "is_merge_commit": False,
                "metadata": {"verification": True},
            }
        ]
        mock_pull_request_items.return_value = [
            {
                "pull_number": 12,
                "author_login": "member-github",
                "author_name": "member-github",
                "title": "Improve governance dashboard",
                "body": "This pull request expands the governance dashboard with activity data.",
                "state": "closed",
                "is_draft": False,
                "is_merged": True,
                "additions": 120,
                "deletions": 10,
                "changed_files_count": 4,
                "comments_count": 2,
                "review_comments_count": 1,
                "commit_count": 3,
                "html_url": "https://example.com/pull/12",
                "opened_at": timezone.now(),
                "closed_at": timezone.now(),
                "merged_at": timezone.now(),
                "metadata": {"requested_reviewers": 1},
            }
        ]

        scan = scan_github_repository(repository=repository, triggered_by=self.user)
        repository.refresh_from_db()

        self.assertEqual(scan.status, "completed")
        self.assertEqual(scan.commit_sha, "abc123")
        self.assertGreaterEqual(scan.violation_count, 2)
        self.assertEqual(RepositoryScan.objects.count(), 1)
        self.assertGreaterEqual(CodeViolation.objects.filter(scan=scan).count(), 2)
        self.assertEqual(
            DeveloperRepositoryScore.objects.filter(
                scan=scan,
                github_login="member-github",
            ).count(),
            1,
        )
        self.assertEqual(GithubCommitActivity.objects.filter(repository=repository).count(), 1)
        self.assertEqual(
            GithubPullRequestActivity.objects.filter(repository=repository).count(),
            1,
        )
        self.assertIsNotNone(repository.latest_score)

    @patch("api.governance_services.github_api_request")
    def test_repository_source_bundle_reads_all_utf8_blobs_without_path_filtering(
        self,
        mock_github_api_request,
    ):
        profile = ensure_default_standard_profile(created_by=self.user)
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="JavaScript",
        )
        blob_contents = {
            "src-main": "var app = 1;\n",
            "node-modules": "var vendored = 1;\n",
            "dist-build": "var bundled = 1;\n",
            "no-extension": "var script = 1;\n",
        }

        def api_response(_token, path, **_kwargs):
            if path == "/repos/member-github/smart-hub/branches/main":
                return {"commit": {"sha": "commit-123"}}
            if path == "/repos/member-github/smart-hub/git/trees/commit-123":
                return {
                    "tree": [
                        {"type": "blob", "path": "src/main.js", "sha": "src-main"},
                        {
                            "type": "blob",
                            "path": "node_modules/pkg/index.js",
                            "sha": "node-modules",
                        },
                        {"type": "blob", "path": "dist/app.js", "sha": "dist-build"},
                        {"type": "blob", "path": "scripts/run", "sha": "no-extension"},
                    ]
                }
            blob_sha = path.rsplit("/", 1)[-1]
            return {
                "content": base64.b64encode(
                    blob_contents[blob_sha].encode("utf-8")
                ).decode("ascii")
            }

        mock_github_api_request.side_effect = api_response

        source_bundle = fetch_repository_source_bundle(repository)

        self.assertEqual(source_bundle["commit_sha"], "commit-123")
        self.assertEqual(
            {file_item["path"] for file_item in source_bundle["files"]},
            {
                "src/main.js",
                "node_modules/pkg/index.js",
                "dist/app.js",
                "scripts/run",
            },
        )

    def test_developer_overview_endpoint_returns_leaderboard_and_activity(self):
        profile = ensure_default_standard_profile(created_by=self.user)
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="Python",
        )
        scan = RepositoryScan.objects.create(
            repository=repository,
            standard_profile=profile,
            triggered_by=self.user,
            scan_type="manual",
            status="completed",
            score=92,
            summary={"score": 92},
            file_count=10,
            violation_count=1,
            developer_count=1,
        )
        DeveloperRepositoryScore.objects.create(
            scan=scan,
            repository=repository,
            github_login="member-github",
            display_name="member-github",
            commit_count=3,
            files_touched=5,
            violation_count=1,
            score=92,
            summary={
                "pull_request_count": 1,
                "merged_pull_request_count": 1,
                "average_commit_score": 95,
                "average_pull_request_score": 96,
            },
        )
        GithubCommitActivity.objects.create(
            repository=repository,
            scan=scan,
            sha="abc123",
            author_login="member-github",
            author_name="member-github",
            message_title="feat: add governance insights",
            quality_score=95,
            additions=40,
            deletions=5,
            changed_files_count=2,
            committed_at=timezone.now(),
        )
        GithubPullRequestActivity.objects.create(
            repository=repository,
            author_login="member-github",
            author_name="member-github",
            pull_number=7,
            title="Add governance insights",
            body="This PR adds leaderboard and activity cards to the governance page.",
            state="closed",
            is_merged=True,
            quality_score=96,
            additions=40,
            deletions=5,
            changed_files_count=2,
            comments_count=1,
            review_comments_count=1,
            commit_count=2,
            opened_at=timezone.now(),
            merged_at=timezone.now(),
        )

        response = self.client.get("/api/github-repositories/developer-overview/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["leaderboard"]), 1)
        self.assertEqual(response.data["leaderboard"][0]["github_login"], "member-github")
        self.assertEqual(len(response.data["recent_commits"]), 1)
        self.assertEqual(len(response.data["recent_pull_requests"]), 1)

    def test_developer_overview_hides_other_contributors_for_non_admin(self):
        profile = ensure_default_standard_profile(created_by=self.user)
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="Python",
        )
        scan = RepositoryScan.objects.create(
            repository=repository,
            standard_profile=profile,
            triggered_by=self.user,
            scan_type="manual",
            status="completed",
            score=88,
            summary={"score": 88},
            file_count=12,
            violation_count=3,
            developer_count=2,
        )
        DeveloperRepositoryScore.objects.create(
            scan=scan,
            repository=repository,
            github_login="member-github",
            display_name="member-github",
            commit_count=3,
            files_touched=5,
            violation_count=1,
            score=90,
            summary={"pull_request_count": 1},
        )
        DeveloperRepositoryScore.objects.create(
            scan=scan,
            repository=repository,
            github_login="teammate-github",
            display_name="teammate-github",
            commit_count=5,
            files_touched=8,
            violation_count=2,
            score=70,
            summary={"pull_request_count": 2},
        )
        GithubCommitActivity.objects.create(
            repository=repository,
            scan=scan,
            sha="abc123",
            author_login="member-github",
            author_name="member-github",
            message_title="feat: add personal governance insights",
            quality_score=94,
            additions=30,
            deletions=4,
            changed_files_count=2,
            committed_at=timezone.now(),
        )
        GithubCommitActivity.objects.create(
            repository=repository,
            scan=scan,
            sha="def456",
            author_login="teammate-github",
            author_name="teammate-github",
            message_title="feat: add teammate insights",
            quality_score=71,
            additions=45,
            deletions=9,
            changed_files_count=3,
            committed_at=timezone.now(),
        )
        GithubPullRequestActivity.objects.create(
            repository=repository,
            author_login="member-github",
            author_name="member-github",
            pull_number=7,
            title="Add personal governance insights",
            body="This PR adds my governance widgets and keeps the dashboard aligned.",
            state="closed",
            is_merged=True,
            quality_score=96,
            additions=40,
            deletions=5,
            changed_files_count=2,
            comments_count=1,
            review_comments_count=1,
            commit_count=2,
            opened_at=timezone.now(),
            merged_at=timezone.now(),
        )
        GithubPullRequestActivity.objects.create(
            repository=repository,
            author_login="teammate-github",
            author_name="teammate-github",
            pull_number=8,
            title="Add teammate governance insights",
            body="This PR adds governance details for another contributor in the same repo.",
            state="closed",
            is_merged=True,
            quality_score=73,
            additions=50,
            deletions=8,
            changed_files_count=4,
            comments_count=2,
            review_comments_count=2,
            commit_count=3,
            opened_at=timezone.now(),
            merged_at=timezone.now(),
        )

        response = self.client.get("/api/github-repositories/developer-overview/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["scope"], "self")
        self.assertEqual(len(response.data["leaderboard"]), 1)
        self.assertEqual(response.data["leaderboard"][0]["github_login"], "member-github")
        self.assertEqual(len(response.data["recent_commits"]), 1)
        self.assertEqual(response.data["recent_commits"][0]["author_login"], "member-github")
        self.assertEqual(len(response.data["recent_pull_requests"]), 1)
        self.assertEqual(
            response.data["recent_pull_requests"][0]["author_login"],
            "member-github",
        )

    def test_repository_scan_detail_keeps_all_violations_visible_for_non_admin(self):
        profile = ensure_default_standard_profile(created_by=self.user)
        rule = profile.rules.first()
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="Python",
        )
        scan = RepositoryScan.objects.create(
            repository=repository,
            standard_profile=profile,
            triggered_by=self.user,
            scan_type="manual",
            status="completed",
            score=84,
            summary={"score": 84},
            file_count=14,
            violation_count=4,
            developer_count=2,
        )
        DeveloperRepositoryScore.objects.create(
            scan=scan,
            repository=repository,
            github_login="member-github",
            display_name="member-github",
            commit_count=2,
            files_touched=3,
            violation_count=1,
            score=88,
            summary={},
        )
        DeveloperRepositoryScore.objects.create(
            scan=scan,
            repository=repository,
            github_login="teammate-github",
            display_name="teammate-github",
            commit_count=4,
            files_touched=6,
            violation_count=2,
            score=72,
            summary={},
        )
        CodeViolation.objects.create(
            scan=scan,
            repository=repository,
            rule=rule,
            severity="medium",
            code="member_violation",
            title="Member issue",
            file_path="src/member.py",
            line_number=12,
            message="Visible to the member.",
            author_login="member-github",
            commit_sha="abc123",
        )
        CodeViolation.objects.create(
            scan=scan,
            repository=repository,
            rule=rule,
            severity="high",
            code="team_violation",
            title="Teammate issue",
            file_path="src/teammate.py",
            line_number=8,
            message="Should stay visible in the repository violation list.",
            author_login="teammate-github",
            commit_sha="def456",
        )
        CodeViolation.objects.create(
            scan=scan,
            repository=repository,
            rule=rule,
            severity="medium",
            code="repo_violation",
            title="Repository issue",
            file_path="README.md",
            line_number=None,
            message="Repository-level findings remain visible.",
            author_login="",
            commit_sha="",
        )
        CodeViolation.objects.create(
            scan=scan,
            repository=repository,
            rule=rule,
            severity="medium",
            code="max_function_length",
            title="Removed rule issue",
            file_path="src/too_long.py",
            line_number=1,
            message="This removed rule should not be exposed anymore.",
            author_login="member-github",
            commit_sha="ghi789",
        )

        response = self.client.get(f"/api/repository-scans/{scan.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["developer_count"], 1)
        self.assertEqual(len(response.data["developer_scores"]), 1)
        self.assertEqual(
            response.data["developer_scores"][0]["github_login"],
            "member-github",
        )
        visible_authors = {violation["author_login"] for violation in response.data["violations"]}
        self.assertEqual(response.data["violation_count"], 3)
        self.assertEqual(len(response.data["violations"]), 3)
        self.assertNotIn(
            "max_function_length",
            {violation["code"] for violation in response.data["violations"]},
        )
        self.assertIn("member-github", visible_authors)
        self.assertIn("", visible_authors)
        self.assertIn("teammate-github", visible_authors)

    @override_settings(
        GITHUB_CLIENT_ID="client-id",
        GITHUB_CLIENT_SECRET="client-secret",
        FRONTEND_APP_URL="http://localhost:5173",
    )
    def test_github_oauth_authorize_endpoint_returns_signed_redirect_url(self):
        response = self.client.get("/api/github-accounts/oauth-authorize/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("authorize_url", response.data)
        self.assertIn("client_id=client-id", response.data["authorize_url"])
        self.assertEqual(
            response.data["redirect_uri"],
            "http://localhost:5173/github-governance",
        )
        self.assertTrue(response.data["state"])

    @patch("api.governance_views.connect_github_account_from_oauth_code")
    def test_github_oauth_connect_endpoint_returns_account_payload(self, mock_oauth_connect):
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        mock_oauth_connect.return_value = account

        response = self.client.post(
            "/api/github-accounts/oauth-connect/",
            {"code": "oauth-code", "state": "signed-state"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["github_username"], "member-github")
        self.assertEqual(response.data["masked_token"], "***1234")
        self.assertNotIn("access_token", response.data)

    @override_settings(GITHUB_WEBHOOK_SECRET="webhook-secret")
    @patch("api.governance_views.process_github_webhook_event")
    def test_github_webhook_endpoint_accepts_verified_events(self, mock_process_event):
        mock_process_event.return_value = {
            "status": "accepted",
            "repository": "member-github/smart-hub",
            "event_name": "push",
        }
        payload = {
            "ref": "refs/heads/main",
            "repository": {"full_name": "member-github/smart-hub"},
        }
        raw_payload = json.dumps(payload).encode("utf-8")
        signature = "sha256=" + hmac.new(
            b"webhook-secret",
            raw_payload,
            hashlib.sha256,
        ).hexdigest()

        response = self.client.post(
            "/api/github-webhooks/receive/",
            data=raw_payload,
            content_type="application/json",
            HTTP_X_GITHUB_EVENT="push",
            HTTP_X_HUB_SIGNATURE_256=signature,
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data["status"], "accepted")
        mock_process_event.assert_called_once()

    @override_settings(
        GITHUB_WEBHOOK_SECRET="webhook-secret",
        BACKEND_PUBLIC_URL="http://localhost:8000",
    )
    def test_repository_webhook_uses_polling_fallback_for_local_backend_url(self):
        profile = ensure_default_standard_profile(created_by=self.user)
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="JavaScript",
        )

        summary = ensure_repository_webhook(repository)
        repository.refresh_from_db()

        self.assertEqual(summary["status"], "polling_fallback")
        self.assertEqual(repository.metadata["webhook"]["status"], "polling_fallback")
        self.assertEqual(
            repository.metadata["webhook"]["reason"],
            "public_url_required",
        )

    @patch("api.governance_services.queue_repository_auto_sync")
    @patch("api.governance_services.ensure_repository_webhook")
    @patch("api.governance_services.github_api_request")
    def test_sync_github_repositories_queues_initial_auto_scan(
        self,
        mock_github_api_request,
        mock_ensure_repository_webhook,
        mock_queue_repository_auto_sync,
    ):
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        mock_github_api_request.return_value = [
            {
                "id": 101,
                "name": "smart-hub",
                "full_name": "member-github/smart-hub",
                "default_branch": "main",
                "language": "JavaScript",
                "html_url": "https://github.com/member-github/smart-hub",
                "description": "Repository for governance automation",
                "homepage": "",
                "visibility": "public",
                "private": False,
                "fork": False,
                "owner": {"login": "member-github", "type": "User"},
                "open_issues_count": 0,
                "watchers_count": 1,
                "forks_count": 0,
                "pushed_at": "2026-04-15T10:00:00Z",
            }
        ]
        mock_ensure_repository_webhook.return_value = {"status": "polling_fallback"}

        synced_count = sync_github_repositories(account=account)

        self.assertEqual(synced_count, 1)
        mock_queue_repository_auto_sync.assert_called_once()
        _, queue_kwargs = mock_queue_repository_auto_sync.call_args
        self.assertEqual(queue_kwargs["event_name"], "repository_sync")
        self.assertEqual(
            queue_kwargs["payload"]["reason"],
            "initial_or_stale_scan",
        )

    def test_finalize_stale_governance_runs_marks_old_running_scan_as_failed(self):
        profile = ensure_default_standard_profile(created_by=self.user)
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="Python",
        )
        scan = RepositoryScan.objects.create(
            repository=repository,
            standard_profile=profile,
            triggered_by=self.user,
            scan_type="manual",
            status="running",
            started_at=timezone.now() - timezone.timedelta(minutes=20),
            branch_name="main",
        )

        result = finalize_stale_governance_runs(scan_timeout_minutes=10)
        scan.refresh_from_db()

        self.assertEqual(result["stale_scan_count"], 1)
        self.assertEqual(scan.status, "failed")
        self.assertEqual(scan.summary["reason"], "stale_running_scan")
        self.assertIsNotNone(scan.completed_at)

    @patch("api.governance_services.queue_repository_auto_sync")
    def test_queue_due_polling_refreshes_queues_stale_polling_repository(self, mock_queue_repository_auto_sync):
        profile = ensure_default_standard_profile(created_by=self.user)
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="Python",
            metadata={
                "webhook": {
                    "status": "polling_fallback",
                },
                "auto_sync": {
                    "status": "completed",
                    "last_run_at": (
                        timezone.now() - timezone.timedelta(minutes=40)
                    ).isoformat(),
                },
            },
            latest_scan_at=timezone.now() - timezone.timedelta(minutes=30),
            last_pushed_at=timezone.now() - timezone.timedelta(minutes=10),
        )
        mock_queue_repository_auto_sync.return_value = {"status": "queued"}

        jobs = queue_due_polling_refreshes(repositories=[repository])

        self.assertEqual(len(jobs), 1)
        mock_queue_repository_auto_sync.assert_called_once()

    def test_commit_quality_uses_check_signals(self):
        profile = ensure_default_standard_profile(created_by=self.user)

        score, flags = evaluate_commit_quality(
            profile,
            {
                "message_title": "feat: add monitoring",
                "additions": 10,
                "deletions": 2,
                "changed_files_count": 1,
                "metadata": {
                    "verification": False,
                    "check_signals": {
                        "failed_checks": 2,
                        "pending_checks": 0,
                    },
                },
            },
        )

        self.assertLess(score, 100)
        self.assertIn("unverified_signature", {flag["code"] for flag in flags})
        self.assertIn("failed_ci_checks", {flag["code"] for flag in flags})

    def test_pull_request_quality_uses_reviews_and_checks(self):
        profile = ensure_default_standard_profile(created_by=self.user)

        score, flags = evaluate_pull_request_quality(
            profile,
            {
                "body": "Short body",
                "additions": 300,
                "deletions": 20,
                "changed_files_count": 5,
                "review_comments_count": 0,
                "is_draft": False,
                "is_merged": True,
                "metadata": {
                    "review_signals": {
                        "approved_reviews": 0,
                        "change_requests": 1,
                    },
                    "check_signals": {
                        "failed_checks": 1,
                        "pending_checks": 0,
                    },
                },
            },
        )

        self.assertLess(score, 100)
        codes = {flag["code"] for flag in flags}
        self.assertIn("missing_review_approval", codes)
        self.assertIn("changes_requested", codes)
        self.assertIn("failed_pr_checks", codes)

    def test_prepare_ai_remediation_bundle_returns_latest_scan_scope(self):
        profile = ensure_default_standard_profile(created_by=self.user)
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="Python",
        )
        scan = RepositoryScan.objects.create(
            repository=repository,
            standard_profile=profile,
            triggered_by=self.user,
            scan_type="manual",
            status="completed",
            score=84,
            summary={"score": 84},
            file_count=4,
            violation_count=1,
            developer_count=1,
        )
        rule = profile.rules.first()
        violation = CodeViolation.objects.create(
            scan=scan,
            repository=repository,
            rule=rule,
            severity="medium",
            code="naming_issue",
            title="Naming issue",
            file_path="src/service.py",
            line_number=12,
            message="Function name should follow the team convention.",
            author_login="member-github",
            commit_sha="abc123",
        )

        bundle = prepare_ai_remediation_bundle(repository=repository)

        self.assertEqual(bundle["scan_id"], scan.id)
        self.assertEqual(bundle["remediation_scope"][0]["violation_id"], violation.id)
        self.assertIn("src/service.py", bundle["affected_paths"])
        self.assertTrue(bundle["suggested_branch_name"].startswith("ai/remediation-"))

    def test_max_function_length_rule_is_removed_from_evaluation(self):
        profile = ensure_default_standard_profile(created_by=self.user)
        max_length_rule = StandardRule.objects.create(
            profile=profile,
            code="max_function_length",
            title="Functions should stay concise",
            description="Functions should stay within the configured line budget.",
            category="complexity",
            severity="medium",
            weight=6,
            order=99,
            config={
                "max_lines": 20,
                "extensions": [".js", ".jsx"],
            },
        )
        long_js_function = "\n".join(
            [
                "function renderScreen() {",
                *[f"  const value{i} = {i};" for i in range(24)],
                "  return value1;",
                "}",
            ]
        )

        evaluation = evaluate_source_bundle(
            standard_profile=profile,
            source_files=[
                {"path": "src/App.jsx", "content": long_js_function},
            ],
            repository_paths={"README.md", "tests/example.test.js", "src/App.jsx"},
        )

        self.assertTrue(max_length_rule.is_enabled)
        self.assertNotIn(
            "max_function_length",
            [violation["code"] for violation in evaluation["violations"]],
        )

    def test_prepare_remediation_endpoint_returns_bundle(self):
        profile = ensure_default_standard_profile(created_by=self.user)
        account = GithubAccount.objects.create(
            user=self.user,
            github_username="member-github",
            access_token="ghp_exampletoken1234",
            account_type="User",
        )
        repository = GithubRepository.objects.create(
            account=account,
            standard_profile=profile,
            name="smart-hub",
            full_name="member-github/smart-hub",
            owner_login="member-github",
            default_branch="main",
            primary_language="Python",
        )
        scan = RepositoryScan.objects.create(
            repository=repository,
            standard_profile=profile,
            triggered_by=self.user,
            scan_type="manual",
            status="completed",
            score=82,
            summary={"score": 82},
            file_count=5,
            violation_count=1,
            developer_count=1,
        )
        CodeViolation.objects.create(
            scan=scan,
            repository=repository,
            rule=profile.rules.first(),
            severity="medium",
            code="tests_required",
            title="Tests missing",
            file_path="README.md",
            line_number=None,
            message="Repository should expose tests for behavioral changes.",
        )

        response = self.client.post(
            "/api/ai-code-requests/prepare-remediation/",
            {"repository_id": repository.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["scan_id"], scan.id)
        self.assertEqual(len(response.data["remediation_scope"]), 1)
