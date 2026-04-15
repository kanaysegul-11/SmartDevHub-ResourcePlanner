from datetime import timedelta
from decimal import Decimal

from rest_framework import viewsets, filters, status
from django.db.models import Count, Q
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, action
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Snippet,
    Comment,
    EmploymentStatus,
    PageConfig,
    TeamMessage,
    Project,
    UserProfile,
    Task,
    UserNotification,
    SoftwareAsset,
    SoftwareAssetAuditLog,
    SoftwareAssetSyncLog,
    LicenseRequest,
)
from .serializers import (
    SnippetSerializer,
    CommentSerializer,
    StatusSerializer,
    PageConfigSerializer,
    TeamMessageSerializer,
    ProjectSerializer,
    TaskSerializer,
    UserSerializer,
    UserNotificationSerializer,
    SoftwareAssetSerializer,
    SoftwareAssetAuditLogSerializer,
    SoftwareAssetSyncLogSerializer,
    LicenseRequestSerializer,
)
from rest_framework.decorators import api_view, permission_classes
from django.conf import settings
from django.db import OperationalError, transaction
from django.utils import timezone
from urllib import request as urllib_request
from urllib.parse import urlencode
from .runtime_i18n import format_team_member_count, runtime_text
from .software_asset_live_csv import export_live_license_csvs_for_users
from .text_utils import normalize_legacy_turkish_text
from .governance_services import queue_governance_login_sync
import json

SUPPORTED_LANGUAGES = {"en", "tr", "de", "fr", "es", "ar"}


def normalize_identity(value):
    return " ".join((value or "").strip().lower().split())


def resolve_status_user(status):
    if not status:
        return None
    if status.user_id:
        return status.user

    employee_name = normalize_identity(status.employee_name)
    if not employee_name:
        return None

    for user in User.objects.all():
        if normalize_identity(user.username) == employee_name:
            return user

        full_name = normalize_identity(f"{user.first_name} {user.last_name}")
        if full_name and full_name == employee_name:
            return user

    return None


def resolve_status_for_user(user):
    if not user:
        return None

    direct_status = EmploymentStatus.objects.select_related("user").filter(user=user).first()
    if direct_status:
        return direct_status

    username_key = normalize_identity(user.username)
    full_name_key = normalize_identity(f"{user.first_name} {user.last_name}")

    for status in EmploymentStatus.objects.select_related("user").all():
        employee_name = normalize_identity(status.employee_name)
        if employee_name and employee_name in {username_key, full_name_key}:
            return status

    return None

class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


class IsAuthorOrAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True
        if request.method in SAFE_METHODS:
            return True
        return getattr(obj, "author_id", None) == request.user.id


class TaskPermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.method == "POST" or request.method == "DELETE":
            return bool(request.user.is_staff or request.user.is_superuser)
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True
        if request.method in SAFE_METHODS:
            return obj.assignee_id == request.user.id
        return obj.assignee_id == request.user.id


class SoftwareAssetPermission(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return True

        return bool(request.user.is_staff or request.user.is_superuser)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True

        if request.method in SAFE_METHODS:
            return obj.assignments.filter(user=request.user, is_active=True).exists()

        return False


class LicenseRequestPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if is_admin_user(request.user):
            return True

        if request.method in SAFE_METHODS:
            return obj.requester_id == request.user.id

        return False


def create_notification(*, recipient, actor=None, notification_type="system", title="", body="", link=""):
    if not recipient:
        return

    UserNotification.objects.create(
        recipient=recipient,
        actor=actor,
        type=notification_type,
        title=normalize_legacy_turkish_text(title)[:200],
        body=normalize_legacy_turkish_text(body),
        link=link,
    )


def is_admin_user(user):
    return bool(user and (user.is_staff or user.is_superuser))


def get_asset_monthly_cost(asset):
    if asset.purchase_price in (None, ""):
        return 0.0

    seat_count = max(int(getattr(asset, "seats_total", 1) or 1), 1)
    price = float(asset.purchase_price)
    if asset.billing_cycle == "yearly":
        return round((price * seat_count) / 12, 2)
    if asset.billing_cycle == "quarterly":
        return round((price * seat_count) / 3, 2)
    if asset.billing_cycle == "one_time":
        return 0.0
    return round(price * seat_count, 2)


def get_asset_annual_cost(asset):
    if asset.purchase_price in (None, ""):
        return 0.0

    seat_count = max(int(getattr(asset, "seats_total", 1) or 1), 1)
    price = float(asset.purchase_price)
    if asset.billing_cycle == "monthly":
        return round(price * seat_count * 12, 2)
    if asset.billing_cycle == "quarterly":
        return round(price * seat_count * 4, 2)
    return round(price * seat_count, 2)


def get_asset_lifecycle_status(asset):
    if asset.operational_status == "archived":
        return "archived"
    if asset.operational_status == "inactive":
        return "inactive"
    if asset.renewal_date and asset.renewal_date < timezone.localdate():
        return "expired"
    if asset.renewal_date and asset.renewal_date <= timezone.localdate() + timedelta(days=7):
        return "expiring_soon"
    return "active"


def get_asset_renewal_window(asset):
    if not asset.renewal_date:
        return "none"
    if asset.renewal_date < timezone.localdate():
        return "expired"
    if asset.renewal_date <= timezone.localdate() + timedelta(days=7):
        return "7_days"
    return "future"


def get_asset_visible_assignments(asset, *, user=None):
    assignments = asset.assignments.select_related("user").filter(is_active=True)
    if user and not is_admin_user(user):
        assignments = assignments.filter(user=user)
    return assignments


def log_software_asset_event(*, asset=None, actor=None, event_type, message, payload=None):
    return SoftwareAssetAuditLog.objects.create(
        asset=asset,
        actor=actor,
        event_type=event_type,
        message=message,
        payload=payload or {},
    )


def log_software_asset_sync(
    *,
    asset=None,
    actor=None,
    provider_code="manual",
    status_value="pending",
    message="",
    payload=None,
):
    return SoftwareAssetSyncLog.objects.create(
        asset=asset,
        provider_code=provider_code or "manual",
        status=status_value,
        triggered_by=actor,
        message=message,
        payload=payload or {},
    )


def sync_asset_assignments(asset, *, user_ids):
    desired_ids = {int(user_id) for user_id in (user_ids or []) if user_id}
    existing_assignments = {
        assignment.user_id: assignment
        for assignment in asset.assignments.select_related("user").all()
    }
    users_by_id = User.objects.in_bulk(desired_ids)
    assignment_model = asset.assignments.model

    for removed_user_id in set(existing_assignments) - desired_ids:
        existing_assignments[removed_user_id].delete()

    for desired_user_id in desired_ids:
        user = users_by_id.get(desired_user_id)
        if not user:
            continue

        assignment = existing_assignments.get(desired_user_id)
        if assignment:
            next_email = assignment.access_email or user.email or ""
            if assignment.access_email != next_email or not assignment.is_active:
                assignment.access_email = next_email
                assignment.is_active = True
                assignment.save(update_fields=["access_email", "is_active", "updated_at"])
            continue

        assignment_model.objects.create(
            asset=asset,
            user=user,
            access_email=user.email or "",
        )

    SoftwareAsset.objects.filter(id=asset.id).update(updated_at=timezone.now())


def assign_user_to_asset(asset, user):
    if not asset or not user:
        return

    if asset.license_mode == "shared":
        active_user_ids = list(
            asset.assignments.filter(is_active=True).values_list("user_id", flat=True)
        )
        if user.id not in active_user_ids:
            active_user_ids.append(user.id)
        if len(set(active_user_ids)) > max(int(asset.seats_total or 1), 1):
            raise PermissionDenied("This license does not have an open seat.")
        sync_asset_assignments(asset, user_ids=active_user_ids)
        return

    sync_asset_assignments(asset, user_ids=[user.id])


def get_user_display_name(user):
    if not user:
        return "User"

    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.username


def get_active_asset_user_ids(asset):
    if not asset:
        return []
    return list(
        asset.assignments.filter(is_active=True).values_list("user_id", flat=True)
    )


def sync_live_csv_exports_for_users(*, user_ids):
    normalized_user_ids = sorted({int(user_id) for user_id in (user_ids or []) if user_id})
    if not normalized_user_ids:
        return
    export_live_license_csvs_for_users(user_ids=normalized_user_ids)


def ensure_member_project_membership(*, user, project):
    if not user or not project:
        return

    member_status = resolve_status_for_user(user)
    if not member_status:
        return

    project.team_members.add(member_status)


def notify_task_completed(*, task, actor):
    if not task or not actor:
        return

    recipients = {}

    def add_recipient(user):
        if not user or user.id == actor.id:
            return
        recipients[user.id] = user

    add_recipient(task.created_by)

    for admin_user in User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)):
        add_recipient(admin_user)

    actor_name = get_user_display_name(actor)

    for recipient in recipients.values():
        project_name = (
            task.project.name
            if task.project
            else runtime_text(recipient, "independent_task")
        )
        create_notification(
            recipient=recipient,
            actor=actor,
            notification_type="task",
            title=runtime_text(recipient, "task_completed_title"),
            body=runtime_text(
                recipient,
                "task_completed_body",
                actor_name=actor_name,
                project_name=project_name,
                task_title=task.title,
            ),
            link="/tasks",
        )


def recalculate_project_progress(project_id):
    if not project_id:
        return

    project = Project.objects.filter(id=project_id).first()
    if not project:
        return

    total_tasks = project.tasks.count()
    completed_tasks = project.tasks.filter(status="done").count()
    next_progress = round((completed_tasks / total_tasks) * 100) if total_tasks else 0

    if project.progress != next_progress:
        project.progress = next_progress
        project.save(update_fields=["progress", "updated_at"])

# Kod Kütüphanesi
class SnippetViewSet(viewsets.ModelViewSet):
    queryset = Snippet.objects.all().order_by('-created_at')
    serializer_class = SnippetSerializer
    permission_classes = [IsAuthorOrAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['language']
    search_fields = ['title', 'description', 'code']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

# Yorumlar
class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthorOrAdminOrReadOnly]

    def perform_create(self, serializer):
        # Modelde alan ismi 'author' olduğu için 'author=...' şeklinde kaydettik
        serializer.save(author=self.request.user)

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        snippet_author = getattr(comment.snippet, "author", None)

        if snippet_author and snippet_author.id != self.request.user.id:
            actor_name = get_user_display_name(self.request.user)
            snippet_title = comment.snippet.title or runtime_text(
                snippet_author, "code_snippet"
            )
            create_notification(
                recipient=snippet_author,
                actor=self.request.user,
                notification_type="comment",
                title=runtime_text(
                    snippet_author,
                    "comment_title",
                    actor_name=actor_name,
                ),
                body=runtime_text(
                    snippet_author,
                    "comment_body",
                    snippet_title=snippet_title,
                ),
                link=f"/snippets/{comment.snippet_id}",
            )

# Ekip Durumu
class EmployeeStatusViewSet(viewsets.ModelViewSet):
    serializer_class = StatusSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return (
            EmploymentStatus.objects.select_related('user')
            .prefetch_related("projects__tasks")
            .exclude(Q(user__is_staff=True) | Q(user__is_superuser=True))
            .order_by('-last_updated')
        )


class TeamMessageViewSet(viewsets.ModelViewSet):
    serializer_class = TeamMessageSerializer
    permission_classes = [IsAuthenticated]

    def _exclude_hidden_messages(self, queryset, current_user_status_id):
        recipient_visibility = Q(recipient__user=self.request.user)
        if current_user_status_id:
            recipient_visibility |= Q(recipient_id=current_user_status_id)

        hidden_filters = Q(deleted_for_everyone=True)
        hidden_filters |= Q(sender=self.request.user, deleted_for_sender=True)
        hidden_filters |= recipient_visibility & Q(deleted_for_recipient=True)

        return queryset.exclude(hidden_filters)

    def get_queryset(self):
        queryset = TeamMessage.objects.select_related(
            'sender',
            'recipient',
            'recipient__user',
        ).order_by('created_at')
        current_user_status = resolve_status_for_user(self.request.user)
        current_user_status_id = getattr(current_user_status, "id", None)

        conversation_with_id = self.request.query_params.get('conversation_with')
        if conversation_with_id:
            partner_status = EmploymentStatus.objects.select_related("user").filter(
                id=conversation_with_id
            ).first()
            if not partner_status:
                return queryset.none()

            partner_user = resolve_status_user(partner_status)
            partner_user_id = getattr(partner_user, "id", None)
            if partner_user_id == self.request.user.id or (
                current_user_status_id and partner_status.id == current_user_status_id
            ):
                return queryset.none()
            filters = Q(sender=self.request.user, recipient_id=conversation_with_id)
            if partner_user_id:
                incoming_filters = Q(sender_id=partner_user_id, recipient__user=self.request.user)
                if current_user_status_id:
                    incoming_filters |= Q(sender_id=partner_user_id, recipient_id=current_user_status_id)
                filters |= incoming_filters
            return self._exclude_hidden_messages(
                queryset.filter(filters),
                current_user_status_id,
            )

        recipient_id = self.request.query_params.get('recipient')
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id, sender=self.request.user)
        elif not (self.request.user.is_staff or self.request.user.is_superuser):
            visibility_filters = Q(sender=self.request.user) | Q(recipient__user=self.request.user)
            if current_user_status_id:
                visibility_filters |= Q(recipient_id=current_user_status_id)
            queryset = queryset.filter(visibility_filters)

        return self._exclude_hidden_messages(queryset, current_user_status_id)

    def perform_create(self, serializer):
        recipient = serializer.validated_data.get("recipient")
        recipient_user = resolve_status_user(recipient) if recipient else None
        current_user_status = resolve_status_for_user(self.request.user)

        if recipient and (
            getattr(recipient_user, "id", None) == self.request.user.id
            or (current_user_status and recipient.id == current_user_status.id)
        ):
            raise PermissionDenied("You cannot send a message to yourself.")

        message = serializer.save(sender=self.request.user)
        recipient_user = resolve_status_user(message.recipient) if message.recipient else None
        recipient_user_id = getattr(recipient_user, "id", None)
        if message.recipient and recipient_user_id and recipient_user_id != self.request.user.id:
            recipient_is_admin = bool(
                recipient_user.is_staff or recipient_user.is_superuser
            )
            sender_is_admin = bool(
                self.request.user.is_staff or self.request.user.is_superuser
            )
            actor_name = get_user_display_name(self.request.user)
            notification_link = "/team"
            if current_user_status:
                if recipient_is_admin:
                    notification_link = f"/administrators?chat={current_user_status.id}"
                elif sender_is_admin:
                    notification_link = f"/administrators?chat={current_user_status.id}"
                else:
                    notification_link = f"/team?chat={current_user_status.id}"

            create_notification(
                recipient=recipient_user,
                actor=self.request.user,
                notification_type="message",
                title=runtime_text(
                    recipient_user,
                    "message_title",
                    actor_name=actor_name,
                ),
                body=runtime_text(
                    recipient_user,
                    "message_body",
                    actor_name=actor_name,
                ),
                link=notification_link,
            )

    def perform_update(self, serializer):
        serializer.save(edited_at=timezone.now())

    def partial_update(self, request, *args, **kwargs):
        message = self.get_object()

        if message.sender_id != request.user.id:
            return Response(
                {"detail": "You can only edit your own messages."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if message.deleted_for_everyone:
            return Response(
                {"detail": "This message is no longer editable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="remove")
    def remove_message(self, request, pk=None):
        message = self.get_object()
        current_user_status = resolve_status_for_user(request.user)
        current_user_status_id = getattr(current_user_status, "id", None)
        recipient_user_id = getattr(message.recipient, "user_id", None)
        is_sender = message.sender_id == request.user.id
        is_recipient = recipient_user_id == request.user.id or (
            current_user_status_id and message.recipient_id == current_user_status_id
        )

        if not (is_sender or is_recipient):
            return Response(
                {"detail": "You do not have permission to manage this message."},
                status=status.HTTP_403_FORBIDDEN,
            )

        scope = str(request.data.get("scope") or "self").lower()
        if scope not in {"self", "everyone"}:
            return Response(
                {"detail": "Invalid delete scope."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if scope == "everyone":
            if not is_sender:
                return Response(
                    {"detail": "Only the sender can delete a message for everyone."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if not message.deleted_for_everyone:
                message.deleted_for_everyone = True
                message.save(update_fields=["deleted_for_everyone"])

            return Response(status=status.HTTP_204_NO_CONTENT)

        update_fields = []
        if is_sender and not message.deleted_for_sender:
            message.deleted_for_sender = True
            update_fields.append("deleted_for_sender")
        elif is_recipient and not message.deleted_for_recipient:
            message.deleted_for_recipient = True
            update_fields.append("deleted_for_recipient")

        if message.deleted_for_sender and message.deleted_for_recipient:
            message.delete()
        elif update_fields:
            message.save(update_fields=update_fields)

        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.prefetch_related('team_members', 'tasks').select_related('owner').all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority']
    search_fields = ['name', 'client_name', 'summary', 'tech_stack']
    ordering_fields = ['updated_at', 'created_at', 'progress', 'end_date']

    def perform_create(self, serializer):
        owner = serializer.validated_data.get('owner') or self.request.user
        project = serializer.save(owner=owner)
        recalculate_project_progress(project.id)
        for member in project.team_members.select_related("user").all():
            if member.user_id and member.user_id != self.request.user.id:
                create_notification(
                    recipient=member.user,
                    actor=self.request.user,
                    notification_type="project",
                    title=runtime_text(member.user, "project_added_title"),
                    body=runtime_text(
                        member.user,
                        "project_added_body",
                        project_name=project.name,
                    ),
                    link="/projects",
                )

    def perform_update(self, serializer):
        project = serializer.save()
        recalculate_project_progress(project.id)
        for member in project.team_members.select_related("user").all():
            if member.user_id and member.user_id != self.request.user.id:
                create_notification(
                    recipient=member.user,
                    actor=self.request.user,
                    notification_type="project",
                    title=runtime_text(member.user, "project_updated_title"),
                    body=runtime_text(
                        member.user,
                        "project_updated_body",
                        project_name=project.name,
                    ),
                    link="/projects",
                )


class UserAccountViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all().order_by('username')

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff or self.request.user.is_superuser:
            return queryset
        return queryset.filter(id=self.request.user.id)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [TaskPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'project', 'assignee']
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'updated_at', 'created_at', 'priority']

    def get_queryset(self):
        queryset = Task.objects.select_related(
            'project',
            'assignee',
            'assignee__employment_status',
            'created_by',
        ).all()
        if self.request.user.is_staff or self.request.user.is_superuser:
            return queryset
        return queryset.filter(assignee=self.request.user)

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        if task.assignee_id and task.project_id:
            ensure_member_project_membership(user=task.assignee, project=task.project)
        recalculate_project_progress(task.project_id)
        if task.assignee_id and task.assignee_id != self.request.user.id:
            create_notification(
                recipient=task.assignee,
                actor=self.request.user,
                notification_type="task",
                title=runtime_text(task.assignee, "task_assigned_title"),
                body=runtime_text(
                    task.assignee,
                    "task_assigned_body",
                    task_title=task.title,
                ),
                link="/tasks",
            )

    def update(self, request, *args, **kwargs):
        current_task = self.get_object()
        previous_status = current_task.status
        previous_assignee_id = current_task.assignee_id
        previous_project_id = current_task.project_id
        if not (request.user.is_staff or request.user.is_superuser):
            allowed_fields = {'status', 'actual_hours'}
            mutable_data = {
                key: value for key, value in request.data.items()
                if key in allowed_fields
            }
            serializer = self.get_serializer(
                current_task,
                data=mutable_data,
                partial=kwargs.pop('partial', False),
            )
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            updated_task = serializer.instance
            for project_id in {previous_project_id, updated_task.project_id}:
                recalculate_project_progress(project_id)
            if updated_task.project_id and updated_task.assignee_id:
                ensure_member_project_membership(user=updated_task.assignee, project=updated_task.project)
            if previous_status != "done" and updated_task.status == "done":
                notify_task_completed(task=updated_task, actor=request.user)
            return Response(serializer.data)
        response = super().update(request, *args, **kwargs)
        updated_task = self.get_object()
        for project_id in {previous_project_id, updated_task.project_id}:
            recalculate_project_progress(project_id)
        if updated_task.project_id and updated_task.assignee_id:
            ensure_member_project_membership(user=updated_task.assignee, project=updated_task.project)
        if updated_task.assignee_id and updated_task.assignee_id != previous_assignee_id:
            create_notification(
                recipient=updated_task.assignee,
                actor=request.user,
                notification_type="task",
                title=runtime_text(updated_task.assignee, "task_reassigned_title"),
                body=runtime_text(
                    updated_task.assignee,
                    "task_reassigned_body",
                    task_title=updated_task.title,
                ),
                link="/tasks",
            )
        return response

    def perform_destroy(self, instance):
        project_id = instance.project_id
        super().perform_destroy(instance)
        recalculate_project_progress(project_id)


class SoftwareAssetViewSet(viewsets.ModelViewSet):
    serializer_class = SoftwareAssetSerializer
    permission_classes = [SoftwareAssetPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "license_mode",
        "provider_code",
        "currency",
        "auto_renew",
        "sync_status",
        "record_source",
        "record_type",
        "operational_status",
        "billing_cycle",
        "department",
        "cost_center",
    ]
    search_fields = [
        "name",
        "vendor",
        "plan_name",
        "account_email",
        "billing_email",
        "external_id",
        "external_workspace_id",
        "department",
        "cost_center",
        "invoice_number",
        "contract_reference",
        "vendor_contact",
    ]
    ordering_fields = [
        "renewal_date",
        "purchase_date",
        "updated_at",
        "created_at",
        "name",
        "purchase_price",
        "vendor",
    ]

    def get_queryset(self):
        queryset = (
            SoftwareAsset.objects.select_related(
                "created_by",
                "approved_by",
                "purchased_by",
                "renewal_owner",
            )
            .prefetch_related("assignments__user")
            .all()
        )

        if not is_admin_user(self.request.user):
            queryset = queryset.filter(
                assignments__user=self.request.user,
                assignments__is_active=True,
            ).exclude(operational_status="archived").distinct()

        renewal_bucket = self.request.query_params.get("renewal_bucket")
        today = timezone.localdate()
        if renewal_bucket == "7_days":
            queryset = queryset.filter(renewal_date__gte=today, renewal_date__lte=today + timedelta(days=7))
        elif renewal_bucket == "expired":
            queryset = queryset.filter(renewal_date__lt=today)
        elif renewal_bucket == "future":
            queryset = queryset.filter(renewal_date__gt=today + timedelta(days=7))

        lifecycle_status = self.request.query_params.get("lifecycle_status")
        if lifecycle_status == "inactive":
            queryset = queryset.filter(operational_status="inactive")
        elif lifecycle_status == "archived":
            queryset = queryset.filter(operational_status="archived")
        elif lifecycle_status == "expired":
            queryset = queryset.filter(operational_status="active", renewal_date__lt=today)
        elif lifecycle_status == "expiring_soon":
            queryset = queryset.filter(
                operational_status="active",
                renewal_date__gte=today,
                renewal_date__lte=today + timedelta(days=7),
            )
        elif lifecycle_status == "active":
            queryset = queryset.filter(
                operational_status="active"
            ).exclude(renewal_date__lt=today)

        return queryset

    def _capture_asset_snapshot(self, asset):
        return {
            "name": asset.name,
            "vendor": asset.vendor,
            "plan_name": asset.plan_name,
            "record_type": asset.record_type,
            "license_mode": asset.license_mode,
            "operational_status": asset.operational_status,
            "provider_code": asset.provider_code,
            "record_source": asset.record_source,
            "billing_cycle": asset.billing_cycle,
            "department": asset.department,
            "cost_center": asset.cost_center,
            "renewal_date": str(asset.renewal_date or ""),
            "purchase_price": str(asset.purchase_price or ""),
            "currency": asset.currency,
            "assigned_user_ids": sorted(
                list(asset.assignments.filter(is_active=True).values_list("user_id", flat=True))
            ),
        }

    def _normalize_asset_identity_value(self, value):
        if value is None:
            return ""
        if isinstance(value, Decimal):
            return format(value, "f")
        if isinstance(value, str):
            return " ".join(value.strip().lower().split())
        return str(value).strip().lower()

    def _build_asset_identity_signature(self, *, asset=None, data=None):
        if asset is None and data is None:
            return None

        source = data or {}
        license_mode = source.get("license_mode") if data is not None else asset.license_mode
        provider_code = source.get("provider_code") if data is not None else asset.provider_code
        external_id = self._normalize_asset_identity_value(
            source.get("external_id") if data is not None else asset.external_id
        )
        external_workspace_id = self._normalize_asset_identity_value(
            source.get("external_workspace_id")
            if data is not None
            else asset.external_workspace_id
        )

        if license_mode == "assigned":
            assigned_user_id = (
                int(source.get("assigned_user_id"))
                if data is not None and source.get("assigned_user_id") not in (None, "")
                else (
                    asset.assignments.filter(is_active=True)
                    .values_list("user_id", flat=True)
                    .first()
                    if asset is not None
                    else None
                )
            )
            assignment_scope = ("assigned", int(assigned_user_id or 0))
        else:
            if data is not None:
                shared_user_ids = sorted(
                    int(user_id) for user_id in (source.get("shared_user_ids") or [])
                )
            else:
                shared_user_ids = sorted(
                    asset.assignments.filter(is_active=True).values_list("user_id", flat=True)
                )
            assignment_scope = ("shared", tuple(shared_user_ids))

        if external_id or external_workspace_id:
            return (
                "external",
                self._normalize_asset_identity_value(provider_code),
                self._normalize_asset_identity_value(license_mode),
                external_workspace_id,
                external_id,
                assignment_scope,
            )

        return (
            "product",
            self._normalize_asset_identity_value(source.get("name") if data is not None else asset.name),
            self._normalize_asset_identity_value(
                source.get("vendor") if data is not None else asset.vendor
            ),
            self._normalize_asset_identity_value(
                source.get("plan_name") if data is not None else asset.plan_name
            ),
            self._normalize_asset_identity_value(
                source.get("record_type") if data is not None else asset.record_type
            ),
            self._normalize_asset_identity_value(license_mode),
            self._normalize_asset_identity_value(provider_code),
            assignment_scope,
        )

    def _serialize_asset_brief(self, asset):
        visible_assignments = get_asset_visible_assignments(asset, user=self.request.user)
        primary_assignment = visible_assignments.first()
        seats_used = asset.assignments.filter(is_active=True).count()
        seats_available = max(int(asset.seats_total or 0) - seats_used, 0)

        return {
            "id": asset.id,
            "name": asset.name,
            "vendor": asset.vendor,
            "plan_name": asset.plan_name,
            "record_type": asset.record_type,
            "license_mode": asset.license_mode,
            "operational_status": asset.operational_status,
            "provider_code": asset.provider_code,
            "record_source": asset.record_source,
            "renewal_date": asset.renewal_date,
            "renewal_window": get_asset_renewal_window(asset),
            "lifecycle_status": get_asset_lifecycle_status(asset),
            "account_email": asset.account_email,
            "billing_email": asset.billing_email,
            "support_link": asset.support_link,
            "vendor_contact": asset.vendor_contact,
            "seats_total": asset.seats_total,
            "seats_used": seats_used,
            "seats_available": seats_available,
            "monthly_cost": get_asset_monthly_cost(asset),
            "annual_cost": get_asset_annual_cost(asset),
            "primary_assignment": {
                "user_id": getattr(primary_assignment, "user_id", None),
                "name": getattr(getattr(primary_assignment, "user", None), "username", ""),
                "email": getattr(primary_assignment, "effective_email", None)
                or getattr(primary_assignment, "access_email", "")
                or getattr(getattr(primary_assignment, "user", None), "email", ""),
            }
            if primary_assignment
            else None,
        }

    def _build_alerts(self, assets, include_cost_insights=True):
        alerts = []
        overlap_groups = {}

        for asset in assets:
            seats_used = asset.assignments.filter(is_active=True).count()
            seats_available = max(int(asset.seats_total or 0) - seats_used, 0)
            annual_cost = get_asset_annual_cost(asset)
            renewal_window = get_asset_renewal_window(asset)
            lifecycle_status = get_asset_lifecycle_status(asset)
            utilization_rate = round((seats_used / max(int(asset.seats_total or 1), 1)) * 100, 2)

            if renewal_window == "expired":
                alerts.append(
                    {
                        "kind": "expired",
                        "severity": "error",
                        "asset_id": asset.id,
                        "asset_name": asset.name,
                        "title": f"{asset.name} already expired",
                        "description": "Renewal date has passed and action is required.",
                    }
                )
            elif renewal_window == "7_days":
                alerts.append(
                    {
                        "kind": "renewal_due",
                        "severity": "warning",
                        "asset_id": asset.id,
                        "asset_name": asset.name,
                        "title": f"{asset.name} renewal is approaching",
                        "description": "Track renewal owner, billing cycle, and usage before the due date.",
                    }
                )

            if include_cost_insights and annual_cost > 0 and seats_used == 0:
                alerts.append(
                    {
                        "kind": "paid_unused",
                        "severity": "warning",
                        "asset_id": asset.id,
                        "asset_name": asset.name,
                        "title": f"{asset.name} is paid but unassigned",
                        "description": "This record has recurring cost but no active user assignment.",
                    }
                )

            if asset.license_mode == "shared" and seats_available == 0 and lifecycle_status == "active":
                alerts.append(
                    {
                        "kind": "seat_full",
                        "severity": "info",
                        "asset_id": asset.id,
                        "asset_name": asset.name,
                        "title": f"{asset.name} has no open seats",
                        "description": "Shared capacity is full. Consider reclaiming or adding seats.",
                    }
                )

            if asset.sync_status == "error":
                alerts.append(
                    {
                        "kind": "sync_error",
                        "severity": "error",
                        "asset_id": asset.id,
                        "asset_name": asset.name,
                        "title": f"{asset.name} sync needs attention",
                        "description": asset.sync_error or "Last provider sync ended with an error.",
                    }
                )

            if (
                asset.record_source == "manual"
                and asset.provider_code != "manual"
                and (asset.external_id or asset.external_workspace_id)
            ):
                alerts.append(
                    {
                        "kind": "source_mismatch",
                        "severity": "info",
                        "asset_id": asset.id,
                        "asset_name": asset.name,
                        "title": f"{asset.name} has manual/provider mismatch",
                        "description": "Manual record contains provider identifiers. Review whether sync should own this record.",
                    }
                )

            if (
                include_cost_insights
                and renewal_window == "7_days"
                and utilization_rate <= 40
                and annual_cost > 0
            ):
                alerts.append(
                    {
                        "kind": "low_usage_before_renewal",
                        "severity": "warning",
                        "asset_id": asset.id,
                        "asset_name": asset.name,
                        "title": f"{asset.name} has low usage before renewal",
                        "description": "Usage is low compared with paid capacity while renewal is close.",
                    }
                )

            for assignment in asset.assignments.select_related("user").filter(is_active=True):
                if not assignment.user.is_active:
                    alerts.append(
                        {
                            "kind": "offboarded_assignment",
                            "severity": "error",
                            "asset_id": asset.id,
                            "user_id": assignment.user_id,
                            "asset_name": asset.name,
                            "user_name": assignment.user.username,
                            "title": f"{assignment.user.username} left but still holds {asset.name}",
                            "description": "Reclaim this license from an inactive user account.",
                        }
                    )

                overlap_key = (
                    assignment.user_id,
                    asset.provider_code,
                    asset.name.strip().lower(),
                )
                overlap_groups.setdefault(overlap_key, []).append(asset)

        for (user_id, _, _), grouped_assets in overlap_groups.items():
            if len(grouped_assets) < 2:
                continue

            user = User.objects.filter(id=user_id).first()
            product_names = ", ".join(asset.name for asset in grouped_assets[:3])
            alerts.append(
                {
                    "kind": "duplicate_assignment",
                    "severity": "warning",
                    "asset_id": grouped_assets[0].id,
                    "user_id": user_id,
                    "asset_name": grouped_assets[0].name,
                    "user_name": get_user_display_name(user),
                    "product_names": [asset.name for asset in grouped_assets[:3]],
                    "title": f"{get_user_display_name(user)} has overlapping licenses",
                    "description": f"Potential duplicate access detected across: {product_names}.",
                }
            )

        severity_order = {"error": 0, "warning": 1, "info": 2}
        alerts.sort(
            key=lambda item: (
                severity_order.get(item["severity"], 3),
                item.get("asset_name", ""),
                item.get("kind", ""),
            )
        )
        return alerts

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        assets = list(self.get_queryset())
        visible_assets = [
            asset for asset in assets if asset.operational_status != "archived"
        ]
        can_view_costs = is_admin_user(request.user)
        requests_queryset = LicenseRequest.objects.select_related(
            "asset",
            "requester",
            "resolved_by",
        )
        if not is_admin_user(request.user):
            requests_queryset = requests_queryset.filter(requester=request.user)

        request_stats = {
            "pending": requests_queryset.filter(status="pending").count(),
            "approved": requests_queryset.filter(status="approved").count(),
            "fulfilled": requests_queryset.filter(status="fulfilled").count(),
            "rejected": requests_queryset.filter(status="rejected").count(),
        }

        provider_rollup = {}
        renewals = {
            "expired": [],
            "next_7_days": [],
        }
        stats = {
            "total_records": len(visible_assets),
            "active_records": 0,
            "inactive_records": 0,
            "shared_records": 0,
            "assigned_records": 0,
            "expiring_7_days": 0,
            "expired_records": 0,
            "monthly_cost_total": 0,
            "annual_cost_total": 0,
            "total_seats": 0,
            "used_seats": 0,
            "idle_seats": 0,
            "paid_unused_records": 0,
        }

        for asset in visible_assets:
            seats_used = asset.assignments.filter(is_active=True).count()
            seats_available = max(int(asset.seats_total or 0) - seats_used, 0)
            monthly_cost = get_asset_monthly_cost(asset)
            annual_cost = get_asset_annual_cost(asset)
            renewal_window = get_asset_renewal_window(asset)
            lifecycle_status = get_asset_lifecycle_status(asset)
            provider_bucket = provider_rollup.setdefault(
                asset.provider_code,
                {
                    "provider_code": asset.provider_code,
                    "record_count": 0,
                    "monthly_cost": 0,
                    "annual_cost": 0,
                    "used_seats": 0,
                    "total_seats": 0,
                },
            )

            provider_bucket["record_count"] += 1
            provider_bucket["monthly_cost"] += monthly_cost
            provider_bucket["annual_cost"] += annual_cost
            provider_bucket["used_seats"] += seats_used
            provider_bucket["total_seats"] += int(asset.seats_total or 0)

            stats["monthly_cost_total"] += monthly_cost
            stats["annual_cost_total"] += annual_cost
            stats["used_seats"] += seats_used
            stats["total_seats"] += int(asset.seats_total or 0)
            stats["idle_seats"] += seats_available
            stats["shared_records"] += 1 if asset.license_mode == "shared" else 0
            stats["assigned_records"] += 1 if asset.license_mode == "assigned" else 0
            stats["active_records"] += 1 if lifecycle_status == "active" else 0
            stats["inactive_records"] += 1 if lifecycle_status in {"inactive", "archived"} else 0
            stats["paid_unused_records"] += 1 if annual_cost > 0 and seats_used == 0 else 0

            serialized_asset = self._serialize_asset_brief(asset)
            if renewal_window == "expired":
                stats["expired_records"] += 1
                renewals["expired"].append(serialized_asset)
            elif renewal_window == "7_days":
                stats["expiring_7_days"] += 1
                renewals["next_7_days"].append(serialized_asset)

        utilization_rate = (
            round((stats["used_seats"] / max(stats["total_seats"], 1)) * 100, 2)
            if stats["total_seats"]
            else 0
        )
        stats["utilization_rate"] = utilization_rate
        stats["cost_per_used_seat"] = (
            round(stats["monthly_cost_total"] / max(stats["used_seats"], 1), 2)
            if stats["used_seats"]
            else 0
        )

        provider_spend = sorted(
            [
                {
                    **bucket,
                    "monthly_cost": round(bucket["monthly_cost"], 2),
                    "annual_cost": round(bucket["annual_cost"], 2),
                }
                for bucket in provider_rollup.values()
            ],
            key=lambda item: item["annual_cost"],
            reverse=True,
        )

        if not can_view_costs:
            for key in (
                "monthly_cost_total",
                "annual_cost_total",
                "cost_per_used_seat",
                "paid_unused_records",
            ):
                stats.pop(key, None)
            provider_spend = []

        sync_logs = SoftwareAssetSyncLog.objects.select_related("asset", "triggered_by")
        audit_logs = SoftwareAssetAuditLog.objects.select_related("asset", "actor")
        if not is_admin_user(request.user):
            sync_logs = sync_logs.filter(
                asset__assignments__user=request.user,
                asset__assignments__is_active=True,
            ).distinct()
            audit_logs = audit_logs.filter(
                asset__assignments__user=request.user,
                asset__assignments__is_active=True,
            ).distinct()

        return Response(
            {
                "stats": stats,
                "renewals": {
                    "expired": renewals["expired"][:8],
                    "next_7_days": renewals["next_7_days"][:8],
                },
                "alerts": self._build_alerts(
                    visible_assets,
                    include_cost_insights=can_view_costs,
                )[:24],
                "sync_logs": SoftwareAssetSyncLogSerializer(sync_logs[:20], many=True).data,
                "audit_logs": SoftwareAssetAuditLogSerializer(audit_logs[:20], many=True).data,
                "requests": LicenseRequestSerializer(
                    requests_queryset[:20],
                    many=True,
                    context={"request": request},
                ).data,
                "request_stats": request_stats,
                "user_cards": [
                    self._serialize_asset_brief(asset) for asset in visible_assets[:12]
                ],
                "provider_spend": provider_spend,
            }
        )

    def perform_create(self, serializer):
        asset = serializer.save(created_by=self.request.user)
        sync_live_csv_exports_for_users(user_ids=get_active_asset_user_ids(asset))
        log_software_asset_event(
            asset=asset,
            actor=self.request.user,
            event_type="created",
            message=f"{asset.name} record created.",
            payload=self._capture_asset_snapshot(asset),
        )

    def perform_update(self, serializer):
        current_asset = self.get_object()
        before_user_ids = get_active_asset_user_ids(current_asset)
        before_snapshot = self._capture_asset_snapshot(current_asset)
        asset = serializer.save()
        after_user_ids = get_active_asset_user_ids(asset)
        sync_live_csv_exports_for_users(user_ids=before_user_ids + after_user_ids)
        after_snapshot = self._capture_asset_snapshot(asset)
        changed_fields = sorted(
            [key for key in after_snapshot if before_snapshot.get(key) != after_snapshot.get(key)]
        )
        log_software_asset_event(
            asset=asset,
            actor=self.request.user,
            event_type="updated",
            message=f"{asset.name} record updated.",
            payload={"changed_fields": changed_fields},
        )

    def perform_destroy(self, instance):
        user_ids = get_active_asset_user_ids(instance)
        snapshot = self._capture_asset_snapshot(instance)
        log_software_asset_event(
            actor=self.request.user,
            event_type="deleted",
            message=f"{instance.name} record deleted.",
            payload=snapshot,
        )
        super().perform_destroy(instance)
        sync_live_csv_exports_for_users(user_ids=user_ids)

    @action(detail=False, methods=["post"], url_path="import-csv")
    def import_csv(self, request):
        rows = request.data.get("rows") or []
        if not isinstance(rows, list) or not rows:
            return Response(
                {"detail": "Provide a non-empty `rows` array for CSV import."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_records = []
        skipped_duplicates = []
        errors = []
        existing_assets = SoftwareAsset.objects.prefetch_related("assignments").all()
        seen_signatures = {}

        for existing_asset in existing_assets:
            signature = self._build_asset_identity_signature(asset=existing_asset)
            if signature is not None and signature not in seen_signatures:
                seen_signatures[signature] = existing_asset.id

        for index, row in enumerate(rows, start=1):
            serializer = self.get_serializer(data=row)
            if not serializer.is_valid():
                errors.append({"row": index, "errors": serializer.errors})
                continue

            signature = self._build_asset_identity_signature(data=serializer.validated_data)
            if signature in seen_signatures:
                skipped_duplicates.append(
                    {
                        "row": index,
                        "asset_id": seen_signatures[signature],
                        "name": serializer.validated_data.get("name"),
                        "reason": "duplicate_asset",
                    }
                )
                continue

            asset = serializer.save(created_by=request.user)
            created_records.append(asset.id)
            if signature is not None:
                seen_signatures[signature] = asset.id
            log_software_asset_event(
                asset=asset,
                actor=request.user,
                event_type="imported",
                message=f"{asset.name} imported from CSV.",
                payload={"row": index},
            )

        sync_live_csv_exports_for_users(
            user_ids=[
                user_id
                for asset in SoftwareAsset.objects.filter(id__in=created_records)
                for user_id in get_active_asset_user_ids(asset)
            ]
        )

        return Response(
            {
                "created_count": len(created_records),
                "created_ids": created_records,
                "skipped_count": len(skipped_duplicates),
                "skipped_duplicates": skipped_duplicates,
                "errors": errors,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk-assign")
    def bulk_assign(self, request):
        asset_ids = request.data.get("asset_ids") or []
        user_ids = request.data.get("user_ids") or []
        if not asset_ids or not user_ids:
            return Response(
                {"detail": "`asset_ids` and `user_ids` are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assets = SoftwareAsset.objects.prefetch_related("assignments").filter(id__in=asset_ids)
        updated_ids = []
        errors = []

        for asset in assets:
            existing_user_ids = list(
                asset.assignments.filter(is_active=True).values_list("user_id", flat=True)
            )
            if asset.license_mode == "assigned" and len(user_ids) > 1:
                errors.append(
                    {
                        "asset_id": asset.id,
                        "detail": "Assigned licenses can only target one user at a time.",
                    }
                )
                continue

            next_user_ids = (
                [int(user_ids[0])]
                if asset.license_mode == "assigned"
                else sorted(set(existing_user_ids + [int(user_id) for user_id in user_ids]))
            )
            if asset.license_mode == "shared" and len(next_user_ids) > max(int(asset.seats_total or 1), 1):
                errors.append(
                    {
                        "asset_id": asset.id,
                        "detail": "Assigned users would exceed available seats.",
                    }
                )
                continue

            sync_asset_assignments(asset, user_ids=next_user_ids)
            sync_live_csv_exports_for_users(
                user_ids=existing_user_ids + next_user_ids
                if asset.license_mode == "assigned"
                else []
            )
            updated_ids.append(asset.id)
            log_software_asset_event(
                asset=asset,
                actor=request.user,
                event_type="assignment_changed",
                message=f"{asset.name} assignments updated in bulk.",
                payload={"user_ids": next_user_ids},
            )

        return Response(
            {"updated_ids": updated_ids, "errors": errors},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        asset_ids = request.data.get("asset_ids") or []
        if not isinstance(asset_ids, list) or not asset_ids:
            return Response(
                {"detail": "Provide a non-empty `asset_ids` array."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            normalized_asset_ids = list(dict.fromkeys(int(asset_id) for asset_id in asset_ids))
        except (TypeError, ValueError):
            return Response(
                {"detail": "`asset_ids` must contain integer ids."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assets = list(self.get_queryset().filter(id__in=normalized_asset_ids))
        found_ids = {asset.id for asset in assets}
        missing_ids = [asset_id for asset_id in normalized_asset_ids if asset_id not in found_ids]
        if missing_ids:
            return Response(
                {
                    "detail": "Some software asset records could not be found.",
                    "missing_ids": missing_ids,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            affected_user_ids = []
            for asset in assets:
                affected_user_ids.extend(get_active_asset_user_ids(asset))
                snapshot = self._capture_asset_snapshot(asset)
                log_software_asset_event(
                    actor=request.user,
                    event_type="deleted",
                    message=f"{asset.name} record deleted.",
                    payload=snapshot,
                )
                asset.delete()

        sync_live_csv_exports_for_users(user_ids=affected_user_ids)

        return Response(
            {
                "deleted_ids": normalized_asset_ids,
                "deleted_count": len(normalized_asset_ids),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="reclaim")
    def reclaim(self, request, pk=None):
        asset = self.get_object()
        requested_user_ids = request.data.get("user_ids") or list(
            asset.assignments.filter(is_active=True).values_list("user_id", flat=True)
        )
        current_user_ids = list(
            asset.assignments.filter(is_active=True).values_list("user_id", flat=True)
        )
        next_user_ids = [user_id for user_id in current_user_ids if int(user_id) not in {int(value) for value in requested_user_ids}]
        sync_asset_assignments(asset, user_ids=next_user_ids)
        if asset.license_mode == "assigned":
            sync_live_csv_exports_for_users(user_ids=current_user_ids + next_user_ids)

        log_software_asset_event(
            asset=asset,
            actor=request.user,
            event_type="reclaimed",
            message=f"{asset.name} assignments reclaimed.",
            payload={"removed_user_ids": requested_user_ids},
        )

        asset.refresh_from_db()
        serializer = self.get_serializer(asset)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="sync")
    def sync_record(self, request, pk=None):
        asset = self.get_object()
        has_provider_mapping = asset.provider_code != "manual"
        has_external_reference = bool(asset.external_id or asset.external_workspace_id)

        if has_provider_mapping and has_external_reference:
            status_value = "ok"
            message = "Provider snapshot refreshed successfully."
            sync_error = ""
        elif has_provider_mapping:
            status_value = "error"
            message = "Provider mapping is incomplete. External identifiers are missing."
            sync_error = message
        else:
            status_value = "pending"
            message = "Manual records cannot run live provider sync. Baseline kept for audit."
            sync_error = ""

        asset.sync_status = status_value
        asset.sync_error = sync_error
        asset.last_synced_at = timezone.now()
        asset.save(update_fields=["sync_status", "sync_error", "last_synced_at", "updated_at"])

        log_software_asset_sync(
            asset=asset,
            actor=request.user,
            provider_code=asset.provider_code,
            status_value=status_value,
            message=message,
            payload={
                "record_source": asset.record_source,
                "external_id": asset.external_id,
                "external_workspace_id": asset.external_workspace_id,
            },
        )
        log_software_asset_event(
            asset=asset,
            actor=request.user,
            event_type="sync_result",
            message=f"{asset.name} sync completed with status {status_value}.",
            payload={"status": status_value, "message": message},
        )

        serializer = self.get_serializer(asset)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LicenseRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LicenseRequestSerializer
    permission_classes = [LicenseRequestPermission]
    http_method_names = ["get", "post", "patch", "head", "options"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "provider_code", "request_type"]
    search_fields = [
        "requested_product",
        "preferred_plan",
        "justification",
        "department",
        "cost_center",
    ]
    ordering_fields = ["created_at", "updated_at", "requested_product"]

    def get_queryset(self):
        queryset = LicenseRequest.objects.select_related("asset", "requester", "resolved_by").all()
        if is_admin_user(self.request.user):
            return queryset
        return queryset.filter(requester=self.request.user)

    def perform_create(self, serializer):
        request_record = serializer.save(
            requester=self.request.user,
            status="pending",
            resolution_note="",
            resolved_by=None,
        )
        for admin_user in User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)):
            create_notification(
                recipient=admin_user,
                actor=self.request.user,
                notification_type="license",
                title="New license request",
                body=f"{get_user_display_name(self.request.user)} requested {request_record.requested_product}.",
                link="/software-assets",
            )

        log_software_asset_event(
            asset=request_record.asset,
            actor=self.request.user,
            event_type="request_created",
            message=f"License request created for {request_record.requested_product}.",
            payload={
                "request_id": request_record.id,
                "status": request_record.status,
                "requested_product": request_record.requested_product,
            },
        )

    def partial_update(self, request, *args, **kwargs):
        request_record = self.get_object()
        serializer = self.get_serializer(
            request_record,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        next_status = serializer.validated_data.get("status", request_record.status)
        next_asset = serializer.validated_data.get("asset", request_record.asset)
        if next_status == "fulfilled" and not next_asset:
            return Response(
                {"detail": "A target license record is required to fulfill the request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_status = request_record.status
        try:
            with transaction.atomic():
                updated_request = serializer.save(resolved_by=request.user)
                if next_status == "fulfilled" and updated_request.asset_id:
                    previous_user_ids = get_active_asset_user_ids(updated_request.asset)
                    assign_user_to_asset(updated_request.asset, updated_request.requester)
                    sync_live_csv_exports_for_users(
                        user_ids=previous_user_ids
                        + get_active_asset_user_ids(updated_request.asset)
                    )
                    log_software_asset_event(
                        asset=updated_request.asset,
                        actor=request.user,
                        event_type="assignment_changed",
                        message=f"{updated_request.requested_product} assigned after request fulfillment.",
                        payload={
                            "request_id": updated_request.id,
                            "user_id": updated_request.requester_id,
                            "requested_product": updated_request.requested_product,
                        },
                    )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if previous_status != updated_request.status:
            create_notification(
                recipient=updated_request.requester,
                actor=request.user,
                notification_type="license",
                title="License request updated",
                body=f"{updated_request.requested_product} request is now {updated_request.status}.",
                link="/software-assets",
            )
            log_software_asset_event(
                asset=updated_request.asset,
                actor=request.user,
                event_type="request_status_changed",
                message=f"Request status changed to {updated_request.status}.",
                payload={
                    "request_id": updated_request.id,
                    "requested_product": updated_request.requested_product,
                    "from": previous_status,
                    "to": updated_request.status,
                },
            )

        return Response(
            self.get_serializer(updated_request).data,
            status=status.HTTP_200_OK,
        )


class UserNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = UserNotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["is_read", "type"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return UserNotification.objects.select_related("recipient", "actor").filter(
            recipient=self.request.user
        )

    @action(detail=False, methods=["delete"], url_path="clear-all")
    def clear_all(self, request):
        notifications = self.get_queryset()
        deleted_count = notifications.count()
        notifications.delete()
        return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)


class AdminContactListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        admin_users = User.objects.filter(
            Q(is_staff=True) | Q(is_superuser=True)
        ).order_by("username")

        statuses_by_user_id = {
            status.user_id: status
            for status in EmploymentStatus.objects.select_related("user").filter(
                user_id__in=admin_users.values_list("id", flat=True)
            )
        }
        admin_statuses = []
        for admin_user in admin_users:
            status = statuses_by_user_id.get(admin_user.id)
            if not status:
                continue

            full_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
            if not status.employee_name:
                status.employee_name = full_name or admin_user.username
            if not status.position:
                status.position = runtime_text(request.user, "administrator_role")
            if not status.current_work:
                status.current_work = runtime_text(
                    request.user, "admin_support_tracking"
                )
            if not status.status_type:
                status.status_type = "available"

            admin_statuses.append(status)

        serializer = StatusSerializer(admin_statuses, many=True)
        return Response(serializer.data)


class PageConfigViewSet(viewsets.ModelViewSet):
    queryset = PageConfig.objects.all().order_by('-updated_at')
    serializer_class = PageConfigSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "key"


class DashboardActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_admin = request.user.is_staff or request.user.is_superuser

        tasks = Task.objects.select_related(
            "project",
            "assignee",
            "assignee__employment_status",
            "created_by",
        )
        if not is_admin:
            tasks = tasks.filter(assignee=request.user)

        projects = Project.objects.prefetch_related("team_members").select_related("owner")
        snippets = Snippet.objects.select_related("author")
        comments = Comment.objects.select_related("author", "snippet")
        statuses = EmploymentStatus.objects.select_related("user").exclude(
            Q(user__is_staff=True) | Q(user__is_superuser=True)
        )
        messages = TeamMessage.objects.select_related("sender", "recipient")

        if not is_admin:
            messages = messages.filter(sender=request.user)

        activity = []

        for task in tasks.order_by("-updated_at")[:12]:
            assignee_name = (
                getattr(getattr(task.assignee, "employment_status", None), "employee_name", None)
                or getattr(task.assignee, "username", None)
                or runtime_text(request.user, "dashboard_unassigned")
            )
            project_name = (
                task.project.name
                if task.project
                else runtime_text(request.user, "dashboard_no_project")
            )
            activity.append(
                {
                    "id": f"task-{task.id}",
                    "type": "task",
                    "title": task.title,
                    "meta": runtime_text(
                        request.user,
                        "dashboard_task_meta",
                        project_name=project_name,
                        assignee_name=assignee_name,
                    ),
                    "timestamp": task.updated_at or task.created_at,
                }
            )

        for project in projects.order_by("-updated_at")[:10]:
            client_name = project.client_name or runtime_text(
                request.user, "dashboard_internal_project"
            )
            activity.append(
                {
                    "id": f"project-{project.id}",
                    "type": "project",
                    "title": project.name,
                    "meta": runtime_text(
                        request.user,
                        "dashboard_project_meta",
                        client_name=client_name,
                        team_member_count=format_team_member_count(
                            request.user, project.team_members.count()
                        ),
                    ),
                    "timestamp": project.updated_at or project.created_at,
                }
            )

        for message in messages.order_by("-created_at")[:10]:
            recipient_name = message.recipient.employee_name or runtime_text(
                request.user, "dashboard_team_member"
            )
            activity.append(
                {
                    "id": f"message-{message.id}",
                    "type": "message",
                    "title": recipient_name,
                    "meta": runtime_text(request.user, "dashboard_message_meta"),
                    "timestamp": message.created_at,
                }
            )

        for comment in comments.order_by("-created_at")[:10]:
            activity.append(
                {
                    "id": f"comment-{comment.id}",
                    "type": "comment",
                    "title": comment.snippet.title if comment.snippet else "Snippet",
                    "meta": f"{comment.author.username} - {comment.experience_rating or '-'} / 5",
                    "timestamp": comment.created_at,
                }
            )

        for snippet in snippets.order_by("-updated_at", "-created_at")[:10]:
            activity.append(
                {
                    "id": f"snippet-{snippet.id}",
                    "type": "snippet",
                    "title": snippet.title,
                    "meta": snippet.language
                    or runtime_text(request.user, "dashboard_code_label"),
                    "timestamp": snippet.updated_at or snippet.created_at,
                }
            )

        for status_item in statuses.order_by("-last_updated")[:10]:
            member_name = status_item.employee_name or getattr(
                status_item.user,
                "username",
                runtime_text(request.user, "dashboard_team_member"),
            )
            status_label = runtime_text(
                request.user,
                "dashboard_busy"
                if status_item.status_type == "busy"
                else "dashboard_available",
            )
            activity.append(
                {
                    "id": f"status-{status_item.id}",
                    "type": "team",
                    "title": member_name,
                    "meta": status_item.current_work or status_label,
                    "timestamp": status_item.last_updated,
                }
            )

        activity.sort(key=lambda item: item["timestamp"], reverse=True)
        return Response(activity[:12])

# Analytics
@api_view(['GET'])
def analytics_data(request):
    language_stats = Snippet.objects.values('language').annotate(total=Count('id'))
    total_snippets = Snippet.objects.count()
    
    return Response({
        'total_snippets': total_snippets,
        'language_distribution': language_stats
    })

# Login
class CustomLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        governance_sync = queue_governance_login_sync(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'is_admin': user.is_staff or user.is_superuser,
            'language': getattr(getattr(user, 'profile', None), 'language', 'en'),
            'governance_sync': governance_sync,
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''
    email = (request.data.get('email') or '').strip()
    first_name = (request.data.get('first_name') or '').strip()
    last_name = (request.data.get('last_name') or '').strip()

    if not username or not password or not email:
        return Response(
            {"error": "Kullanıcı adı, email ve şifre zorunludur."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Bu kullanıcı adı zaten kullanılıyor."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"error": "Bu email ile kayıtlı bir hesap zaten var."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
    except OperationalError:
        return Response(
            {"error": "Veritabanı şu anda meşgul. Lütfen birkaç saniye sonra tekrar deneyin."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'is_admin': user.is_staff or user.is_superuser,
            'language': getattr(getattr(user, 'profile', None), 'language', 'en'),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    id_token = request.data.get('id_token')

    if not id_token:
        return Response(
            {"error": "Google token bulunamadı."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        query = urlencode({'id_token': id_token})
        token_info_url = f'https://oauth2.googleapis.com/tokeninfo?{query}'
        with urllib_request.urlopen(token_info_url, timeout=10) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except Exception:
        return Response(
            {"error": "Google kimlik doğrulaması başarısız oldu."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    audience = payload.get('aud')
    email = (payload.get('email') or '').strip().lower()
    email_verified = payload.get('email_verified') in (True, 'true', 'True', '1')

    if settings.GOOGLE_CLIENT_ID and audience != settings.GOOGLE_CLIENT_ID:
        return Response(
            {"error": "Google client kimliği eşleşmedi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not email or not email_verified:
        return Response(
            {"error": "Google hesabı doğrulanmış email döndürmedi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.filter(email__iexact=email).first()

    if not user:
        base_username = (email.split('@')[0] or 'user')[:24]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=payload.get('given_name', '') or '',
            last_name=payload.get('family_name', '') or '',
            password=User.objects.make_random_password(),
        )

    token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'is_admin': user.is_staff or user.is_superuser,
            'language': getattr(getattr(user, 'profile', None), 'language', 'en'),
        },
        status=status.HTTP_200_OK,
    )

# Logout
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        request.user.auth_token.delete()
        return Response({"message": "Başarıyla çıkış yapıldı"}, status=status.HTTP_200_OK)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")

    if not check_password(old_password, user.password):
        return Response({"error": "Mevcut şifre hatalı."}, status=400)
    
    user.set_password(new_password)
    user.save()
    return Response({"message": "Şifre başarıyla güncellendi."})
def _serialize_user(user, request, profile=None):
    profile = profile or getattr(user, 'profile', None)
    avatar = ''
    if profile and profile.profile_photo:
        avatar = request.build_absolute_uri(profile.profile_photo.url)

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'firstName': user.first_name,
        'lastName': user.last_name,
        'avatar': avatar,
        'isAdmin': user.is_staff or user.is_superuser,
        'language': getattr(profile, 'language', 'en'),
    }


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if request.method == 'PATCH':
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        language = request.data.get('language')

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if email is not None:
            user.email = email

        if language is not None and language in SUPPORTED_LANGUAGES:
            profile.language = language

        if 'profile_photo' in request.FILES:
            profile.profile_photo = request.FILES['profile_photo']

        user.save()
        profile.save()

    return Response(_serialize_user(user, request, profile=profile), status=status.HTTP_200_OK)
