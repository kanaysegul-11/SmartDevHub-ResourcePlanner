from datetime import timedelta

from rest_framework import serializers
from .models import (
    Snippet,
    Comment,
    EmploymentStatus,
    PageConfig,
    TeamMessage,
    Project,
    Task,
    UserNotification,
    SoftwareAsset,
    SoftwareAssetAssignment,
    SoftwareAssetAuditLog,
    SoftwareAssetSyncLog,
    LicenseRequest,
)
from .text_utils import normalize_legacy_turkish_text
from django.contrib.auth.models import User
from django.utils import timezone

class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.SerializerMethodField()

    def get_is_admin(self, obj):
        return bool(obj.is_staff or obj.is_superuser)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_admin']

class StatusSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    effective_status = serializers.SerializerMethodField()
    active_task_title = serializers.SerializerMethodField()
    active_task_description = serializers.SerializerMethodField()
    active_task_deadline = serializers.SerializerMethodField()
    active_task_project_name = serializers.SerializerMethodField()
    active_task_project_client = serializers.SerializerMethodField()
    active_task_project_end_date = serializers.SerializerMethodField()
    active_project_count = serializers.SerializerMethodField()

    class Meta:
        model = EmploymentStatus
        fields = [
            'id',
            'user',
            'user_details',
            'employee_name',
            'position',
            'current_work',
            'status_type',
            'effective_status',
            'active_task_title',
            'active_task_description',
            'active_task_deadline',
            'active_task_project_name',
            'active_task_project_client',
            'active_task_project_end_date',
            'active_project_count',
            'last_updated',
        ]

    def validate(self, attrs):
        linked_user = attrs.get('user')
        employee_name = attrs.get('employee_name')

        if linked_user and not employee_name:
            full_name = f"{linked_user.first_name} {linked_user.last_name}".strip()
            attrs['employee_name'] = full_name or linked_user.username

        return attrs

    def _normalize_identity(self, value):
        return " ".join((value or "").strip().lower().split())

    def _resolve_user(self, obj):
        if obj.user_id:
            return obj.user

        if not hasattr(self, "_user_lookup"):
            self._user_lookup = {}
            for user in User.objects.all():
                username_key = self._normalize_identity(user.username)
                if username_key:
                    self._user_lookup[username_key] = user

                full_name_key = self._normalize_identity(f"{user.first_name} {user.last_name}")
                if full_name_key:
                    self._user_lookup[full_name_key] = user

        return self._user_lookup.get(self._normalize_identity(obj.employee_name))

    def _get_open_tasks(self, obj):
        if not hasattr(self, "_open_task_cache"):
            self._open_task_cache = {}

        resolved_user = self._resolve_user(obj)
        if not resolved_user:
            return []

        if resolved_user.id not in self._open_task_cache:
            self._open_task_cache[resolved_user.id] = list(
                Task.objects.select_related('project')
                .filter(assignee_id=resolved_user.id)
                .exclude(status='done')
                .order_by('deadline', '-updated_at')
            )

        return self._open_task_cache[resolved_user.id]

    def _get_member_projects(self, obj):
        if not hasattr(self, "_member_project_cache"):
            self._member_project_cache = {}

        if obj.id not in self._member_project_cache:
            prefetched_projects = getattr(obj, "_prefetched_objects_cache", {}).get("projects")
            self._member_project_cache[obj.id] = list(
                prefetched_projects if prefetched_projects is not None else obj.projects.all()
            )

        return self._member_project_cache[obj.id]

    def _get_project_tasks(self, project):
        if not hasattr(self, "_project_task_cache"):
            self._project_task_cache = {}

        if project.id not in self._project_task_cache:
            prefetched_tasks = getattr(project, "_prefetched_objects_cache", {}).get("tasks")
            self._project_task_cache[project.id] = list(
                prefetched_tasks if prefetched_tasks is not None else project.tasks.all()
            )

        return self._project_task_cache[project.id]

    def _is_active_member_project(self, project):
        if not project or project.status == "completed":
            return False

        project_tasks = self._get_project_tasks(project)
        all_tasks_completed = bool(project_tasks) and all(
            task.status == "done" for task in project_tasks
        )
        due_reached = bool(project.end_date and project.end_date <= timezone.localdate())

        return not (
            all_tasks_completed
            or (due_reached and int(project.progress or 0) >= 100)
        )

    def _get_active_project_ids(self, obj):
        task_project_ids = {
            task.project_id
            for task in self._get_open_tasks(obj)
            if task.project_id
        }
        member_project_ids = {
            project.id
            for project in self._get_member_projects(obj)
            if self._is_active_member_project(project)
        }

        return task_project_ids | member_project_ids

    def _get_active_task(self, obj):
        open_tasks = self._get_open_tasks(obj)
        return open_tasks[0] if open_tasks else None

    def get_effective_status(self, obj):
        return 'busy' if self._get_active_task(obj) else 'available'

    def get_active_task_title(self, obj):
        task = self._get_active_task(obj)
        return task.title if task else ''

    def get_active_task_description(self, obj):
        task = self._get_active_task(obj)
        return task.description if task else ''

    def get_active_task_deadline(self, obj):
        task = self._get_active_task(obj)
        return task.deadline if task else None

    def get_active_task_project_name(self, obj):
        task = self._get_active_task(obj)
        return task.project.name if task and task.project else ''

    def get_active_task_project_client(self, obj):
        task = self._get_active_task(obj)
        return task.project.client_name if task and task.project else ''

    def get_active_task_project_end_date(self, obj):
        task = self._get_active_task(obj)
        return task.project.end_date if task and task.project else None

    def get_active_project_count(self, obj):
        return len(self._get_active_project_ids(obj))

class CommentSerializer(serializers.ModelSerializer):
    author_details = UserSerializer(source='author', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'snippet', 'text', 'experience_rating', 'created_at', 'author', 'author_details']
        read_only_fields = ['author']
        extra_kwargs = {
            'experience_rating': {
                'required': True,
                'min_value': 1,
                'max_value': 5,
            },
        }

class SnippetSerializer(serializers.ModelSerializer):
    comments = CommentSerializer(many=True, read_only=True) 
    author_details = UserSerializer(source='author', read_only=True)

    class Meta:
        model = Snippet
        fields = ['id', 'title', 'description', 'code', 'language', 'created_at', 'author', 'author_details', 'comments']
    def validate_code(self, value):
        # Kodun başındaki ve sonundaki boşlukları temizleyerek kontrol et
        normalized_code = value.strip()
        
        # Mevcut bir kaydı güncelliyorsak (update), kendisiyle çakışmasın diye 'exclude' ediyoruz
        snippet_id = self.instance.id if self.instance else None
        
        exists = Snippet.objects.filter(code=normalized_code).exclude(id=snippet_id).exists()
        
        if exists:
            raise serializers.ValidationError("Bu kod zaten kütüphanede mevcut!")
        
        return value

class PageConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageConfig
        fields = ['id', 'key', 'data', 'created_at', 'updated_at']


class TeamMessageSerializer(serializers.ModelSerializer):
    sender_details = UserSerializer(source='sender', read_only=True)
    recipient_name = serializers.CharField(
        source='recipient.employee_name',
        read_only=True,
    )

    class Meta:
        model = TeamMessage
        fields = [
            'id',
            'recipient',
            'recipient_name',
            'sender',
            'sender_details',
            'content',
            'created_at',
            'edited_at',
        ]
        read_only_fields = ['sender', 'edited_at']


class ProjectSerializer(serializers.ModelSerializer):
    owner_details = UserSerializer(source='owner', read_only=True)
    team_member_details = StatusSerializer(source='team_members', many=True, read_only=True)
    effective_status = serializers.SerializerMethodField()
    is_completed_archive = serializers.SerializerMethodField()
    total_task_count = serializers.SerializerMethodField()
    completed_task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id',
            'name',
            'client_name',
            'summary',
            'status',
            'priority',
            'progress',
            'effective_status',
            'is_completed_archive',
            'total_task_count',
            'completed_task_count',
            'start_date',
            'end_date',
            'tech_stack',
            'owner',
            'owner_details',
            'team_members',
            'team_member_details',
            'created_at',
            'updated_at',
        ]

    def _get_project_tasks(self, obj):
        if not hasattr(self, "_project_task_cache"):
            self._project_task_cache = {}

        if obj.id not in self._project_task_cache:
            prefetched_tasks = getattr(obj, "_prefetched_objects_cache", {}).get("tasks")
            self._project_task_cache[obj.id] = list(prefetched_tasks if prefetched_tasks is not None else obj.tasks.all())

        return self._project_task_cache[obj.id]

    def _get_completion_snapshot(self, obj):
        if not hasattr(self, "_project_completion_cache"):
            self._project_completion_cache = {}

        if obj.id not in self._project_completion_cache:
            tasks = self._get_project_tasks(obj)
            total_task_count = len(tasks)
            completed_task_count = sum(1 for task in tasks if task.status == "done")
            all_tasks_completed = total_task_count > 0 and completed_task_count == total_task_count
            due_reached = bool(obj.end_date and obj.end_date <= timezone.localdate())
            is_completed_archive = bool(
                obj.status == "completed"
                or (due_reached and (all_tasks_completed or int(obj.progress or 0) >= 100))
            )

            self._project_completion_cache[obj.id] = {
                "total_task_count": total_task_count,
                "completed_task_count": completed_task_count,
                "is_completed_archive": is_completed_archive,
                "effective_status": "completed" if is_completed_archive else obj.status,
            }

        return self._project_completion_cache[obj.id]

    def get_effective_status(self, obj):
        return self._get_completion_snapshot(obj)["effective_status"]

    def get_is_completed_archive(self, obj):
        return self._get_completion_snapshot(obj)["is_completed_archive"]

    def get_total_task_count(self, obj):
        return self._get_completion_snapshot(obj)["total_task_count"]

    def get_completed_task_count(self, obj):
        return self._get_completion_snapshot(obj)["completed_task_count"]

    def _get_combined_team_members(self, obj):
        members_by_id = {
            member.id: member
            for member in obj.team_members.select_related("user").all()
        }

        task_assignee_ids = obj.tasks.exclude(assignee_id__isnull=True).values_list(
            "assignee_id",
            flat=True,
        ).distinct()

        for member in EmploymentStatus.objects.select_related("user").filter(user_id__in=task_assignee_ids):
            members_by_id[member.id] = member

        return list(members_by_id.values())

    def to_representation(self, instance):
        data = super().to_representation(instance)
        combined_members = self._get_combined_team_members(instance)
        data["team_members"] = [member.id for member in combined_members]
        data["team_member_details"] = StatusSerializer(
            combined_members,
            many=True,
            context=self.context,
        ).data
        return data


class TaskSerializer(serializers.ModelSerializer):
    assignee_details = UserSerializer(source='assignee', read_only=True)
    assignee_status = StatusSerializer(source='assignee.employment_status', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'project',
            'project_name',
            'assignee',
            'assignee_details',
            'assignee_status',
            'created_by',
            'created_by_details',
            'status',
            'priority',
            'deadline',
            'estimated_hours',
            'actual_hours',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_by']


class SoftwareAssetAssignmentSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    effective_email = serializers.SerializerMethodField()

    class Meta:
        model = SoftwareAssetAssignment
        fields = [
            "id",
            "user",
            "user_details",
            "access_email",
            "effective_email",
            "assigned_at",
            "is_active",
        ]
        read_only_fields = ["assigned_at"]

    def get_effective_email(self, obj):
        return obj.access_email or getattr(obj.user, "email", "") or ""


class SoftwareAssetAuditLogSerializer(serializers.ModelSerializer):
    actor_details = UserSerializer(source="actor", read_only=True)
    asset_name = serializers.CharField(source="asset.name", read_only=True)

    class Meta:
        model = SoftwareAssetAuditLog
        fields = [
            "id",
            "asset",
            "asset_name",
            "actor",
            "actor_details",
            "event_type",
            "message",
            "payload",
            "created_at",
        ]


class SoftwareAssetSyncLogSerializer(serializers.ModelSerializer):
    triggered_by_details = UserSerializer(source="triggered_by", read_only=True)
    asset_name = serializers.CharField(source="asset.name", read_only=True)

    class Meta:
        model = SoftwareAssetSyncLog
        fields = [
            "id",
            "asset",
            "asset_name",
            "provider_code",
            "status",
            "message",
            "payload",
            "triggered_by",
            "triggered_by_details",
            "created_at",
        ]


class SoftwareAssetSerializer(serializers.ModelSerializer):
    COST_FIELD_NAMES = (
        "purchase_price",
        "monthly_cost_estimate",
        "annual_cost_estimate",
    )
    assignments = serializers.SerializerMethodField()
    primary_assignment = serializers.SerializerMethodField()
    shared_user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    assigned_user_id = serializers.IntegerField(
        min_value=1,
        write_only=True,
        required=False,
        allow_null=True,
    )
    lifecycle_status = serializers.SerializerMethodField()
    renewal_window = serializers.SerializerMethodField()
    seats_used = serializers.SerializerMethodField()
    seats_available = serializers.SerializerMethodField()
    utilization_rate = serializers.SerializerMethodField()
    monthly_cost_estimate = serializers.SerializerMethodField()
    annual_cost_estimate = serializers.SerializerMethodField()
    created_by_details = UserSerializer(source="created_by", read_only=True)
    approved_by_details = UserSerializer(source="approved_by", read_only=True)
    purchased_by_details = UserSerializer(source="purchased_by", read_only=True)
    renewal_owner_details = UserSerializer(source="renewal_owner", read_only=True)

    class Meta:
        model = SoftwareAsset
        fields = [
            "id",
            "name",
            "vendor",
            "plan_name",
            "record_type",
            "license_mode",
            "operational_status",
            "provider_code",
            "record_source",
            "external_id",
            "external_workspace_id",
            "account_email",
            "billing_email",
            "seats_total",
            "billing_cycle",
            "department",
            "cost_center",
            "invoice_number",
            "contract_reference",
            "purchase_date",
            "renewal_date",
            "auto_renew",
            "last_synced_at",
            "sync_status",
            "sync_error",
            "purchase_price",
            "currency",
            "approved_by",
            "approved_by_details",
            "purchased_by",
            "purchased_by_details",
            "renewal_owner",
            "renewal_owner_details",
            "vendor_contact",
            "support_link",
            "documentation_link",
            "is_scim_managed",
            "is_sso_managed",
            "extra_metadata",
            "notes",
            "created_by",
            "created_by_details",
            "assignments",
            "primary_assignment",
            "shared_user_ids",
            "assigned_user_id",
            "lifecycle_status",
            "renewal_window",
            "seats_used",
            "seats_available",
            "utilization_rate",
            "monthly_cost_estimate",
            "annual_cost_estimate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def _request_can_view_costs(self):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None):
            return True
        if not request.user.is_authenticated:
            return False
        return request.user.is_staff or request.user.is_superuser

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._request_can_view_costs():
            for field_name in self.COST_FIELD_NAMES:
                data.pop(field_name, None)
        return data

    def _get_visible_assignments(self, obj):
        request = self.context.get("request")
        assignments = obj.assignments.select_related("user").all()

        if request and not (request.user.is_staff or request.user.is_superuser):
            assignments = assignments.filter(user=request.user, is_active=True)

        return assignments

    def get_assignments(self, obj):
        return SoftwareAssetAssignmentSerializer(
            self._get_visible_assignments(obj),
            many=True,
            context=self.context,
        ).data

    def get_primary_assignment(self, obj):
        assignment = self._get_visible_assignments(obj).filter(is_active=True).first()
        if not assignment:
            return None

        return SoftwareAssetAssignmentSerializer(
            assignment,
            context=self.context,
        ).data

    def get_lifecycle_status(self, obj):
        if obj.operational_status == "archived":
            return "archived"
        if obj.operational_status == "inactive":
            return "inactive"
        if obj.renewal_date and obj.renewal_date < timezone.localdate():
            return "expired"
        if obj.renewal_date and obj.renewal_date <= timezone.localdate() + timedelta(days=7):
            return "expiring_soon"
        return "active"

    def get_renewal_window(self, obj):
        if not obj.renewal_date:
            return "none"
        if obj.renewal_date < timezone.localdate():
            return "expired"
        if obj.renewal_date <= timezone.localdate() + timedelta(days=7):
            return "7_days"
        return "future"

    def get_seats_used(self, obj):
        return obj.assignments.filter(is_active=True).count()

    def get_seats_available(self, obj):
        return max(int(obj.seats_total or 0) - self.get_seats_used(obj), 0)

    def get_utilization_rate(self, obj):
        total = max(int(obj.seats_total or 0), 1)
        return round((self.get_seats_used(obj) / total) * 100, 2)

    def _get_price_value(self, obj):
        if obj.purchase_price in (None, ""):
            return 0
        try:
            return float(obj.purchase_price)
        except (TypeError, ValueError):
            return 0

    def _get_purchase_units(self, obj):
        try:
            return max(int(obj.seats_total or 1), 1)
        except (TypeError, ValueError):
            return 1

    def get_monthly_cost_estimate(self, obj):
        price = self._get_price_value(obj)
        seats_total = self._get_purchase_units(obj)
        if obj.billing_cycle == "yearly":
            return round((price * seats_total) / 12, 2)
        if obj.billing_cycle == "quarterly":
            return round((price * seats_total) / 3, 2)
        if obj.billing_cycle == "one_time":
            return 0
        return round(price * seats_total, 2)

    def get_annual_cost_estimate(self, obj):
        price = self._get_price_value(obj)
        seats_total = self._get_purchase_units(obj)
        if obj.billing_cycle == "monthly":
            return round(price * seats_total * 12, 2)
        if obj.billing_cycle == "quarterly":
            return round(price * seats_total * 4, 2)
        if obj.billing_cycle == "one_time":
            return round(price * seats_total, 2)
        return round(price * seats_total, 2)

    def validate(self, attrs):
        request = self.context.get("request")
        current_mode = attrs.get(
            "license_mode",
            getattr(self.instance, "license_mode", "assigned"),
        )
        shared_user_ids = attrs.get("shared_user_ids", None)
        assigned_user_id = attrs.get("assigned_user_id", None)

        if request and request.user and request.user.is_authenticated and not (
            request.user.is_staff or request.user.is_superuser
        ):
            raise serializers.ValidationError(
                {"detail": "Only admins can manage software records."}
            )

        if current_mode == "shared":
            seats_total = attrs.get("seats_total", getattr(self.instance, "seats_total", 1)) or 1
            if seats_total < 1:
                raise serializers.ValidationError({"seats_total": "Seats must be at least 1."})

            if assigned_user_id not in (None, ""):
                raise serializers.ValidationError(
                    {"assigned_user_id": "Shared licenses cannot target a single dedicated user."}
                )

            if shared_user_ids is not None:
                unique_ids = {int(user_id) for user_id in shared_user_ids}
                if len(unique_ids) > seats_total:
                    raise serializers.ValidationError(
                        {"shared_user_ids": "Assigned users cannot exceed total seats."}
                    )
                if User.objects.filter(id__in=unique_ids).count() != len(unique_ids):
                    raise serializers.ValidationError(
                        {"shared_user_ids": "One or more selected users do not exist."}
                    )
        else:
            attrs["seats_total"] = 1
            if shared_user_ids not in (None, []):
                raise serializers.ValidationError(
                    {"shared_user_ids": "Assigned licenses do not use shared user lists."}
                )

            effective_assigned_user_id = assigned_user_id
            if effective_assigned_user_id in (None, "") and self.instance:
                effective_assigned_user_id = (
                    self.instance.assignments.filter(is_active=True)
                    .values_list("user_id", flat=True)
                    .first()
                )

            if effective_assigned_user_id in (None, ""):
                raise serializers.ValidationError(
                    {"assigned_user_id": "Assigned licenses must be linked to one user."}
                )

            if not User.objects.filter(id=effective_assigned_user_id).exists():
                raise serializers.ValidationError(
                    {"assigned_user_id": "The selected user does not exist."}
                )

        return attrs

    def create(self, validated_data):
        shared_user_ids = validated_data.pop("shared_user_ids", None)
        assigned_user_id = validated_data.pop("assigned_user_id", None)
        asset = super().create(validated_data)
        self._sync_assignments(
            asset,
            shared_user_ids=shared_user_ids,
            assigned_user_id=assigned_user_id,
        )
        return asset

    def update(self, instance, validated_data):
        shared_user_ids = validated_data.pop("shared_user_ids", None)
        assigned_user_id = validated_data.pop("assigned_user_id", None)
        asset = super().update(instance, validated_data)
        self._sync_assignments(
            asset,
            shared_user_ids=shared_user_ids,
            assigned_user_id=assigned_user_id,
        )
        return asset

    def _sync_assignments(self, asset, *, shared_user_ids=None, assigned_user_id=None):
        if asset.license_mode == "shared":
            desired_ids = (
                {int(user_id) for user_id in (shared_user_ids or [])}
                if shared_user_ids is not None
                else {
                    assignment.user_id
                    for assignment in asset.assignments.filter(is_active=True)
                }
            )
        else:
            if assigned_user_id not in (None, ""):
                desired_ids = {int(assigned_user_id)}
            else:
                existing_user_id = (
                    asset.assignments.filter(is_active=True)
                    .values_list("user_id", flat=True)
                    .first()
                )
                desired_ids = {existing_user_id} if existing_user_id else set()

        existing_by_user_id = {
            assignment.user_id: assignment
            for assignment in asset.assignments.select_related("user").all()
        }
        users_by_id = User.objects.in_bulk(desired_ids)

        for removed_user_id in set(existing_by_user_id) - desired_ids:
            existing_by_user_id[removed_user_id].delete()

        for desired_user_id in desired_ids:
            user = users_by_id.get(desired_user_id)
            if not user:
                continue

            assignment = existing_by_user_id.get(desired_user_id)
            if assignment:
                next_email = assignment.access_email or user.email or ""
                if assignment.access_email != next_email or not assignment.is_active:
                    assignment.access_email = next_email
                    assignment.is_active = True
                    assignment.save(update_fields=["access_email", "is_active", "updated_at"])
                continue

            SoftwareAssetAssignment.objects.create(
                asset=asset,
                user=user,
                access_email=user.email or "",
            )


class LicenseRequestSerializer(serializers.ModelSerializer):
    requester_details = UserSerializer(source="requester", read_only=True)
    resolved_by_details = UserSerializer(source="resolved_by", read_only=True)
    asset_name = serializers.CharField(source="asset.name", read_only=True)

    class Meta:
        model = LicenseRequest
        fields = [
            "id",
            "asset",
            "asset_name",
            "requester",
            "requester_details",
            "requested_product",
            "provider_code",
            "request_type",
            "preferred_plan",
            "department",
            "cost_center",
            "justification",
            "status",
            "resolution_note",
            "resolved_by",
            "resolved_by_details",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "requester",
            "resolved_by",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if request and not (request.user and request.user.is_authenticated):
            raise serializers.ValidationError({"detail": "Authentication is required."})
        return attrs


class UserNotificationSerializer(serializers.ModelSerializer):
    recipient_details = UserSerializer(source="recipient", read_only=True)
    actor_details = UserSerializer(source="actor", read_only=True)
    title = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()

    class Meta:
        model = UserNotification
        fields = [
            "id",
            "recipient",
            "recipient_details",
            "actor",
            "actor_details",
            "type",
            "title",
            "body",
            "link",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["actor", "created_at"]

    def get_title(self, obj):
        return normalize_legacy_turkish_text(obj.title)

    def get_body(self, obj):
        return normalize_legacy_turkish_text(obj.body)
