from rest_framework import serializers
from .models import Snippet, Comment, EmploymentStatus
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