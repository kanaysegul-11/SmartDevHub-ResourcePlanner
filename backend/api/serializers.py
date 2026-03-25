from rest_framework import serializers
from .models import Snippet, Comment, EmploymentStatus, PageConfig, TeamMessage, Project, Task, UserNotification
from django.contrib.auth.models import User

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

    def _get_active_task(self, obj):
        if not hasattr(self, "_active_task_cache"):
            self._active_task_cache = {}

        if obj.id in self._active_task_cache:
            return self._active_task_cache[obj.id]

        resolved_user = self._resolve_user(obj)
        if not resolved_user:
            self._active_task_cache[obj.id] = None
            return None

        task = (
            Task.objects.select_related('project')
            .filter(assignee_id=resolved_user.id)
            .exclude(status='done')
            .order_by('deadline', '-updated_at')
            .first()
        )
        self._active_task_cache[obj.id] = task
        return task

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

class CommentSerializer(serializers.ModelSerializer):
    author_details = UserSerializer(source='author', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'snippet', 'text', 'experience_rating', 'created_at', 'author', 'author_details']
        read_only_fields = ['author']

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
        ]
        read_only_fields = ['sender']


class ProjectSerializer(serializers.ModelSerializer):
    owner_details = UserSerializer(source='owner', read_only=True)
    team_member_details = StatusSerializer(source='team_members', many=True, read_only=True)

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


class UserNotificationSerializer(serializers.ModelSerializer):
    recipient_details = UserSerializer(source="recipient", read_only=True)
    actor_details = UserSerializer(source="actor", read_only=True)

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
