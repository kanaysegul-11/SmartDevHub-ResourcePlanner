import base64
import hashlib
import hmac
import json
import re
import secrets
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from concurrent.futures import ThreadPoolExecutor
from collections import Counter, defaultdict
from decimal import Decimal
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request
import requests
from django.conf import settings
from django.core import signing
from django.db import close_old_connections, transaction
from django.utils import timezone

from .models import (
    AICodeRequest,
    AICodeValidationResult,
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


GITHUB_API_ROOT = "https://api.github.com"
GITHUB_OAUTH_AUTHORIZE_ROOT = "https://github.com/login/oauth/authorize"
GITHUB_OAUTH_TOKEN_ROOT = "https://github.com/login/oauth/access_token"
GITHUB_WEBHOOK_EVENTS = ("push", "pull_request")
TEXT_FILE_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".md",
    ".yml",
    ".yaml",
    ".html",
    ".css",
    ".java",
    ".cs",
}
AUTO_SYNC_EXECUTOR = ThreadPoolExecutor(
    max_workers=2,
    thread_name_prefix="governance-sync",
)
MAX_REPOSITORY_FILES = 80
MAX_BLOB_SIZE = 40000
SEVERITY_PENALTIES = {
    "low": 2,
    "medium": 5,
    "high": 8,
    "critical": 12,
}
DEFAULT_COMMIT_MESSAGE_PATTERN = (
    r"^(feat|fix|docs|refactor|test|chore|style|perf|build|ci)"
    r"(\([a-z0-9_\-/]+\))?: .{3,}$"
)

def github_session():
    session = requests.Session()

    retries = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    )

    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    return session

def is_governance_admin(user):
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and (user.is_staff or user.is_superuser)
    )


def get_user_github_logins(user):
    if not user or not getattr(user, "is_authenticated", False):
        return set()

    return {
        (github_username or "").strip().lower()
        for github_username in GithubAccount.objects.filter(
            user=user,
            is_active=True,
        ).values_list("github_username", flat=True)
        if github_username
    }


def _normalize_github_login(value):
    return (value or "").strip().lower()


def github_api_request(
    access_token,
    path,
    *,
    params=None,
    method="GET",
    data=None,
    extra_headers=None,
):
    url = f"{GITHUB_API_ROOT}{path}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "SmartDevHub-ResourcePlanner",
    }

    if extra_headers:
        headers.update(extra_headers)

    try:
        session = github_session()
        response = session.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            json=data,
            timeout=20,
        )

        response.raise_for_status()

    except requests.exceptions.HTTPError as exc:
        try:
            error_payload = response.json()
            error_message = error_payload.get("message") or str(exc)
        except Exception:
            error_message = str(exc)

        raise ValueError(f"GitHub API error: {error_message}") from exc

    except requests.exceptions.RequestException as exc:
        raise ValueError("GitHub API could not be reached.") from exc

    if not response.text:
        return {}

    return response.json()

def _frontend_app_url():
    return (getattr(settings, "FRONTEND_APP_URL", "") or "http://localhost:5173").rstrip(
        "/"
    )


def _backend_public_url():
    return (getattr(settings, "BACKEND_PUBLIC_URL", "") or "http://localhost:8000").rstrip(
        "/"
    )


def get_github_oauth_redirect_uri():
    configured_redirect_uri = (getattr(settings, "GITHUB_OAUTH_REDIRECT_URI", "") or "").strip()
    if configured_redirect_uri:
        return configured_redirect_uri
    return f"{_frontend_app_url()}/github-governance"


def get_github_webhook_callback_url():
    configured_target_url = (getattr(settings, "GITHUB_WEBHOOK_TARGET_URL", "") or "").strip()
    if configured_target_url:
        return configured_target_url
    return f"{_backend_public_url()}/api/github-webhooks/receive/"


def _github_oauth_scope():
    return (
        getattr(settings, "GITHUB_OAUTH_SCOPES", "")
        or "read:user repo read:org admin:repo_hook"
    ).strip()


def _is_local_url(url):
    normalized_url = (url or "").lower()
    return "localhost" in normalized_url or "127.0.0.1" in normalized_url


def build_github_integration_status():
    oauth_enabled = bool(
        getattr(settings, "GITHUB_CLIENT_ID", "") and getattr(settings, "GITHUB_CLIENT_SECRET", "")
    )
    webhook_secret_configured = bool(getattr(settings, "GITHUB_WEBHOOK_SECRET", ""))
    webhook_target_url = get_github_webhook_callback_url()

    return {
        "oauth_enabled": oauth_enabled,
        "oauth_redirect_uri": get_github_oauth_redirect_uri(),
        "oauth_scope": _github_oauth_scope(),
        "webhook_ready": webhook_secret_configured and bool(webhook_target_url),
        "webhook_secret_configured": webhook_secret_configured,
        "webhook_target_url": webhook_target_url,
        "webhook_events": list(GITHUB_WEBHOOK_EVENTS),
        "webhook_requires_public_url": _is_local_url(webhook_target_url),
        "auto_sync_mode": "background_thread",
        "personal_access_token_fallback": True,
    }


def build_github_oauth_authorize_url(*, user):
    if not getattr(settings, "GITHUB_CLIENT_ID", "") or not getattr(
        settings,
        "GITHUB_CLIENT_SECRET",
        "",
    ):
        raise ValueError("GitHub OAuth is not configured yet.")

    state = signing.dumps(
        {
            "user_id": user.id,
            "nonce": secrets.token_urlsafe(16),
        },
        salt="github-oauth-link",
    )
    query_string = urllib_parse.urlencode(
        {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": get_github_oauth_redirect_uri(),
            "scope": _github_oauth_scope(),
            "state": state,
            "allow_signup": "true",
        }
    )
    return {
        "authorize_url": f"{GITHUB_OAUTH_AUTHORIZE_ROOT}?{query_string}",
        "state": state,
        "redirect_uri": get_github_oauth_redirect_uri(),
        "scope": _github_oauth_scope(),
    }


def exchange_github_oauth_code_for_token(code):
    if not getattr(settings, "GITHUB_CLIENT_ID", "") or not getattr(
        settings,
        "GITHUB_CLIENT_SECRET",
        "",
    ):
        raise ValueError("GitHub OAuth is not configured yet.")

    request_body = urllib_parse.urlencode(
        {
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": get_github_oauth_redirect_uri(),
        }
    ).encode("utf-8")
    request_object = urllib_request.Request(
        GITHUB_OAUTH_TOKEN_ROOT,
        data=request_body,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "SmartDevHub-ResourcePlanner",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(request_object, timeout=20) as response:
            payload = response.read().decode("utf-8")
    except urllib_error.HTTPError as exc:
        raw_payload = exc.read().decode("utf-8", errors="ignore")
        try:
            error_payload = json.loads(raw_payload)
            error_message = error_payload.get("error_description") or error_payload.get("error")
        except json.JSONDecodeError:
            error_message = raw_payload or str(exc)
        raise ValueError(error_message or "GitHub OAuth exchange failed.") from exc
    except urllib_error.URLError as exc:
        raise ValueError("GitHub OAuth could not be reached.") from exc

    token_payload = json.loads(payload or "{}")
    access_token = token_payload.get("access_token")
    if not access_token:
        raise ValueError(
            token_payload.get("error_description")
            or token_payload.get("error")
            or "GitHub OAuth did not return an access token."
        )
    return access_token


def connect_github_account_from_oauth_code(*, user, code, state):
    if not code:
        raise ValueError("GitHub OAuth code is required.")

    try:
        state_payload = signing.loads(
            state,
            salt="github-oauth-link",
            max_age=900,
        )
    except signing.BadSignature as exc:
        raise ValueError("GitHub OAuth state is invalid or expired.") from exc

    if state_payload.get("user_id") != user.id:
        raise ValueError("GitHub OAuth state does not belong to the current user.")

    access_token = exchange_github_oauth_code_for_token(code)
    return connect_github_account(user=user, access_token=access_token)


def _update_repository_metadata(repository, **values):
    metadata = dict(repository.metadata or {})
    metadata.update(values)
    repository.metadata = metadata
    repository.save(update_fields=["metadata", "updated_at"])
    return metadata


def verify_github_webhook_signature(*, raw_body, signature_header):
    secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", "") or ""
    if not secret:
        raise ValueError("GitHub webhook secret is not configured.")

    expected_signature = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    if not signature_header or not hmac.compare_digest(expected_signature, signature_header):
        raise ValueError("GitHub webhook signature could not be verified.")


def ensure_repository_webhook(repository):
    integration_status = build_github_integration_status()
    callback_url = integration_status["webhook_target_url"]
    if not integration_status["webhook_ready"]:
        _update_repository_metadata(
            repository,
            webhook={
                "status": "skipped",
                "reason": "webhook_not_configured",
                "target_url": callback_url,
                "events": list(GITHUB_WEBHOOK_EVENTS),
                "checked_at": timezone.now().isoformat(),
            },
        )
        return {
            "status": "skipped",
            "reason": "webhook_not_configured",
            "target_url": callback_url,
        }

    try:
        hook_payloads = github_api_request(
            repository.account.access_token,
            f"/repos/{repository.full_name}/hooks",
        )
        existing_hook = next(
            (
                hook
                for hook in hook_payloads
                if (hook.get("config") or {}).get("url") == callback_url
            ),
            None,
        )
        desired_events = list(GITHUB_WEBHOOK_EVENTS)

        if existing_hook:
            hook_id = existing_hook.get("id")
            hook_payload = existing_hook
            current_events = set(existing_hook.get("events") or [])
            if not existing_hook.get("active") or not set(desired_events).issubset(current_events):
                hook_payload = github_api_request(
                    repository.account.access_token,
                    f"/repos/{repository.full_name}/hooks/{hook_id}",
                    method="PATCH",
                    data={
                        "active": True,
                        "events": desired_events,
                        "config": {
                            "url": callback_url,
                            "content_type": "json",
                            "secret": settings.GITHUB_WEBHOOK_SECRET,
                            "insecure_ssl": "0",
                        },
                    },
                )
            status_value = "active"
        else:
            hook_payload = github_api_request(
                repository.account.access_token,
                f"/repos/{repository.full_name}/hooks",
                method="POST",
                data={
                    "name": "web",
                    "active": True,
                    "events": desired_events,
                    "config": {
                        "url": callback_url,
                        "content_type": "json",
                        "secret": settings.GITHUB_WEBHOOK_SECRET,
                        "insecure_ssl": "0",
                    },
                },
            )
            status_value = "created"

        webhook_summary = {
            "status": status_value,
            "hook_id": hook_payload.get("id"),
            "target_url": callback_url,
            "events": hook_payload.get("events") or desired_events,
            "checked_at": timezone.now().isoformat(),
        }
        _update_repository_metadata(repository, webhook=webhook_summary)
        return webhook_summary
    except ValueError as exc:
        webhook_summary = {
            "status": "failed",
            "target_url": callback_url,
            "events": list(GITHUB_WEBHOOK_EVENTS),
            "checked_at": timezone.now().isoformat(),
            "error": str(exc),
        }
        _update_repository_metadata(repository, webhook=webhook_summary)
        return webhook_summary


def queue_repository_auto_sync(*, repository, event_name="", payload=None):
    queued_at = timezone.now().isoformat()
    _update_repository_metadata(
        repository,
        auto_sync={
            "status": "queued",
            "event_name": event_name,
            "queued_at": queued_at,
        },
    )
    AUTO_SYNC_EXECUTOR.submit(
        _run_repository_auto_sync_job,
        repository_id=repository.id,
        event_name=event_name,
        payload=payload or {},
    )
    return {
        "status": "queued",
        "repository": repository.full_name,
        "event_name": event_name,
        "queued_at": queued_at,
    }


def _run_repository_auto_sync_job(*, repository_id, event_name="", payload=None):
    close_old_connections()
    payload = payload or {}

    try:
        repository = GithubRepository.objects.select_related(
            "account",
            "standard_profile",
            "account__user",
        ).get(id=repository_id, is_active=True)
    except GithubRepository.DoesNotExist:
        close_old_connections()
        return

    try:
        scan = scan_github_repository(
            repository=repository,
            triggered_by=None,
            scan_type="scheduled",
        )
        _update_repository_metadata(
            repository,
            auto_sync={
                "status": "completed",
                "event_name": event_name,
                "last_run_at": timezone.now().isoformat(),
                "latest_scan_id": scan.id,
                "latest_scan_status": scan.status,
            },
        )
    except Exception as exc:
        _update_repository_metadata(
            repository,
            auto_sync={
                "status": "failed",
                "event_name": event_name,
                "last_run_at": timezone.now().isoformat(),
                "error": str(exc),
                "payload_action": payload.get("action") or "",
            },
        )
    finally:
        close_old_connections()


def process_github_webhook_event(*, event_name, payload):
    repository_payload = payload.get("repository") or {}
    repository_full_name = repository_payload.get("full_name") or ""
    if not repository_full_name:
        return {
            "status": "ignored",
            "reason": "repository_missing",
        }

    repository = GithubRepository.objects.select_related(
        "account",
        "standard_profile",
        "account__user",
    ).filter(full_name=repository_full_name, is_active=True).first()
    if not repository:
        return {
            "status": "ignored",
            "reason": "repository_not_connected",
            "repository": repository_full_name,
        }

    if event_name == "push":
        branch_name = (payload.get("ref") or "").split("/")[-1]
        if branch_name and branch_name != repository.default_branch:
            return {
                "status": "ignored",
                "reason": "branch_not_tracked",
                "repository": repository.full_name,
                "branch_name": branch_name,
            }
        head_commit = payload.get("head_commit") or {}
        pushed_at = _parse_github_datetime(head_commit.get("timestamp")) or timezone.now()
        repository.last_pushed_at = pushed_at
        repository.save(update_fields=["last_pushed_at", "updated_at"])
    elif event_name == "pull_request":
        action = payload.get("action") or ""
        if action not in {"opened", "edited", "reopened", "synchronize", "closed"}:
            return {
                "status": "ignored",
                "reason": "pull_request_action_not_tracked",
                "repository": repository.full_name,
                "action": action,
            }
    else:
        return {
            "status": "ignored",
            "reason": "event_not_supported",
            "repository": repository.full_name,
            "event_name": event_name,
        }

    queued_job = queue_repository_auto_sync(
        repository=repository,
        event_name=event_name,
        payload=payload,
    )
    return {
        "status": "accepted",
        "repository": repository.full_name,
        "event_name": event_name,
        "job": queued_job,
    }


def _starter_rule_definitions():
    return [
        {
            "code": "required_readme",
            "title": "Repository must include README",
            "description": "Every connected repository should expose a top-level README.",
            "category": "structure",
            "severity": "medium",
            "weight": 4,
            "order": 1,
            "config": {"required_paths": ["README.md"]},
        },
        {
            "code": "tests_required",
            "title": "Repository should include tests",
            "description": "Projects must expose a test directory or test/spec files.",
            "category": "testing",
            "severity": "high",
            "weight": 8,
            "order": 2,
            "config": {
                "test_path_prefixes": ["tests/", "test/", "__tests__/"],
                "test_file_suffixes": [
                    ".test.js",
                    ".spec.js",
                    ".test.ts",
                    ".spec.ts",
                    ".test.jsx",
                    ".spec.jsx",
                    ".test.tsx",
                    ".spec.tsx",
                    "_test.py",
                ],
            },
        },
        {
            "code": "no_var_keyword",
            "title": "Avoid var in JavaScript or TypeScript",
            "description": "Use let or const instead of var.",
            "category": "style",
            "severity": "medium",
            "weight": 5,
            "order": 3,
            "config": {
                "patterns": [
                    {
                        "pattern": r"\bvar\s+",
                        "message": "Use let or const instead of var.",
                    }
                ],
                "extensions": [".js", ".jsx", ".ts", ".tsx"],
            },
        },
        {
            "code": "python_snake_case_variables",
            "title": "Python variables should use snake_case",
            "description": "Python assignments should follow snake_case naming.",
            "category": "naming",
            "severity": "low",
            "weight": 3,
            "order": 4,
            "config": {"extensions": [".py"]},
        },
        {
            "code": "max_function_length",
            "title": "Functions should stay concise",
            "description": "Functions should stay within the configured line budget.",
            "category": "complexity",
            "severity": "medium",
            "weight": 6,
            "order": 5,
            "config": {
                "max_lines": 20,
                "extensions": [".py", ".js", ".jsx", ".ts", ".tsx"],
            },
        },
        {
            "code": "commit_message_convention",
            "title": "Commit messages should follow the team convention",
            "description": "Commit messages should use a conventional prefix and an explicit summary.",
            "category": "style",
            "severity": "medium",
            "weight": 5,
            "order": 6,
            "config": {
                "commit_message_pattern": DEFAULT_COMMIT_MESSAGE_PATTERN,
                "min_length": 10,
            },
        },
        {
            "code": "pull_request_description_required",
            "title": "Pull requests should include a clear description",
            "description": "PR descriptions should explain the change and its impact.",
            "category": "structure",
            "severity": "medium",
            "weight": 5,
            "order": 7,
            "config": {
                "min_body_length": 40,
                "large_change_threshold": 600,
            },
        },
    ]


def ensure_default_standard_profile(*, created_by=None):
    profile = StandardProfile.objects.filter(is_default=True).first()
    if profile:
        existing_codes = set(profile.rules.values_list("code", flat=True))
        missing_rules = [
            StandardRule(profile=profile, **rule_data)
            for rule_data in _starter_rule_definitions()
            if rule_data["code"] not in existing_codes
        ]
        if missing_rules:
            StandardRule.objects.bulk_create(missing_rules)
        return profile

    with transaction.atomic():
        profile = StandardProfile.objects.create(
            name="Default Engineering Standard",
            description=(
                "Shared baseline for repository structure, naming, testing, "
                "and AI-assisted code generation."
            ),
            target_stack="polyglot",
            is_default=True,
            rule_manifest={
                "naming": "Prefer descriptive names and keep naming consistent with the language.",
                "testing": "Every feature change should be accompanied by tests when applicable.",
                "formatting": "Generated code must pass the team's formatter and lint rules.",
                "commit_message_pattern": DEFAULT_COMMIT_MESSAGE_PATTERN,
                "pull_request_min_body_length": 40,
            },
            ai_manifest={
                "tone": "professional",
                "output_schema": {
                    "summary": "short explanation",
                    "files": [{"path": "relative/path.ext", "content": "code"}],
                },
                "validation_loop": True,
            },
            created_by=created_by,
        )
        StandardRule.objects.bulk_create(
            [
                StandardRule(profile=profile, **rule_data)
                for rule_data in _starter_rule_definitions()
            ]
        )

    return profile


def connect_github_account(*, user, access_token):
    profile_payload = github_api_request(access_token, "/user")
    login = profile_payload.get("login")
    if not login:
        raise ValueError("GitHub user response did not include a login.")

    account, _ = GithubAccount.objects.update_or_create(
        user=user,
        github_username=login,
        defaults={
            "github_user_id": profile_payload.get("id"),
            "account_type": profile_payload.get("type") or "",
            "access_token": access_token,
            "avatar_url": profile_payload.get("avatar_url") or "",
            "profile_url": profile_payload.get("html_url") or "",
            "metadata": {
                "name": profile_payload.get("name") or "",
                "public_repos": profile_payload.get("public_repos") or 0,
                "followers": profile_payload.get("followers") or 0,
            },
            "last_synced_at": timezone.now(),
            "is_active": True,
        },
    )
    sync_github_repositories(account=account)
    return account


def sync_github_repositories(*, account):
    repository_payloads = github_api_request(
        account.access_token,
        "/user/repos",
        params={
            "sort": "updated",
            "per_page": 100,
            "affiliation": "owner,collaborator,organization_member",
        },
    )
    default_profile = ensure_default_standard_profile(created_by=account.user)
    synced_repository_ids = []

    for repository_payload in repository_payloads:
        owner_payload = repository_payload.get("owner") or {}
        existing_repository = GithubRepository.objects.filter(
            full_name=repository_payload.get("full_name")
        ).only("metadata").first()
        existing_metadata = dict(getattr(existing_repository, "metadata", {}) or {})
        repository, _ = GithubRepository.objects.update_or_create(
            full_name=repository_payload.get("full_name"),
            defaults={
                "account": account,
                "standard_profile": default_profile,
                "external_id": repository_payload.get("id"),
                "name": repository_payload.get("name") or repository_payload.get("full_name"),
                "owner_login": owner_payload.get("login") or "",
                "default_branch": repository_payload.get("default_branch") or "main",
                "primary_language": repository_payload.get("language") or "",
                "repository_url": repository_payload.get("html_url") or "",
                "description": repository_payload.get("description") or "",
                "homepage_url": repository_payload.get("homepage") or "",
                "visibility": repository_payload.get("visibility") or (
                    "private" if repository_payload.get("private") else "public"
                ),
                "is_private": bool(repository_payload.get("private")),
                "is_fork": bool(repository_payload.get("fork")),
                "is_organization_repo": bool(owner_payload.get("type") == "Organization"),
                "metadata": {
                    **existing_metadata,
                    "open_issues_count": repository_payload.get("open_issues_count") or 0,
                    "watchers_count": repository_payload.get("watchers_count") or 0,
                    "forks_count": repository_payload.get("forks_count") or 0,
                },
                "last_pushed_at": _parse_github_datetime(repository_payload.get("pushed_at")),
                "last_synced_at": timezone.now(),
                "is_active": True,
            },
        )
        synced_repository_ids.append(repository.id)
        ensure_repository_webhook(repository)

    if synced_repository_ids:
        GithubRepository.objects.filter(account=account).exclude(
            id__in=synced_repository_ids
        ).update(is_active=False, last_synced_at=timezone.now())
    account.last_synced_at = timezone.now()
    account.save(update_fields=["last_synced_at"])
    return account.repositories.count()


def fetch_repository_tree(repository):
    branch_payload = github_api_request(
        repository.account.access_token,
        f"/repos/{repository.full_name}/branches/{repository.default_branch}",
    )
    branch_commit = (branch_payload.get("commit") or {}).get("sha")
    if not branch_commit:
        raise ValueError("GitHub repository branch information is incomplete.")

    tree_payload = github_api_request(
        repository.account.access_token,
        f"/repos/{repository.full_name}/git/trees/{branch_commit}",
        params={"recursive": 1},
    )
    return branch_commit, tree_payload.get("tree") or []


def fetch_repository_source_bundle(repository):
    branch_commit, tree_items = fetch_repository_tree(repository)
    allowed_blob_items = []
    for item in tree_items:
        if item.get("type") != "blob":
            continue
        path = item.get("path") or ""
        extension = _get_extension(path)
        if extension not in TEXT_FILE_EXTENSIONS:
            continue
        if int(item.get("size") or 0) > MAX_BLOB_SIZE:
            continue
        allowed_blob_items.append(item)

    allowed_blob_items = allowed_blob_items[:MAX_REPOSITORY_FILES]
    source_files = []
    for item in allowed_blob_items:
        blob_payload = github_api_request(
            repository.account.access_token,
            f"/repos/{repository.full_name}/git/blobs/{item.get('sha')}",
        )
        encoded_content = blob_payload.get("content") or ""
        if not encoded_content:
            continue
        try:
            decoded_bytes = base64.b64decode(encoded_content)
            content = decoded_bytes.decode("utf-8")
        except (ValueError, UnicodeDecodeError):
            continue

        source_files.append(
            {
                "path": item.get("path") or "",
                "content": content,
                "sha": item.get("sha") or "",
                "size": item.get("size") or 0,
            }
        )

    return {
        "commit_sha": branch_commit,
        "tree_items": tree_items,
        "files": source_files,
    }


def fetch_recent_commit_activity(repository, *, max_commits=30):
    commit_payloads = github_api_request(
        repository.account.access_token,
        f"/repos/{repository.full_name}/commits",
        params={"per_page": max_commits},
    )
    activity = defaultdict(lambda: {"display_name": "", "commit_count": 0})
    for commit_payload in commit_payloads:
        author_payload = commit_payload.get("author") or {}
        commit_author = (commit_payload.get("commit") or {}).get("author") or {}
        login = author_payload.get("login") or commit_author.get("email") or "unknown"
        display_name = (
            author_payload.get("login")
            or commit_author.get("name")
            or commit_author.get("email")
            or "Unknown"
        )
        activity[login]["display_name"] = display_name
        activity[login]["commit_count"] += 1
    return activity


def fetch_latest_author_for_path(repository, file_path, *, cache=None):
    cache = cache if cache is not None else {}
    if file_path in cache:
        return cache[file_path]

    commit_payloads = github_api_request(
        repository.account.access_token,
        f"/repos/{repository.full_name}/commits",
        params={"path": file_path, "per_page": 1},
    )
    if not commit_payloads:
        cache[file_path] = {"login": "", "commit_sha": "", "display_name": ""}
        return cache[file_path]

    commit_payload = commit_payloads[0]
    author_payload = commit_payload.get("author") or {}
    commit_author = (commit_payload.get("commit") or {}).get("author") or {}
    author_info = {
        "login": author_payload.get("login")
        or commit_author.get("email")
        or "unknown",
        "commit_sha": commit_payload.get("sha") or "",
        "display_name": author_payload.get("login")
        or commit_author.get("name")
        or commit_author.get("email")
        or "Unknown",
    }
    cache[file_path] = author_info
    return author_info


def fetch_recent_commit_items(repository, *, max_commits=20):
    commit_payloads = github_api_request(
        repository.account.access_token,
        f"/repos/{repository.full_name}/commits",
        params={"per_page": max_commits},
    )
    commit_items = []

    for commit_payload in commit_payloads:
        sha = commit_payload.get("sha")
        if not sha:
            continue

        detail_payload = github_api_request(
            repository.account.access_token,
            f"/repos/{repository.full_name}/commits/{sha}",
        )
        commit_author = (commit_payload.get("commit") or {}).get("author") or {}
        author_payload = commit_payload.get("author") or {}
        message = (commit_payload.get("commit") or {}).get("message") or ""
        title, body = _split_message(message)
        stats = detail_payload.get("stats") or {}
        files = detail_payload.get("files") or []
        commit_items.append(
            {
                "sha": sha,
                "author_login": author_payload.get("login")
                or commit_author.get("email")
                or "unknown",
                "author_name": author_payload.get("login")
                or commit_author.get("name")
                or commit_author.get("email")
                or "Unknown",
                "message_title": title,
                "message_body": body,
                "additions": stats.get("additions") or 0,
                "deletions": stats.get("deletions") or 0,
                "changed_files_count": len(files),
                "commit_url": detail_payload.get("html_url")
                or commit_payload.get("html_url")
                or "",
                "committed_at": _parse_github_datetime(commit_author.get("date")),
                "is_merge_commit": len(detail_payload.get("parents") or []) > 1,
                "metadata": {
                    "verification": (detail_payload.get("commit") or {})
                    .get("verification", {})
                    .get("verified", False),
                },
            }
        )

    return commit_items


def fetch_recent_pull_request_items(repository, *, max_pull_requests=20):
    pull_payloads = github_api_request(
        repository.account.access_token,
        f"/repos/{repository.full_name}/pulls",
        params={"state": "all", "sort": "updated", "direction": "desc", "per_page": max_pull_requests},
    )
    pull_request_items = []

    for pull_payload in pull_payloads:
        pull_number = pull_payload.get("number") or 0
        if not pull_number:
            continue
        detail_payload = github_api_request(
            repository.account.access_token,
            f"/repos/{repository.full_name}/pulls/{pull_number}",
        )
        author_payload = pull_payload.get("user") or {}
        pull_request_items.append(
            {
                "pull_number": pull_number,
                "author_login": author_payload.get("login") or "unknown",
                "author_name": author_payload.get("login") or author_payload.get("type") or "Unknown",
                "title": detail_payload.get("title") or pull_payload.get("title") or "",
                "body": detail_payload.get("body") or pull_payload.get("body") or "",
                "state": detail_payload.get("state") or pull_payload.get("state") or "open",
                "is_draft": bool(detail_payload.get("draft") or pull_payload.get("draft")),
                "is_merged": bool(detail_payload.get("merged_at") or pull_payload.get("merged_at")),
                "additions": detail_payload.get("additions") or 0,
                "deletions": detail_payload.get("deletions") or 0,
                "changed_files_count": detail_payload.get("changed_files") or 0,
                "comments_count": detail_payload.get("comments") or 0,
                "review_comments_count": detail_payload.get("review_comments") or 0,
                "commit_count": detail_payload.get("commits") or 0,
                "html_url": detail_payload.get("html_url") or pull_payload.get("html_url") or "",
                "opened_at": _parse_github_datetime(
                    detail_payload.get("created_at") or pull_payload.get("created_at")
                ),
                "closed_at": _parse_github_datetime(
                    detail_payload.get("closed_at") or pull_payload.get("closed_at")
                ),
                "merged_at": _parse_github_datetime(
                    detail_payload.get("merged_at") or pull_payload.get("merged_at")
                ),
                "metadata": {
                    "requested_reviewers": len(detail_payload.get("requested_reviewers") or []),
                },
            }
        )

    return pull_request_items


def sync_repository_activity(*, repository, scan=None, max_commits=20, max_pull_requests=20):
    profile = repository.standard_profile or ensure_default_standard_profile(
        created_by=repository.account.user
    )
    commit_items = fetch_recent_commit_items(repository, max_commits=max_commits)
    pull_request_items = fetch_recent_pull_request_items(
        repository,
        max_pull_requests=max_pull_requests,
    )

    commit_records = []
    for commit_item in commit_items:
        quality_score, quality_flags = evaluate_commit_quality(profile, commit_item)
        commit_record, _ = GithubCommitActivity.objects.update_or_create(
            repository=repository,
            sha=commit_item["sha"],
            defaults={
                "scan": scan,
                "author_login": commit_item["author_login"],
                "author_name": commit_item["author_name"],
                "message_title": commit_item["message_title"],
                "message_body": commit_item["message_body"],
                "quality_score": Decimal(str(quality_score)),
                "quality_flags": quality_flags,
                "additions": commit_item["additions"],
                "deletions": commit_item["deletions"],
                "changed_files_count": commit_item["changed_files_count"],
                "commit_url": commit_item["commit_url"],
                "committed_at": commit_item["committed_at"],
                "is_merge_commit": commit_item["is_merge_commit"],
                "metadata": commit_item["metadata"],
            },
        )
        commit_records.append(commit_record)

    pull_request_records = []
    for pull_request_item in pull_request_items:
        quality_score, quality_flags = evaluate_pull_request_quality(
            profile,
            pull_request_item,
        )
        pull_request_record, _ = GithubPullRequestActivity.objects.update_or_create(
            repository=repository,
            pull_number=pull_request_item["pull_number"],
            defaults={
                "author_login": pull_request_item["author_login"],
                "author_name": pull_request_item["author_name"],
                "title": pull_request_item["title"],
                "body": pull_request_item["body"],
                "state": pull_request_item["state"],
                "is_draft": pull_request_item["is_draft"],
                "is_merged": pull_request_item["is_merged"],
                "quality_score": Decimal(str(quality_score)),
                "quality_flags": quality_flags,
                "additions": pull_request_item["additions"],
                "deletions": pull_request_item["deletions"],
                "changed_files_count": pull_request_item["changed_files_count"],
                "comments_count": pull_request_item["comments_count"],
                "review_comments_count": pull_request_item["review_comments_count"],
                "commit_count": pull_request_item["commit_count"],
                "html_url": pull_request_item["html_url"],
                "opened_at": pull_request_item["opened_at"],
                "closed_at": pull_request_item["closed_at"],
                "merged_at": pull_request_item["merged_at"],
                "metadata": pull_request_item["metadata"],
            },
        )
        pull_request_records.append(pull_request_record)

    repository.last_synced_at = timezone.now()
    repository.save(update_fields=["last_synced_at", "updated_at"])
    return build_developer_activity_summary(commit_records, pull_request_records)


def scan_github_repository(*, repository, triggered_by=None, scan_type="manual"):
    standard_profile = repository.standard_profile or ensure_default_standard_profile(
        created_by=triggered_by or repository.account.user
    )
    scan = RepositoryScan.objects.create(
        repository=repository,
        standard_profile=standard_profile,
        triggered_by=triggered_by,
        scan_type=scan_type,
        status="running",
        started_at=timezone.now(),
        branch_name=repository.default_branch,
    )

    try:
        source_bundle = fetch_repository_source_bundle(repository)
        activity = fetch_recent_commit_activity(repository)
        developer_activity = sync_repository_activity(repository=repository, scan=scan)
        evaluation = evaluate_source_bundle(
            standard_profile=standard_profile,
            source_files=source_bundle["files"],
            repository_paths=[item.get("path") or "" for item in source_bundle["tree_items"]],
        )
        _persist_scan_results(
            scan=scan,
            repository=repository,
            evaluation=evaluation,
            commit_activity=activity,
            developer_activity=developer_activity,
            author_lookup=lambda path, cache={}: fetch_latest_author_for_path(
                repository,
                path,
                cache=cache,
            ),
            commit_sha=source_bundle["commit_sha"],
        )
    except Exception as exc:
        scan.status = "failed"
        scan.summary = {"error": str(exc)}
        scan.completed_at = timezone.now()
        scan.save(update_fields=["status", "summary", "completed_at"])
        raise

    repository.latest_score = scan.score
    repository.latest_scan_at = scan.completed_at
    repository.last_synced_at = timezone.now()
    repository.save(
        update_fields=["latest_score", "latest_scan_at", "last_synced_at", "updated_at"]
    )
    return scan


def prepare_ai_prompt_bundle(*, repository=None, standard_profile=None, task_summary=""):
    profile = standard_profile or (
        repository.standard_profile if repository else None
    ) or ensure_default_standard_profile()
    active_rules = list(profile.rules.filter(is_enabled=True).order_by("order", "id"))
    repository_context = {
        "repository": getattr(repository, "full_name", ""),
        "default_branch": getattr(repository, "default_branch", ""),
        "primary_language": getattr(repository, "primary_language", ""),
        "latest_score": str(getattr(repository, "latest_score", "") or ""),
    }
    instructions = [rule.description or _rule_instruction(rule) for rule in active_rules]
    output_contract = {
        "summary": "One short explanation of the change.",
        "files": [{"path": "relative/path.ext", "content": "full file content"}],
        "tests": [{"path": "tests/example_test.py", "content": "test content"}],
    }
    system_prompt = "\n".join(
        [
            "You are producing repository-ready code that must follow the company's engineering standard.",
            f"Standard profile: {profile.name}",
            "Rules:",
            *[f"- {instruction}" for instruction in instructions],
            "Return changes in the agreed JSON schema and include tests when the change affects behavior.",
        ]
    )

    return {
        "profile_id": profile.id,
        "profile_name": profile.name,
        "system_prompt": system_prompt,
        "repository_context": repository_context,
        "rule_manifest": profile.rule_manifest,
        "ai_manifest": profile.ai_manifest,
        "output_contract": output_contract,
        "task_summary": task_summary,
    }


def validate_ai_output(
    *,
    requested_by,
    repository=None,
    standard_profile=None,
    provider_name="",
    model_name="",
    task_summary="",
    prompt="",
    output_files=None,
):
    profile = standard_profile or (
        repository.standard_profile if repository else None
    ) or ensure_default_standard_profile(created_by=requested_by)
    output_files = output_files or []
    prepared_bundle = prepare_ai_prompt_bundle(
        repository=repository,
        standard_profile=profile,
        task_summary=task_summary,
    )
    repository_paths = [item.get("path") or "" for item in output_files]
    evaluation = evaluate_source_bundle(
        standard_profile=profile,
        source_files=output_files,
        repository_paths=repository_paths,
    )

    validation_status = "validated" if not evaluation["violations"] else "needs_changes"
    ai_request = AICodeRequest.objects.create(
        repository=repository,
        standard_profile=profile,
        requested_by=requested_by,
        provider_name=provider_name,
        model_name=model_name,
        task_summary=task_summary,
        prompt=prompt,
        prepared_prompt=prepared_bundle["system_prompt"],
        output_payload={
            "files": output_files,
            "output_contract": prepared_bundle["output_contract"],
        },
        validation_status=validation_status,
        validation_score=Decimal(str(evaluation["score"])),
        validation_summary=evaluation["summary"],
    )
    validation_result = AICodeValidationResult.objects.create(
        request=ai_request,
        status=validation_status,
        score=Decimal(str(evaluation["score"])),
        violation_count=len(evaluation["violations"]),
        summary=evaluation["summary"],
    )
    return ai_request, validation_result, evaluation, prepared_bundle


def serialize_evaluation(evaluation):
    serialized_violations = []
    for violation in evaluation.get("violations") or []:
        serialized_violations.append(
            {
                "code": violation.get("code"),
                "title": violation.get("title"),
                "severity": violation.get("severity"),
                "weight": violation.get("weight"),
                "message": violation.get("message"),
                "file_path": violation.get("file_path"),
                "line_number": violation.get("line_number"),
                "metadata": violation.get("metadata") or {},
            }
        )

    return {
        "score": evaluation.get("score"),
        "summary": evaluation.get("summary") or {},
        "file_count": evaluation.get("file_count") or 0,
        "violations": serialized_violations,
    }


def evaluate_commit_quality(profile, commit_item):
    pattern = (
        profile.rule_manifest.get("commit_message_pattern")
        or DEFAULT_COMMIT_MESSAGE_PATTERN
    )
    minimum_length = int(profile.rule_manifest.get("commit_message_min_length") or 10)
    score = 100
    flags = []
    title = (commit_item.get("message_title") or "").strip()
    total_changes = int(commit_item.get("additions") or 0) + int(
        commit_item.get("deletions") or 0
    )

    if len(title) < minimum_length:
        flags.append(
            {
                "code": "short_commit_message",
                "message": "Commit title is too short to explain the change clearly.",
                "severity": "medium",
            }
        )
        score -= 15

    if title and not re.match(pattern, title):
        flags.append(
            {
                "code": "commit_message_pattern",
                "message": "Commit title does not match the configured team convention.",
                "severity": "medium",
            }
        )
        score -= 20

    if total_changes > 600 or int(commit_item.get("changed_files_count") or 0) > 20:
        flags.append(
            {
                "code": "oversized_commit",
                "message": "Commit is large enough to benefit from a smaller, reviewable split.",
                "severity": "low",
            }
        )
        score -= 8

    return max(score, 0), flags


def evaluate_pull_request_quality(profile, pull_request_item):
    minimum_body_length = int(profile.rule_manifest.get("pull_request_min_body_length") or 40)
    score = 100
    flags = []
    body = (pull_request_item.get("body") or "").strip()
    total_changes = int(pull_request_item.get("additions") or 0) + int(
        pull_request_item.get("deletions") or 0
    )

    if len(body) < minimum_body_length:
        flags.append(
            {
                "code": "missing_pull_request_description",
                "message": "Pull request description should explain what changed and why.",
                "severity": "medium",
            }
        )
        score -= 18

    if pull_request_item.get("is_draft"):
        flags.append(
            {
                "code": "draft_pull_request",
                "message": "Draft pull request is still in progress.",
                "severity": "low",
            }
        )
        score -= 8

    if total_changes > 900 or int(pull_request_item.get("changed_files_count") or 0) > 25:
        flags.append(
            {
                "code": "oversized_pull_request",
                "message": "Pull request scope is large and may be difficult to review quickly.",
                "severity": "medium",
            }
        )
        score -= 12

    if total_changes > 250 and int(pull_request_item.get("review_comments_count") or 0) == 0:
        flags.append(
            {
                "code": "low_review_signal",
                "message": "Large pull request has little visible review discussion.",
                "severity": "low",
            }
        )
        score -= 6

    return max(score, 0), flags


def build_developer_activity_summary(commit_records, pull_request_records):
    summary = defaultdict(
        lambda: {
            "display_name": "",
            "commit_count": 0,
            "pull_request_count": 0,
            "merged_pull_request_count": 0,
            "commit_score_total": 0.0,
            "commit_score_count": 0,
            "pull_request_score_total": 0.0,
            "pull_request_score_count": 0,
            "last_commit_at": None,
            "last_pull_request_at": None,
        }
    )

    for commit_record in commit_records:
        login = commit_record.author_login or "unknown"
        developer = summary[login]
        developer["display_name"] = commit_record.author_name or login
        developer["commit_count"] += 1
        if commit_record.quality_score is not None:
            developer["commit_score_total"] += float(commit_record.quality_score)
            developer["commit_score_count"] += 1
        if commit_record.committed_at and (
            not developer["last_commit_at"]
            or commit_record.committed_at > developer["last_commit_at"]
        ):
            developer["last_commit_at"] = commit_record.committed_at

    for pull_request_record in pull_request_records:
        login = pull_request_record.author_login or "unknown"
        developer = summary[login]
        developer["display_name"] = pull_request_record.author_name or login
        developer["pull_request_count"] += 1
        developer["merged_pull_request_count"] += 1 if pull_request_record.is_merged else 0
        if pull_request_record.quality_score is not None:
            developer["pull_request_score_total"] += float(pull_request_record.quality_score)
            developer["pull_request_score_count"] += 1
        reference_time = pull_request_record.merged_at or pull_request_record.opened_at
        if reference_time and (
            not developer["last_pull_request_at"]
            or reference_time > developer["last_pull_request_at"]
        ):
            developer["last_pull_request_at"] = reference_time

    finalized_summary = {}
    for login, developer in summary.items():
        finalized_summary[login] = {
            "display_name": developer["display_name"],
            "commit_count": developer["commit_count"],
            "pull_request_count": developer["pull_request_count"],
            "merged_pull_request_count": developer["merged_pull_request_count"],
            "average_commit_score": round(
                developer["commit_score_total"] / developer["commit_score_count"],
                2,
            )
            if developer["commit_score_count"]
            else None,
            "average_pull_request_score": round(
                developer["pull_request_score_total"]
                / developer["pull_request_score_count"],
                2,
            )
            if developer["pull_request_score_count"]
            else None,
            "last_commit_at": developer["last_commit_at"].isoformat()
            if developer["last_commit_at"]
            else None,
            "last_pull_request_at": developer["last_pull_request_at"].isoformat()
            if developer["last_pull_request_at"]
            else None,
        }

    return finalized_summary


def build_developer_governance_overview(repositories, *, viewer=None):
    repository_ids = [repository.id for repository in repositories]
    if not repository_ids:
        return {
            "leaderboard": [],
            "recent_commits": [],
            "recent_pull_requests": [],
            "scope": "team" if is_governance_admin(viewer) else "self",
        }

    restrict_to_viewer = bool(
        viewer
        and getattr(viewer, "is_authenticated", False)
        and not is_governance_admin(viewer)
    )
    visible_logins = get_user_github_logins(viewer) if restrict_to_viewer else set()
    latest_scans_by_repository = {}
    scans = (
        RepositoryScan.objects.filter(repository_id__in=repository_ids)
        .prefetch_related("developer_scores")
        .order_by("repository_id", "-created_at")
    )
    for scan in scans:
        latest_scans_by_repository.setdefault(scan.repository_id, scan)

    leaderboard = defaultdict(
        lambda: {
            "github_login": "",
            "display_name": "",
            "repository_count": 0,
            "violation_count": 0,
            "files_touched": 0,
            "scan_score_total": 0.0,
            "scan_score_count": 0,
            "commit_count": 0,
            "commit_score_total": 0.0,
            "commit_score_count": 0,
            "pull_request_count": 0,
            "merged_pull_request_count": 0,
            "pull_request_score_total": 0.0,
            "pull_request_score_count": 0,
            "last_activity_at": None,
        }
    )

    for scan in latest_scans_by_repository.values():
        for developer_score in scan.developer_scores.all():
            login = developer_score.github_login or "unknown"
            if restrict_to_viewer and _normalize_github_login(login) not in visible_logins:
                continue
            entry = leaderboard[login]
            entry["github_login"] = login
            entry["display_name"] = developer_score.display_name or login
            entry["repository_count"] += 1
            entry["violation_count"] += developer_score.violation_count or 0
            entry["files_touched"] += developer_score.files_touched or 0
            if developer_score.score is not None:
                entry["scan_score_total"] += float(developer_score.score)
                entry["scan_score_count"] += 1

    all_commits = list(
        GithubCommitActivity.objects.filter(repository_id__in=repository_ids).select_related(
            "repository"
        )
    )
    if restrict_to_viewer:
        all_commits = [
            commit
            for commit in all_commits
            if _normalize_github_login(commit.author_login) in visible_logins
        ]
    for commit in all_commits:
        login = commit.author_login or "unknown"
        entry = leaderboard[login]
        entry["github_login"] = login
        entry["display_name"] = commit.author_name or login
        entry["commit_count"] += 1
        if commit.quality_score is not None:
            entry["commit_score_total"] += float(commit.quality_score)
            entry["commit_score_count"] += 1
        if commit.committed_at and (
            not entry["last_activity_at"] or commit.committed_at > entry["last_activity_at"]
        ):
            entry["last_activity_at"] = commit.committed_at

    all_pull_requests = list(
        GithubPullRequestActivity.objects.filter(
            repository_id__in=repository_ids
        ).select_related("repository")
    )
    if restrict_to_viewer:
        all_pull_requests = [
            pull_request
            for pull_request in all_pull_requests
            if _normalize_github_login(pull_request.author_login) in visible_logins
        ]
    for pull_request in all_pull_requests:
        login = pull_request.author_login or "unknown"
        entry = leaderboard[login]
        entry["github_login"] = login
        entry["display_name"] = pull_request.author_name or login
        entry["pull_request_count"] += 1
        entry["merged_pull_request_count"] += 1 if pull_request.is_merged else 0
        if pull_request.quality_score is not None:
            entry["pull_request_score_total"] += float(pull_request.quality_score)
            entry["pull_request_score_count"] += 1
        reference_time = pull_request.merged_at or pull_request.opened_at
        if reference_time and (
            not entry["last_activity_at"] or reference_time > entry["last_activity_at"]
        ):
            entry["last_activity_at"] = reference_time

    finalized_leaderboard = []
    for entry in leaderboard.values():
        average_scan_score = round(
            entry["scan_score_total"] / entry["scan_score_count"],
            2,
        ) if entry["scan_score_count"] else None
        average_commit_score = round(
            entry["commit_score_total"] / entry["commit_score_count"],
            2,
        ) if entry["commit_score_count"] else None
        average_pull_request_score = round(
            entry["pull_request_score_total"] / entry["pull_request_score_count"],
            2,
        ) if entry["pull_request_score_count"] else None
        score_parts = [
            value
            for value in [
                average_scan_score,
                average_commit_score,
                average_pull_request_score,
            ]
            if value is not None
        ]
        composite_score = round(sum(score_parts) / len(score_parts), 2) if score_parts else 0
        finalized_leaderboard.append(
            {
                "github_login": entry["github_login"],
                "display_name": entry["display_name"],
                "repository_count": entry["repository_count"],
                "violation_count": entry["violation_count"],
                "files_touched": entry["files_touched"],
                "commit_count": entry["commit_count"],
                "pull_request_count": entry["pull_request_count"],
                "merged_pull_request_count": entry["merged_pull_request_count"],
                "average_scan_score": average_scan_score,
                "average_commit_score": average_commit_score,
                "average_pull_request_score": average_pull_request_score,
                "composite_score": composite_score,
                "last_activity_at": entry["last_activity_at"].isoformat()
                if entry["last_activity_at"]
                else None,
            }
        )

    finalized_leaderboard.sort(
        key=lambda item: (
            -float(item["composite_score"] or 0),
            item["violation_count"],
            item["github_login"],
        )
    )
    return {
        "leaderboard": finalized_leaderboard[:10],
        "recent_commits": sorted(
            all_commits,
            key=lambda item: item.committed_at or item.created_at,
            reverse=True,
        )[:10],
        "recent_pull_requests": sorted(
            all_pull_requests,
            key=lambda item: item.opened_at or item.last_synced_at,
            reverse=True,
        )[:10],
        "scope": "team" if not restrict_to_viewer else "self",
    }


def evaluate_source_bundle(*, standard_profile, source_files, repository_paths):
    active_rules = list(
        standard_profile.rules.filter(is_enabled=True).order_by("order", "id")
    )
    path_set = {path for path in repository_paths if path}
    normalized_source_files = [
        {
            "path": file_item.get("path") or "",
            "content": file_item.get("content") or "",
        }
        for file_item in source_files
        if file_item.get("path")
    ]
    violations = []

    for rule in active_rules:
        violations.extend(
            apply_rule(
                rule=rule,
                source_files=normalized_source_files,
                repository_paths=path_set,
            )
        )

    score = max(
        0,
        100
        - sum(
            _rule_penalty(violation["severity"], violation.get("weight"))
            for violation in violations
        ),
    )
    severity_counts = Counter(violation["severity"] for violation in violations)
    rule_counts = Counter(violation["code"] for violation in violations)
    summary = {
        "score": score,
        "file_count": len(normalized_source_files),
        "violation_count": len(violations),
        "severity_breakdown": dict(severity_counts),
        "rule_breakdown": dict(rule_counts),
    }
    return {
        "score": score,
        "summary": summary,
        "violations": violations,
        "file_count": len(normalized_source_files),
    }


def apply_rule(*, rule, source_files, repository_paths):
    if rule.code == "required_readme":
        return _check_required_paths(rule, repository_paths)
    if rule.code == "tests_required":
        return _check_tests_present(rule, repository_paths)
    if rule.code == "no_var_keyword":
        return _check_pattern_rule(rule, source_files)
    if rule.code == "python_snake_case_variables":
        return _check_python_snake_case(rule, source_files)
    if rule.code == "max_function_length":
        return _check_max_function_length(rule, source_files)
    if rule.config.get("required_paths"):
        return _check_required_paths(rule, repository_paths)
    if rule.config.get("patterns"):
        return _check_pattern_rule(rule, source_files)
    return []


def _check_required_paths(rule, repository_paths):
    violations = []
    for required_path in rule.config.get("required_paths") or []:
        if required_path in repository_paths:
            continue
        violations.append(
            _build_violation(
                rule=rule,
                title=rule.title,
                message=f"Required path '{required_path}' is missing.",
                file_path=required_path,
            )
        )
    return violations


def _check_tests_present(rule, repository_paths):
    prefixes = tuple(rule.config.get("test_path_prefixes") or [])
    suffixes = tuple(rule.config.get("test_file_suffixes") or [])
    has_tests = any(
        path.startswith(prefixes)
        or path.endswith(suffixes)
        or path.startswith("tests/")
        or path.startswith("__tests__/")
        or "/tests/" in path
        for path in repository_paths
    )
    if has_tests:
        return []
    return [
        _build_violation(
            rule=rule,
            title=rule.title,
            message="Repository does not expose a recognizable test directory or test file.",
        )
    ]


def _check_pattern_rule(rule, source_files):
    configured_patterns = rule.config.get("patterns") or []
    allowed_extensions = set(rule.config.get("extensions") or [])
    violations = []
    for file_item in source_files:
        file_path = file_item["path"]
        if allowed_extensions and _get_extension(file_path) not in allowed_extensions:
            continue
        for pattern_item in configured_patterns:
            if isinstance(pattern_item, str):
                pattern = pattern_item
                message = rule.description or rule.title
            else:
                pattern = pattern_item.get("pattern") or ""
                message = pattern_item.get("message") or rule.description or rule.title
            if not pattern:
                continue
            for match in re.finditer(pattern, file_item["content"], flags=re.MULTILINE):
                line_number = file_item["content"][: match.start()].count("\n") + 1
                violations.append(
                    _build_violation(
                        rule=rule,
                        title=rule.title,
                        message=message,
                        file_path=file_path,
                        line_number=line_number,
                    )
                )
    return violations


def _check_python_snake_case(rule, source_files):
    allowed_extensions = set(rule.config.get("extensions") or [".py"])
    violations = []
    assignment_pattern = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=")
    snake_case_pattern = re.compile(r"^[a-z_][a-z0-9_]*$")

    for file_item in source_files:
        file_path = file_item["path"]
        if _get_extension(file_path) not in allowed_extensions:
            continue
        for line_number, line in enumerate(file_item["content"].splitlines(), start=1):
            match = assignment_pattern.match(line)
            if not match:
                continue
            variable_name = match.group(1)
            if variable_name in {"self", "cls"} or variable_name.isupper():
                continue
            if snake_case_pattern.match(variable_name):
                continue
            violations.append(
                _build_violation(
                    rule=rule,
                    title=rule.title,
                    message=f"Python variable '{variable_name}' should use snake_case.",
                    file_path=file_path,
                    line_number=line_number,
                )
            )
    return violations


def _check_max_function_length(rule, source_files):
    allowed_extensions = set(
        rule.config.get("extensions") or [".py", ".js", ".jsx", ".ts", ".tsx"]
    )
    max_lines = int(rule.config.get("max_lines") or 20)
    violations = []

    for file_item in source_files:
        file_path = file_item["path"]
        extension = _get_extension(file_path)
        if extension not in allowed_extensions:
            continue
        if extension == ".py":
            functions = _python_function_ranges(file_item["content"])
        else:
            functions = _javascript_function_ranges(file_item["content"])

        for function_name, line_number, line_count in functions:
            if line_count <= max_lines:
                continue
            violations.append(
                _build_violation(
                    rule=rule,
                    title=rule.title,
                    message=(
                        f"Function '{function_name}' is {line_count} lines long; "
                        f"keep functions under {max_lines} lines."
                    ),
                    file_path=file_path,
                    line_number=line_number,
                )
            )
    return violations


def _persist_scan_results(
    *,
    scan,
    repository,
    evaluation,
    commit_activity,
    developer_activity,
    author_lookup,
    commit_sha,
):
    author_penalties = defaultdict(int)
    author_violations = defaultdict(int)
    author_files = defaultdict(set)

    for violation_data in evaluation["violations"]:
        author_info = {"login": "", "commit_sha": "", "display_name": ""}
        if violation_data.get("file_path"):
            author_info = author_lookup(violation_data["file_path"])

        CodeViolation.objects.create(
            scan=scan,
            repository=repository,
            rule=violation_data.get("rule"),
            severity=violation_data["severity"],
            code=violation_data["code"],
            title=violation_data["title"],
            file_path=violation_data.get("file_path") or "",
            line_number=violation_data.get("line_number"),
            message=violation_data["message"],
            author_login=author_info.get("login") or "",
            commit_sha=author_info.get("commit_sha") or "",
            metadata=violation_data.get("metadata") or {},
        )
        author_login = author_info.get("login") or "unknown"
        author_penalties[author_login] += _rule_penalty(
            violation_data["severity"],
            violation_data.get("weight"),
        )
        author_violations[author_login] += 1
        if violation_data.get("file_path"):
            author_files[author_login].add(violation_data["file_path"])

    combined_logins = set(commit_activity) | set(author_penalties)
    combined_logins |= set(developer_activity)
    for login in combined_logins:
        commit_summary = commit_activity.get(login) or {}
        activity_summary = developer_activity.get(login) or {}
        score_value = max(0, 100 - author_penalties.get(login, 0))

        average_commit_score = activity_summary.get("average_commit_score")
        average_pull_request_score = activity_summary.get("average_pull_request_score")

        if average_commit_score is None:
            average_commit_score = 100

        if average_pull_request_score is None:
            average_pull_request_score = 100

        score_value = round(
            (score_value * 0.65)
            + (average_commit_score * 0.2)
            + (average_pull_request_score * 0.15),
            2,
        )
        DeveloperRepositoryScore.objects.create(
            scan=scan,
            repository=repository,
            github_login=login,
            display_name=activity_summary.get("display_name")
            or commit_summary.get("display_name")
            or login,
            commit_count=activity_summary.get("commit_count")
            or commit_summary.get("commit_count")
            or 0,
            files_touched=len(author_files.get(login, set())),
            violation_count=author_violations.get(login, 0),
            score=Decimal(str(score_value)),
            summary={
                "penalty": author_penalties.get(login, 0),
                "pull_request_count": activity_summary.get("pull_request_count", 0),
                "merged_pull_request_count": activity_summary.get(
                    "merged_pull_request_count",
                    0,
                ),
                "average_commit_score": activity_summary.get("average_commit_score"),
                "average_pull_request_score": activity_summary.get(
                    "average_pull_request_score"
                ),
                "last_commit_at": activity_summary.get("last_commit_at"),
                "last_pull_request_at": activity_summary.get("last_pull_request_at"),
            },
        )

    scan.status = "completed"
    scan.commit_sha = commit_sha
    scan.score = Decimal(str(evaluation["score"]))
    scan.summary = evaluation["summary"]
    scan.file_count = evaluation["file_count"]
    scan.violation_count = len(evaluation["violations"])
    scan.developer_count = len(combined_logins)
    scan.completed_at = timezone.now()
    scan.save(
        update_fields=[
            "status",
            "commit_sha",
            "score",
            "summary",
            "file_count",
            "violation_count",
            "developer_count",
            "completed_at",
        ]
    )


def _build_violation(
    *,
    rule,
    title,
    message,
    file_path="",
    line_number=None,
    metadata=None,
):
    return {
        "rule": rule,
        "code": rule.code,
        "title": title,
        "severity": rule.severity,
        "weight": rule.weight,
        "message": message,
        "file_path": file_path,
        "line_number": line_number,
        "metadata": metadata or {},
    }


def _rule_instruction(rule):
    if rule.code == "required_readme":
        return "Keep a README.md at the project root."
    if rule.code == "tests_required":
        return "Add or update tests for behavioral changes."
    if rule.code == "no_var_keyword":
        return "Never use var; prefer let or const."
    if rule.code == "python_snake_case_variables":
        return "Use snake_case for Python variable names."
    if rule.code == "max_function_length":
        max_lines = int(rule.config.get("max_lines") or 20)
        return f"Keep functions at or below {max_lines} lines."
    return rule.description or rule.title


def _rule_penalty(severity, weight=None):
    if weight:
        return int(weight)
    return SEVERITY_PENALTIES.get(severity, 5)


def _split_message(message):
    normalized_message = (message or "").strip()
    if not normalized_message:
        return "", ""
    parts = normalized_message.split("\n", 1)
    if len(parts) == 1:
        return parts[0].strip(), ""
    return parts[0].strip(), parts[1].strip()


def _get_extension(file_path):
    if "." not in file_path:
        return ""
    return "." + file_path.rsplit(".", 1)[-1].lower()


def _parse_github_datetime(value):
    if not value:
        return None
    normalized_value = value.replace("Z", "+00:00")
    try:
        return timezone.datetime.fromisoformat(normalized_value)
    except ValueError:
        return None


def _python_function_ranges(content):
    lines = content.splitlines()
    ranges = []
    def_pattern = re.compile(r"^(\s*)def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(")
    for index, line in enumerate(lines):
        match = def_pattern.match(line)
        if not match:
            continue
        base_indent = len(match.group(1))
        function_name = match.group(2)
        end_index = len(lines)
        for next_index in range(index + 1, len(lines)):
            next_line = lines[next_index]
            stripped = next_line.strip()
            if not stripped:
                continue
            next_indent = len(next_line) - len(next_line.lstrip(" "))
            if next_indent <= base_indent and not next_line.lstrip().startswith("#"):
                end_index = next_index
                break
        ranges.append((function_name, index + 1, max(end_index - index, 1)))
    return ranges


def _javascript_function_ranges(content):
    lines = content.splitlines()
    ranges = []
    declaration_pattern = re.compile(
        r"^\s*(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("
    )
    assignment_pattern = re.compile(
        r"^\s*(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_][A-Za-z0-9_]*)\s*=>"
    )

    for index, line in enumerate(lines):
        match = declaration_pattern.match(line) or assignment_pattern.match(line)
        if not match:
            continue
        function_name = match.group(1)
        brace_balance = line.count("{") - line.count("}")
        end_index = index + 1
        while end_index < len(lines) and brace_balance > 0:
            brace_balance += lines[end_index].count("{") - lines[end_index].count("}")
            end_index += 1
        ranges.append((function_name, index + 1, max(end_index - index, 1)))
    return ranges
