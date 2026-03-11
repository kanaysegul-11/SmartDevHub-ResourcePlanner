from rest_framework import serializers
from .models import Snippet, Comment, EmploymentStatus, PageConfig
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
