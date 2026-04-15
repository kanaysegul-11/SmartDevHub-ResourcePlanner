from django.db.models import Avg, Count, Q
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .governance_serializers import (
    AICodeRequestSerializer,
    AIPromptPrepareSerializer,
    AIValidateSerializer,
    GithubAccountConnectSerializer,
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
    connect_github_account,
    ensure_default_standard_profile,
    get_user_github_logins,
    is_governance_admin,
    prepare_ai_prompt_bundle,
    scan_github_repository,
    serialize_evaluation,
    sync_repository_activity,
    sync_github_repositories,
    validate_ai_output,
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
        profile = ensure_default_standard_profile(created_by=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StandardRuleViewSet(viewsets.ModelViewSet):
    queryset = StandardRule.objects.select_related("profile")
    serializer_class = StandardRuleSerializer
    permission_classes = [GovernanceAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["profile", "category", "severity", "is_enabled"]
    search_fields = ["code", "title", "description"]
    ordering_fields = ["order", "title", "created_at"]


class GithubAccountViewSet(viewsets.ModelViewSet):
    serializer_class = GithubAccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        queryset = GithubAccount.objects.select_related("user")
        if is_governance_admin(self.request.user):
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


class GithubRepositoryViewSet(viewsets.ModelViewSet):
    serializer_class = GithubRepositorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "post", "head", "options"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["account", "standard_profile", "is_active", "visibility"]
    search_fields = ["name", "full_name", "owner_login", "description"]
    ordering_fields = ["name", "latest_scan_at", "latest_score", "last_pushed_at"]

    def get_queryset(self):
        queryset = GithubRepository.objects.select_related(
            "account",
            "standard_profile",
        )
        if is_governance_admin(self.request.user):
            return queryset
        return queryset.filter(account__user=self.request.user)

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


class RepositoryScanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RepositoryScanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["repository", "scan_type", "status", "standard_profile"]
    ordering_fields = ["created_at", "score", "completed_at"]

    def get_queryset(self):
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
        visible_logins = get_user_github_logins(self.request.user)
        if not visible_logins:
            return queryset.none()
        return queryset.filter(repository__account__user=self.request.user).filter(
            _login_query("author_login", visible_logins)
        )


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
        visible_logins = get_user_github_logins(self.request.user)
        if not visible_logins:
            return queryset.none()
        return queryset.filter(repository__account__user=self.request.user).filter(
            _login_query("author_login", visible_logins)
        )


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
