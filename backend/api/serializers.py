from rest_framework import serializers
from .models import Snippet, Comment, EmploymentStatus
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username','first_name','last_name', 'email']

# api/serializers.py
class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmploymentStatus
        # Sadece bu alanları bırak, user_details'i tamamen sil!
        fields = ['id', 'employee_name', 'position', 'current_work', 'status_type', 'last_updated']

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = '__all__'

class SnippetSerializer(serializers.ModelSerializer):
    # author bilgisini sadece veri çekerken (GET) göreceğiz
    author = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Snippet
        # '__all__' yerine alanları açıkça yazmak her zaman daha güvenlidir
        fields = ['id', 'title', 'description', 'code', 'language', 'author', 'comments', 'created_at']