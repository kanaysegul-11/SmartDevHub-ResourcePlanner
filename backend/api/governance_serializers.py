from rest_framework import serializers

from .governance_services import (
    DISABLED_GOVERNANCE_RULE_CODES,
    get_user_github_logins,
    is_governance_admin,
)
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
from .serializers import UserSerializer


class GovernanceVisibilityMixin:
    def _request_user(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def _restrict_to_viewer(self):
        user = self._request_user()
        return bool(
            user
            and getattr(user, "is_authenticated", False)
            and not is_governance_admin(user)
        )

    def _visible_logins(self):
        if not hasattr(self, "_cached_visible_logins"):
            self._cached_visible_logins = get_user_github_logins(self._request_user())
        return self._cached_visible_logins

    def _normalize_login(self, value):
        return (value or "").strip().lower()


class StandardRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StandardRule
        fields = [
            "id",
            "profile",
            "code",
            "title",
            "description",
            "category",
            "severity",
            "weight",
            "is_enabled",
            "config",
            "order",
            "created_at",
            "updated_at",
        ]


class StandardProfileSerializer(serializers.ModelSerializer):
    rules = serializers.SerializerMethodField()
    created_by_details = UserSerializer(source="created_by", read_only=True)
    active_rule_count = serializers.SerializerMethodField()

    class Meta:
        model = StandardProfile
        fields = [
            "id",
            "name",
            "description",
            "target_stack",
            "is_default",
            "is_active",
            "rule_manifest",
            "ai_manifest",
            "created_by",
            "created_by_details",
            "active_rule_count",
            "rules",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_active_rule_count(self, obj):
        return (
            obj.rules.filter(is_enabled=True)
            .exclude(code__in=DISABLED_GOVERNANCE_RULE_CODES)
            .count()
        )

    def get_rules(self, obj):
        rules = (
            obj.rules.all()
            .exclude(code__in=DISABLED_GOVERNANCE_RULE_CODES)
            .order_by("order", "id")
        )
        return StandardRuleSerializer(
            rules,
            many=True,
            context=self.context,
        ).data


class GithubAccountSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    masked_token = serializers.CharField(read_only=True)
    access_token = serializers.CharField(write_only=True)
    repository_count = serializers.SerializerMethodField()

    class Meta:
        model = GithubAccount
        fields = [
            "id",
            "user",
            "user_details",
            "github_user_id",
            "github_username",
            "account_type",
            "access_token",
            "masked_token",
            "avatar_url",
            "profile_url",
            "metadata",
            "repository_count",
            "connected_at",
            "last_synced_at",
            "is_active",
        ]
        read_only_fields = [
            "user",
            "github_user_id",
            "github_username",
            "account_type",
            "avatar_url",
            "profile_url",
            "metadata",
            "connected_at",
            "last_synced_at",
        ]

    def get_repository_count(self, obj):
        return obj.repositories.filter(is_active=True).count()


class GithubRepositorySerializer(serializers.ModelSerializer):
    account_username = serializers.CharField(source="account.github_username", read_only=True)
    account_user = serializers.IntegerField(source="account.user_id", read_only=True)
    account_user_details = UserSerializer(source="account.user", read_only=True)
    standard_profile_details = StandardProfileSerializer(
        source="standard_profile",
        read_only=True,
    )

    class Meta:
        model = GithubRepository
        fields = [
            "id",
            "account",
            "account_username",
            "account_user",
            "account_user_details",
            "standard_profile",
            "standard_profile_details",
            "external_id",
            "name",
            "full_name",
            "owner_login",
            "default_branch",
            "primary_language",
            "repository_url",
            "description",
            "homepage_url",
            "visibility",
            "is_private",
            "is_fork",
            "is_organization_repo",
            "metadata",
            "latest_score",
            "latest_scan_at",
            "last_pushed_at",
            "last_synced_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "account",
            "external_id",
            "name",
            "full_name",
            "owner_login",
            "default_branch",
            "primary_language",
            "repository_url",
            "description",
            "homepage_url",
            "visibility",
            "is_private",
            "is_fork",
            "is_organization_repo",
            "metadata",
            "latest_score",
            "latest_scan_at",
            "last_pushed_at",
            "last_synced_at",
            "created_at",
            "updated_at",
        ]


class CodeViolationSerializer(serializers.ModelSerializer):
    rule_title = serializers.CharField(source="rule.title", read_only=True)

    class Meta:
        model = CodeViolation
        fields = [
            "id",
            "scan",
            "repository",
            "rule",
            "rule_title",
            "severity",
            "code",
            "title",
            "file_path",
            "line_number",
            "message",
            "author_login",
            "commit_sha",
            "metadata",
            "created_at",
        ]


class DeveloperRepositoryScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperRepositoryScore
        fields = [
            "id",
            "scan",
            "repository",
            "github_login",
            "display_name",
            "commit_count",
            "files_touched",
            "violation_count",
            "score",
            "summary",
            "created_at",
        ]


class GithubCommitActivitySerializer(serializers.ModelSerializer):
    repository_name = serializers.CharField(source="repository.full_name", read_only=True)

    class Meta:
        model = GithubCommitActivity
        fields = [
            "id",
            "repository",
            "repository_name",
            "scan",
            "sha",
            "author_login",
            "author_name",
            "message_title",
            "message_body",
            "quality_score",
            "quality_flags",
            "additions",
            "deletions",
            "changed_files_count",
            "commit_url",
            "committed_at",
            "is_merge_commit",
            "metadata",
            "last_synced_at",
            "created_at",
        ]


class GithubPullRequestActivitySerializer(serializers.ModelSerializer):
    repository_name = serializers.CharField(source="repository.full_name", read_only=True)

    class Meta:
        model = GithubPullRequestActivity
        fields = [
            "id",
            "repository",
            "repository_name",
            "author_login",
            "author_name",
            "pull_number",
            "title",
            "body",
            "state",
            "is_draft",
            "is_merged",
            "quality_score",
            "quality_flags",
            "additions",
            "deletions",
            "changed_files_count",
            "comments_count",
            "review_comments_count",
            "commit_count",
            "html_url",
            "opened_at",
            "closed_at",
            "merged_at",
            "metadata",
            "last_synced_at",
            "created_at",
        ]


class RepositoryScanSerializer(GovernanceVisibilityMixin, serializers.ModelSerializer):
    repository_name = serializers.CharField(source="repository.full_name", read_only=True)
    standard_profile_name = serializers.CharField(
        source="standard_profile.name",
        read_only=True,
    )
    triggered_by_details = UserSerializer(source="triggered_by", read_only=True)
    violation_count = serializers.SerializerMethodField()
    developer_count = serializers.SerializerMethodField()
    violations = serializers.SerializerMethodField()
    developer_scores = serializers.SerializerMethodField()

    class Meta:
        model = RepositoryScan
        fields = [
            "id",
            "repository",
            "repository_name",
            "standard_profile",
            "standard_profile_name",
            "triggered_by",
            "triggered_by_details",
            "scan_type",
            "status",
            "branch_name",
            "commit_sha",
            "score",
            "summary",
            "file_count",
            "violation_count",
            "developer_count",
            "started_at",
            "completed_at",
            "created_at",
            "violations",
            "developer_scores",
        ]

    def get_violations(self, obj):
        violations = [
            violation
            for violation in obj.violations.all()
            if violation.code not in DISABLED_GOVERNANCE_RULE_CODES
        ]
        return CodeViolationSerializer(
            violations,
            many=True,
            context=self.context,
        ).data

    def get_violation_count(self, obj):
        return sum(
            1
            for violation in obj.violations.all()
            if violation.code not in DISABLED_GOVERNANCE_RULE_CODES
        )

    def get_developer_scores(self, obj):
        developer_scores = list(obj.developer_scores.all())
        if self._restrict_to_viewer():
            visible_logins = self._visible_logins()
            developer_scores = [
                developer_score
                for developer_score in developer_scores
                if self._normalize_login(developer_score.github_login) in visible_logins
            ]
        return DeveloperRepositoryScoreSerializer(
            developer_scores,
            many=True,
            context=self.context,
        ).data

    def get_developer_count(self, obj):
        if not self._restrict_to_viewer():
            return obj.developer_count
        visible_logins = self._visible_logins()
        return sum(
            1
            for developer_score in obj.developer_scores.all()
            if self._normalize_login(developer_score.github_login) in visible_logins
        )


class AICodeValidationResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AICodeValidationResult
        fields = [
            "id",
            "request",
            "status",
            "score",
            "violation_count",
            "summary",
            "created_at",
        ]


class AICodeRequestSerializer(serializers.ModelSerializer):
    repository_name = serializers.CharField(source="repository.full_name", read_only=True)
    standard_profile_name = serializers.CharField(
        source="standard_profile.name",
        read_only=True,
    )
    requested_by_details = UserSerializer(source="requested_by", read_only=True)
    validation_results = AICodeValidationResultSerializer(many=True, read_only=True)

    class Meta:
        model = AICodeRequest
        fields = [
            "id",
            "repository",
            "repository_name",
            "standard_profile",
            "standard_profile_name",
            "requested_by",
            "requested_by_details",
            "provider_name",
            "model_name",
            "task_summary",
            "prompt",
            "prepared_prompt",
            "output_payload",
            "validation_status",
            "validation_score",
            "validation_summary",
            "created_at",
            "updated_at",
            "validation_results",
        ]
        read_only_fields = ["requested_by", "prepared_prompt", "validation_results"]


class GithubAccountConnectSerializer(serializers.Serializer):
    access_token = serializers.CharField()


class GithubOAuthConnectSerializer(serializers.Serializer):
    code = serializers.CharField()
    state = serializers.CharField()


class AIPromptPrepareSerializer(serializers.Serializer):
    repository_id = serializers.IntegerField(required=False)
    standard_profile_id = serializers.IntegerField(required=False)
    task_summary = serializers.CharField(required=False, allow_blank=True)


class AIValidateSerializer(serializers.Serializer):
    repository_id = serializers.IntegerField(required=False)
    standard_profile_id = serializers.IntegerField(required=False)
    provider_name = serializers.CharField(required=False, allow_blank=True)
    model_name = serializers.CharField(required=False, allow_blank=True)
    task_summary = serializers.CharField(required=False, allow_blank=True)
    prompt = serializers.CharField(required=False, allow_blank=True)
    output_files = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
    )


class AIRemediationPrepareSerializer(serializers.Serializer):
    repository_id = serializers.IntegerField()
    scan_id = serializers.IntegerField(required=False)
    violation_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )


class AIRemediationApplySerializer(AIRemediationPrepareSerializer):
    branch_name = serializers.CharField(required=False, allow_blank=True)
