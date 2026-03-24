from rest_framework import viewsets, filters, status
from django.db.models import Count
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission, SAFE_METHODS
from django_filters.rest_framework import DjangoFilterBackend
from .models import Snippet, Comment, EmploymentStatus, PageConfig, TeamMessage, Project, UserProfile, Task
from .serializers import SnippetSerializer, CommentSerializer, StatusSerializer, PageConfigSerializer, TeamMessageSerializer, ProjectSerializer, TaskSerializer, UserSerializer
from rest_framework.decorators import api_view, permission_classes
from django.conf import settings
from urllib import request as urllib_request
from urllib.parse import urlencode
import json

SUPPORTED_LANGUAGES = {"en", "tr", "de", "fr", "es", "ar"}

class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


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

# Kod Kütüphanesi
class SnippetViewSet(viewsets.ModelViewSet):
    queryset = Snippet.objects.all().order_by('-created_at')
    serializer_class = SnippetSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['language']
    search_fields = ['title', 'description', 'code']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

# Yorumlar
class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Modelde alan ismi 'author' olduğu için 'author=...' şeklinde kaydettik
        serializer.save(author=self.request.user)

# Ekip Durumu
class EmployeeStatusViewSet(viewsets.ModelViewSet):
    queryset = EmploymentStatus.objects.all().order_by('-last_updated')
    serializer_class = StatusSerializer
    permission_classes = [IsAdminOrReadOnly]


class TeamMessageViewSet(viewsets.ModelViewSet):
    serializer_class = TeamMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = TeamMessage.objects.select_related(
            'sender',
            'recipient',
        ).order_by('created_at')

        recipient_id = self.request.query_params.get('recipient')
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.prefetch_related('team_members').select_related('owner').all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority']
    search_fields = ['name', 'client_name', 'summary', 'tech_stack']
    ordering_fields = ['updated_at', 'created_at', 'progress', 'end_date']

    def perform_create(self, serializer):
        owner = serializer.validated_data.get('owner') or self.request.user
        serializer.save(owner=owner)


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
        queryset = Task.objects.select_related('project', 'assignee', 'created_by').all()
        if self.request.user.is_staff or self.request.user.is_superuser:
            return queryset
        return queryset.filter(assignee=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        if not (request.user.is_staff or request.user.is_superuser):
            allowed_fields = {'status', 'actual_hours'}
            mutable_data = {
                key: value for key, value in request.data.items()
                if key in allowed_fields
            }
            serializer = self.get_serializer(
                self.get_object(),
                data=mutable_data,
                partial=kwargs.pop('partial', False),
            )
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        return super().update(request, *args, **kwargs)


class PageConfigViewSet(viewsets.ModelViewSet):
    queryset = PageConfig.objects.all().order_by('-updated_at')
    serializer_class = PageConfigSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "key"

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
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'is_admin': user.is_staff or user.is_superuser,
            'language': getattr(getattr(user, 'profile', None), 'language', 'en'),
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
            {"error": "Kullanici adi, email ve sifre zorunludur."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Bu kullanici adi zaten kullaniliyor."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"error": "Bu email ile kayitli bir hesap zaten var."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
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
            {"error": "Google token bulunamadi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        query = urlencode({'id_token': id_token})
        token_info_url = f'https://oauth2.googleapis.com/tokeninfo?{query}'
        with urllib_request.urlopen(token_info_url, timeout=10) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except Exception:
        return Response(
            {"error": "Google kimlik dogrulamasi basarisiz oldu."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    audience = payload.get('aud')
    email = (payload.get('email') or '').strip().lower()
    email_verified = payload.get('email_verified') in (True, 'true', 'True', '1')

    if settings.GOOGLE_CLIENT_ID and audience != settings.GOOGLE_CLIENT_ID:
        return Response(
            {"error": "Google client kimligi eslesmedi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not email or not email_verified:
        return Response(
            {"error": "Google hesabi dogrulanmis email dondurmedi."},
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
def _serialize_user(user, request):
    avatar = ''
    if hasattr(user, 'profile') and user.profile.profile_photo:
        avatar = request.build_absolute_uri(user.profile.profile_photo.url)

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'firstName': user.first_name,
        'lastName': user.last_name,
        'avatar': avatar,
        'isAdmin': user.is_staff or user.is_superuser,
        'language': getattr(getattr(user, 'profile', None), 'language', 'en'),
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

    return Response(_serialize_user(user, request), status=status.HTTP_200_OK)
