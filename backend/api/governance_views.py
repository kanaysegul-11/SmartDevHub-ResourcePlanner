import json

from django.db import OperationalError
from django.db.models import Avg, Count, Q
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .governance_serializers import (
    AIRemediationApplySerializer,
    AIRemediationPrepareSerializer,
    AICodeRequestSerializer,
    AIPromptPrepareSerializer,
    AIValidateSerializer,
    GithubAccountConnectSerializer,
    GithubOAuthConnectSerializer,
    GithubAccountSerializer,
    GithubCommitActivitySerializer,
    GithubPullRequestActivitySerializer,
    GithubRepositorySerializer,
    RepositoryScanSerializer,
    StandardProfileSerializer,
    StandardRuleSerializer,
)
from .governance_services import (
    build_developer_governance_overview,
    build_github_integration_status,
    build_github_oauth_authorize_url,
    connect_github_account,
    connect_github_account_from_oauth_code,
    ensure_default_standard_profile,
    finalize_stale_governance_runs,
    get_user_github_logins,
    is_governance_admin,
    apply_safe_repository_remediation,
    DISABLED_GOVERNANCE_RULE_CODES,
    prepare_ai_remediation_bundle,
    prepare_ai_prompt_bundle,
    process_github_webhook_event,
    queue_due_polling_refreshes,
    remove_standard_rule_and_refresh_scores,
    scan_github_repository,
    serialize_evaluation,
    sync_repository_activity,
    sync_github_repositories,
    refresh_github_repository_index,
    restore_core_standard_rule_library,
    queue_governance_login_sync,
    validate_ai_output,
    verify_github_webhook_signature,
)
from .models import (
    AICodeRequest,
    GithubAccount,
    GithubCommitActivity,
    GithubPullRequestActivity,
    GithubRepository,
    RepositoryScan,
    StandardProfile,
    StandardRule,
)


def _login_query(field_name, logins):
    query = Q()
    for login in logins:
        query |= Q(**{f"{field_name}__iexact": login})
    return query


class GovernanceAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


class StandardProfileViewSet(viewsets.ModelViewSet):
    queryset = StandardProfile.objects.prefetch_related("rules").select_related(
        "created_by"
    )
    serializer_class = StandardProfileSerializer
    permission_classes = [GovernanceAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["target_stack", "is_default", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "updated_at", "created_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="create-starter-profile")
    def create_starter_profile(self, request):
        profile = restore_core_standard_rule_library(created_by=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StandardRuleViewSet(viewsets.ModelViewSet):
    queryset = StandardRule.objects.select_related("profile").exclude(
        code__in=DISABLED_GOVERNANCE_RULE_CODES
    )
    serializer_class = StandardRuleSerializer
    permission_classes = [GovernanceAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["profile", "category", "severity", "is_enabled"]
    search_fields = ["code", "title", "description"]
    ordering_fields = ["order", "title", "created_at"]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        summary = remove_standard_rule_and_refresh_scores(rule=instance)
        return Response(
            {
                "status": "deleted",
                "detail": "Rule deleted and affected repository scores refreshed.",
                **summary,
            },
            status=status.HTTP_200_OK,
        )


class GithubAccountViewSet(viewsets.ModelViewSet):
    serializer_class = GithubAccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        queryset = GithubAccount.objects.select_related("user")
        if (
            is_governance_admin(self.request.user)
            and (
                self.request.query_params.get("scope") == "team"
                or getattr(self, "action", "") in {"sync_repositories", "sync_all_repositories"}
            )
        ):
            return queryset
        return queryset.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        connect_serializer = GithubAccountConnectSerializer(data=request.data)
        connect_serializer.is_valid(raise_exception=True)
        token = connect_serializer.validated_data["access_token"]
        existing_usernames = set(
            self.get_queryset().values_list("github_username", flat=True)
        )
        account = connect_github_account(user=request.user, access_token=token)
        serializer = self.get_serializer(account)
        response_status = (
            status.HTTP_200_OK
            if account.github_username in existing_usernames
            else status.HTTP_201_CREATED
        )
        return Response(serializer.data, status=response_status)

    @action(detail=False, methods=["get"], url_path="integration-status")
    def integration_status(self, request):
        return Response(build_github_integration_status(), status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="oauth-authorize")
    def oauth_authorize(self, request):
        try:
            payload = build_github_oauth_authorize_url(user=request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="oauth-connect")
    def oauth_connect(self, request):
        serializer = GithubOAuthConnectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        existing_usernames = set(
            self.get_queryset().values_list("github_username", flat=True)
        )
        try:
            account = connect_github_account_from_oauth_code(
                user=request.user,
                code=serializer.validated_data["code"],
                state=serializer.validated_data["state"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_status = (
            status.HTTP_200_OK
            if account.github_username in existing_usernames
            else status.HTTP_201_CREATED
        )
        return Response(
            self.get_serializer(account).data,
            status=response_status,
        )

    @action(detail=True, methods=["post"], url_path="sync-repositories")
    def sync_repositories(self, request, pk=None):
        account = self.get_object()
        synced_count = sync_github_repositories(account=account)
        serializer = self.get_serializer(account)
        return Response(
            {
                "account": serializer.data,
                "synced_repository_count": synced_count,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="sync-all-repositories")
    def sync_all_repositories(self, request):
        account_queryset = self.get_queryset().filter(is_active=True)
        account_summaries = []

        try:
            for account in account_queryset:
                synced_count = refresh_github_repository_index(account=account)
                account_summaries.append(
                    {
                        "account_id": account.id,
                        "github_username": account.github_username,
                        "synced_repository_count": synced_count,
                    }
                )
        except OperationalError as exc:
            return Response(
                {
                    "status": "busy",
                    "detail": "Repository sync is temporarily waiting for the database lock to clear.",
                    "error": str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "status": "completed",
                "account_count": len(account_summaries),
                "accounts": account_summaries,
            },
            status=status.HTTP_200_OK,
        )


class GithubWebhookReceiveView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        signature_header = request.headers.get("X-Hub-Signature-256", "")
        event_name = request.headers.get("X-GitHub-Event", "")
        raw_body = request.body or b"{}"

        try:
            verify_github_webhook_signature(
                raw_body=raw_body,
                signature_header=signature_header,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            payload = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return Response(
                {"detail": "Invalid GitHub webhook payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if event_name == "ping":
            return Response(
                {
                    "status": "ok",
                    "detail": "GitHub webhook handshake received.",
                },
                status=status.HTTP_200_OK,
            )

        result = process_github_webhook_event(
            event_name=event_name,
            payload=payload,
        )
        response_status = (
            status.HTTP_202_ACCEPTED
            if result.get("status") == "accepted"
            else status.HTTP_200_OK
        )
        return Response(result, status=response_status)


class GithubRepositoryViewSet(viewsets.ModelViewSet):
    serializer_class = GithubRepositorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "post", "head", "options"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["account", "standard_profile", "is_active", "visibility"]
    search_fields = ["name", "full_name", "owner_login", "description"]
    ordering_fields = ["name", "latest_scan_at", "latest_score", "last_pushed_at"]

    def get_queryset(self):
        finalize_stale_governance_runs()
        queryset = GithubRepository.objects.select_related(
            "account",
            "standard_profile",
        )
        visible_queryset = queryset
        if is_governance_admin(self.request.user):
            repository_list = list(visible_queryset.filter(is_active=True)[:25])
            queue_due_polling_refreshes(repositories=repository_list)
            return visible_queryset
        visible_queryset = queryset.filter(account__user=self.request.user)
        repository_list = list(visible_queryset.filter(is_active=True)[:25])
        queue_due_polling_refreshes(repositories=repository_list)
        return visible_queryset

    @action(detail=True, methods=["post"], url_path="scan")
    def scan(self, request, pk=None):
        repository = self.get_object()
        scan = scan_github_repository(repository=repository, triggered_by=request.user)
        serializer = RepositoryScanSerializer(scan, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="sync-activity")
    def sync_activity(self, request, pk=None):
        repository = self.get_object()
        activity_summary = sync_repository_activity(repository=repository)
        return Response(
            {
                "repository": repository.full_name,
                "developer_activity": activity_summary,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        scanned_repository_count = queryset.exclude(latest_scan_at__isnull=True).count()
        aggregate = queryset.aggregate(
            total_repositories=Count("id"),
            average_score=Avg("latest_score"),
        )
        latest_scans = RepositoryScan.objects.filter(
            repository__in=queryset
        ).order_by("-created_at")[:5]
        scan_serializer = RepositoryScanSerializer(
            latest_scans,
            many=True,
            context={"request": request},
        )
        return Response(
            {
                "total_repositories": aggregate.get("total_repositories") or 0,
                "scanned_repositories": scanned_repository_count,
                "average_score": aggregate.get("average_score"),
                "latest_scans": scan_serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="developer-overview")
    def developer_overview(self, request):
        repositories = list(self.filter_queryset(self.get_queryset()))
        overview = build_developer_governance_overview(
            repositories,
            viewer=request.user,
        )
        recent_commit_serializer = GithubCommitActivitySerializer(
            overview["recent_commits"],
            many=True,
            context={"request": request},
        )
        recent_pull_request_serializer = GithubPullRequestActivitySerializer(
            overview["recent_pull_requests"],
            many=True,
            context={"request": request},
        )
        return Response(
            {
                "scope": overview.get("scope") or "team",
                "leaderboard": overview["leaderboard"],
                "recent_commits": recent_commit_serializer.data,
                "recent_pull_requests": recent_pull_request_serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="team-scoreboard")
    def team_scoreboard(self, request):
        repositories = list(
            GithubRepository.objects.select_related("account", "account__user")
            .filter(is_active=True)
            .order_by("full_name")
        )
        scoreboard = {}

        for repository in repositories:
            login = (repository.account.github_username or repository.owner_login or "").strip()
            if not login:
                continue
            key = login.lower()
            user = repository.account.user
            entry = scoreboard.setdefault(
                key,
                {
                    "github_login": login,
                    "display_name": user.get_full_name() or user.username,
                    "username": user.username,
                    "user_full_name": user.get_full_name() or user.username,
                    "repository_count": 0,
                    "repository_scores": [],
                },
            )
            entry["repository_count"] += 1
            score = repository.latest_score
            if score is not None:
                entry["repository_scores"].append(float(score))

        leaderboard = []
        for entry in scoreboard.values():
            scores = entry.pop("repository_scores", [])
            average_scan_score = round(sum(scores) / len(scores), 2) if scores else 0
            leaderboard.append(
                {
                    **entry,
                    "average_scan_score": average_scan_score,
                    "composite_score": average_scan_score,
                }
            )

        leaderboard.sort(
            key=lambda item: (
                -float(item.get("average_scan_score") or 0),
                item.get("github_login") or "",
            )
        )

        return Response(
            {
                "scope": "team",
                "leaderboard": leaderboard,
            },
            status=status.HTTP_200_OK,
        )


class RepositoryScanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RepositoryScanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["repository", "scan_type", "status", "standard_profile"]
    ordering_fields = ["created_at", "score", "completed_at"]

    def get_queryset(self):
        finalize_stale_governance_runs()
        queryset = RepositoryScan.objects.select_related(
            "repository",
            "standard_profile",
            "triggered_by",
        ).prefetch_related("violations", "developer_scores")
        if is_governance_admin(self.request.user):
            return queryset
        return queryset.filter(repository__account__user=self.request.user)

    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        aggregate = queryset.aggregate(
            total_scans=Count("id"),
            average_score=Avg("score"),
        )
        recent_scans = queryset[:5]
        return Response(
            {
                "total_scans": aggregate.get("total_scans") or 0,
                "average_score": aggregate.get("average_score"),
                "recent_scans": self.get_serializer(recent_scans, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class GithubCommitActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GithubCommitActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["repository", "scan", "author_login", "is_merge_commit"]
    ordering_fields = ["committed_at", "quality_score", "created_at"]

    def get_queryset(self):
        queryset = GithubCommitActivity.objects.select_related("repository", "scan")
        if is_governance_admin(self.request.user):
            return queryset
        return queryset.filter(repository__account__user=self.request.user)


class GithubPullRequestActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GithubPullRequestActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["repository", "author_login", "state", "is_draft", "is_merged"]
    ordering_fields = ["opened_at", "merged_at", "quality_score", "last_synced_at"]

    def get_queryset(self):
        queryset = GithubPullRequestActivity.objects.select_related("repository")
        if is_governance_admin(self.request.user):
            return queryset
        return queryset.filter(repository__account__user=self.request.user)


class AICodeRequestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AICodeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["repository", "standard_profile", "provider_name", "validation_status"]
    ordering_fields = ["created_at", "updated_at", "validation_score"]

    def get_queryset(self):
        queryset = AICodeRequest.objects.select_related(
            "repository",
            "standard_profile",
            "requested_by",
        ).prefetch_related("validation_results")
        if self.request.user.is_staff or self.request.user.is_superuser:
            return queryset
        return queryset.filter(requested_by=self.request.user)

    def _get_accessible_repository(self, repository_id):
        if not repository_id:
            return None
        queryset = GithubRepository.objects.all()
        if not is_governance_admin(self.request.user):
            queryset = queryset.filter(account__user=self.request.user)
        return queryset.filter(id=repository_id).first()

    def _can_use_ai_for_repository(self, repository):
        return bool(repository and repository.account.user_id == self.request.user.id)

    def _repository_ai_forbidden_response(self):
        return Response(
            {
                "detail": (
                    "AI remediation can only be used for repositories connected "
                    "to your own GitHub account."
                )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    def _get_accessible_profile(self, profile_id):
        if not profile_id:
            return None
        queryset = StandardProfile.objects.all()
        if not is_governance_admin(self.request.user):
            queryset = queryset.filter(is_active=True)
        return queryset.filter(id=profile_id).first()

    @action(detail=False, methods=["post"], url_path="prepare")
    def prepare(self, request):
        serializer = AIPromptPrepareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        repository = self._get_accessible_repository(
            serializer.validated_data.get("repository_id")
        )
        if repository and not self._can_use_ai_for_repository(repository):
            return self._repository_ai_forbidden_response()
        standard_profile = self._get_accessible_profile(
            serializer.validated_data.get("standard_profile_id")
        )

        bundle = prepare_ai_prompt_bundle(
            repository=repository,
            standard_profile=standard_profile,
            task_summary=serializer.validated_data.get("task_summary") or "",
        )
        return Response(bundle, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="validate")
    def validate(self, request):
        serializer = AIValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        repository = self._get_accessible_repository(
            serializer.validated_data.get("repository_id")
        )
        if repository and not self._can_use_ai_for_repository(repository):
            return self._repository_ai_forbidden_response()
        standard_profile = self._get_accessible_profile(
            serializer.validated_data.get("standard_profile_id")
        )

        ai_request, validation_result, evaluation, prepared_bundle = validate_ai_output(
            requested_by=request.user,
            repository=repository,
            standard_profile=standard_profile,
            provider_name=serializer.validated_data.get("provider_name") or "",
            model_name=serializer.validated_data.get("model_name") or "",
            task_summary=serializer.validated_data.get("task_summary") or "",
            prompt=serializer.validated_data.get("prompt") or "",
            output_files=serializer.validated_data["output_files"],
        )
        request_serializer = self.get_serializer(ai_request)
        return Response(
            {
                "request": request_serializer.data,
                "validation_result": {
                    "id": validation_result.id,
                    "status": validation_result.status,
                    "score": validation_result.score,
                    "violation_count": validation_result.violation_count,
                    "summary": validation_result.summary,
                },
                "evaluation": serialize_evaluation(evaluation),
                "prepared_bundle": prepared_bundle,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="prepare-remediation")
    def prepare_remediation(self, request):
        serializer = AIRemediationPrepareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        repository = self._get_accessible_repository(
            serializer.validated_data.get("repository_id")
        )
        if not repository:
            return Response(
                {"detail": "Repository could not be found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self._can_use_ai_for_repository(repository):
            return self._repository_ai_forbidden_response()

        scan = None
        scan_id = serializer.validated_data.get("scan_id")
        if scan_id:
            scan_queryset = repository.scans.all()
            if not is_governance_admin(self.request.user):
                scan_queryset = scan_queryset.filter(repository__account__user=self.request.user)
            scan = scan_queryset.filter(id=scan_id).first()
            if not scan:
                return Response(
                    {"detail": "Scan could not be found for remediation."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        try:
            bundle = prepare_ai_remediation_bundle(
                repository=repository,
                scan=scan,
                violation_ids=serializer.validated_data.get("violation_ids") or [],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(bundle, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="apply-remediation")
    def apply_remediation(self, request):
        serializer = AIRemediationApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        repository = self._get_accessible_repository(
            serializer.validated_data.get("repository_id")
        )
        if not repository:
            return Response(
                {"detail": "Repository could not be found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self._can_use_ai_for_repository(repository):
            return self._repository_ai_forbidden_response()

        scan = None
        scan_id = serializer.validated_data.get("scan_id")
        if scan_id:
            scan_queryset = repository.scans.all()
            if not is_governance_admin(self.request.user):
                scan_queryset = scan_queryset.filter(repository__account__user=self.request.user)
            scan = scan_queryset.filter(id=scan_id).first()
            if not scan:
                return Response(
                    {"detail": "Scan could not be found for remediation."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        try:
            result = apply_safe_repository_remediation(
                repository=repository,
                scan=scan,
                violation_ids=serializer.validated_data.get("violation_ids") or [],
                branch_name=serializer.validated_data.get("branch_name") or "",
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_201_CREATED)
