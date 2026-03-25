from rest_framework import viewsets, filters, status
from django.db.models import Count, Q
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission, SAFE_METHODS
from django_filters.rest_framework import DjangoFilterBackend
from .models import Snippet, Comment, EmploymentStatus, PageConfig, TeamMessage, Project, UserProfile, Task, UserNotification
from .serializers import SnippetSerializer, CommentSerializer, StatusSerializer, PageConfigSerializer, TeamMessageSerializer, ProjectSerializer, TaskSerializer, UserSerializer, UserNotificationSerializer
from rest_framework.decorators import api_view, permission_classes
from django.conf import settings
from django.db import OperationalError
from urllib import request as urllib_request
from urllib.parse import urlencode
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


def create_notification(*, recipient, actor=None, notification_type="system", title="", body="", link=""):
    if not recipient:
        return

    UserNotification.objects.create(
        recipient=recipient,
        actor=actor,
        type=notification_type,
        title=title[:200],
        body=body,
        link=link,
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
    serializer_class = StatusSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return (
            EmploymentStatus.objects.select_related('user')
            .exclude(Q(user__is_staff=True) | Q(user__is_superuser=True))
            .order_by('-last_updated')
        )


class TeamMessageViewSet(viewsets.ModelViewSet):
    serializer_class = TeamMessageSerializer
    permission_classes = [IsAuthenticated]

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
            filters = Q(sender=self.request.user, recipient_id=conversation_with_id)
            if partner_user_id:
                incoming_filters = Q(sender_id=partner_user_id, recipient__user=self.request.user)
                if current_user_status_id:
                    incoming_filters |= Q(sender_id=partner_user_id, recipient_id=current_user_status_id)
                filters |= incoming_filters
            return queryset.filter(filters)

        recipient_id = self.request.query_params.get('recipient')
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id, sender=self.request.user)
        elif not (self.request.user.is_staff or self.request.user.is_superuser):
            visibility_filters = Q(sender=self.request.user) | Q(recipient__user=self.request.user)
            if current_user_status_id:
                visibility_filters |= Q(recipient_id=current_user_status_id)
            queryset = queryset.filter(visibility_filters)

        return queryset

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        recipient_user = resolve_status_user(message.recipient) if message.recipient else None
        recipient_user_id = getattr(recipient_user, "id", None)
        if message.recipient and recipient_user_id and recipient_user_id != self.request.user.id:
            sender_status = resolve_status_for_user(self.request.user)
            recipient_is_admin = bool(
                recipient_user.is_staff or recipient_user.is_superuser
            )
            notification_link = "/team"
            if sender_status:
                notification_link = (
                    f"/team?chat={sender_status.id}"
                    if recipient_is_admin
                    else f"/administrators?chat={sender_status.id}"
                )

            create_notification(
                recipient=recipient_user,
                actor=self.request.user,
                notification_type="message",
                title="Yeni ekip mesaji",
                body=f"{self.request.user.username} size bir mesaj gonderdi.",
                link=notification_link,
            )


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
        project = serializer.save(owner=owner)
        recalculate_project_progress(project.id)
        for member in project.team_members.select_related("user").all():
            if member.user_id and member.user_id != self.request.user.id:
                create_notification(
                    recipient=member.user,
                    actor=self.request.user,
                    notification_type="project",
                    title="Yeni projeye eklendiniz",
                    body=f"{project.name} projesine dahil edildiniz.",
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
                    title="Proje bilgisi guncellendi",
                    body=f"{project.name} projesiyle ilgili yeni bir guncelleme var.",
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
        recalculate_project_progress(task.project_id)
        if task.assignee_id and task.assignee_id != self.request.user.id:
            create_notification(
                recipient=task.assignee,
                actor=self.request.user,
                notification_type="task",
                title="Size yeni gorev atandi",
                body=f"{task.title} gorevi size atandi.",
                link="/tasks",
            )

    def update(self, request, *args, **kwargs):
        current_task = self.get_object()
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
            return Response(serializer.data)
        response = super().update(request, *args, **kwargs)
        updated_task = self.get_object()
        for project_id in {previous_project_id, updated_task.project_id}:
            recalculate_project_progress(project_id)
        if updated_task.assignee_id and updated_task.assignee_id != previous_assignee_id:
            create_notification(
                recipient=updated_task.assignee,
                actor=request.user,
                notification_type="task",
                title="Size gorev atandi",
                body=f"{updated_task.title} gorevi size atandi.",
                link="/tasks",
            )
        return response

    def perform_destroy(self, instance):
        project_id = instance.project_id
        super().perform_destroy(instance)
        recalculate_project_progress(project_id)


class UserNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = UserNotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["is_read", "type"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return UserNotification.objects.select_related("recipient", "actor").filter(
            recipient=self.request.user
        )


class AdminContactListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        admin_users = User.objects.filter(
            Q(is_staff=True) | Q(is_superuser=True)
        ).order_by("username")

        admin_statuses = []
        for admin_user in admin_users:
            full_name = f"{admin_user.first_name} {admin_user.last_name}".strip()
            status, created = EmploymentStatus.objects.get_or_create(
                user=admin_user,
                defaults={
                    "employee_name": full_name or admin_user.username,
                    "position": "Administrator",
                    "current_work": "Yonetici destek taleplerini takip ediyor.",
                    "status_type": "available",
                },
            )

            updated_fields = []
            if not status.employee_name:
                status.employee_name = full_name or admin_user.username
                updated_fields.append("employee_name")
            if not status.position:
                status.position = "Administrator"
                updated_fields.append("position")
            if not status.current_work:
                status.current_work = "Yonetici destek taleplerini takip ediyor."
                updated_fields.append("current_work")
            if updated_fields:
                status.save(update_fields=updated_fields)

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
                or "Atanmadi"
            )
            project_name = task.project.name if task.project else "Proje baglanmadi"
            activity.append(
                {
                    "id": f"task-{task.id}",
                    "type": "task",
                    "title": task.title,
                    "meta": f"{project_name} - Atanan: {assignee_name}",
                    "timestamp": task.updated_at or task.created_at,
                }
            )

        for project in projects.order_by("-updated_at")[:10]:
            activity.append(
                {
                    "id": f"project-{project.id}",
                    "type": "project",
                    "title": project.name,
                    "meta": f"{project.client_name or 'Ic proje'} - {project.team_members.count()} ekip uyesi",
                    "timestamp": project.updated_at or project.created_at,
                }
            )

        for message in messages.order_by("-created_at")[:10]:
            recipient_name = message.recipient.employee_name or "Ekip uyesi"
            activity.append(
                {
                    "id": f"message-{message.id}",
                    "type": "message",
                    "title": recipient_name,
                    "meta": "Takim mesaji gonderildi",
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
                    "meta": snippet.language or "Kod",
                    "timestamp": snippet.updated_at or snippet.created_at,
                }
            )

        for status_item in statuses.order_by("-last_updated")[:10]:
            member_name = status_item.employee_name or getattr(status_item.user, "username", "Ekip uyesi")
            status_label = "Mesgul" if status_item.status_type == "busy" else "Musait"
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
            {"error": "Veritabani su anda mesgul. Lütfen birkaç saniye sonra tekrar deneyin."},
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
