from rest_framework import viewsets, filters, status
from django.db.models import Count
from django.contrib.auth.hashers import check_password
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from .models import Snippet, Comment, EmploymentStatus
from .serializers import SnippetSerializer, CommentSerializer, StatusSerializer
from rest_framework.decorators import api_view, permission_classes
from .models import Snippet, Comment, EmploymentStatus, UserProfile
from rest_framework.response import Response
from django.contrib.auth.hashers import check_password

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
            'username': user.username
        })

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
    }


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    if request.method == 'PATCH':
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if email is not None:
            user.email = email

        if 'profile_photo' in request.FILES:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.profile_photo = request.FILES['profile_photo']
            profile.save()

        user.save()

    return Response(_serialize_user(user, request), status=status.HTTP_200_OK)