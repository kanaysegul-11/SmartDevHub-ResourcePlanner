from django import views
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SnippetViewSet, CommentViewSet, EmployeeStatusViewSet, PageConfigViewSet, TeamMessageViewSet, ProjectViewSet, TaskViewSet, UserAccountViewSet, UserNotificationViewSet
from django.urls import path
from .views import CustomLoginView, LogoutView, change_password, update_profile, register_user, google_auth, DashboardActivityView, AdminContactListView

router = DefaultRouter()
router.register(r'snippets', SnippetViewSet)    
router.register(r'comments', CommentViewSet)
router.register(r'status', EmployeeStatusViewSet, basename='status')
router.register(r'team-messages', TeamMessageViewSet, basename='team-message')
router.register(r'projects', ProjectViewSet)
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'users', UserAccountViewSet, basename='user-account')
router.register(r'notifications', UserNotificationViewSet, basename='notification')
router.register(r'page-configs', PageConfigViewSet)


urlpatterns = [
    path('', include(router.urls)),
    path('status/', EmployeeStatusViewSet.as_view({'get': 'list'}), name='status-list'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('register/', register_user, name='register'),
    path('google-auth/', google_auth, name='google-auth'),
    path('dashboard-activity/', DashboardActivityView.as_view(), name='dashboard-activity'),
    path('admin-contacts/', AdminContactListView.as_view(), name='admin-contacts'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('change-password/', change_password, name='change-password'),
    path('update-profile/', update_profile, name='update-profile'),
    
]
