from rest_framework import serializers
from .models import Snippet, Comment, EmploymentStatus, PageConfig, TeamMessage, Project, Task
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmploymentStatus
        fields = ['id', 'employee_name', 'position', 'current_work', 'status_type', 'last_updated']

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
