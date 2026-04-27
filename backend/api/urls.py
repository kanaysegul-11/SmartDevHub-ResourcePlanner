from django import views
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SnippetViewSet, CommentViewSet, EmployeeStatusViewSet, PageConfigViewSet, TeamMessageViewSet, ProjectViewSet, TaskViewSet, UserAccountViewSet, UserNotificationViewSet, SoftwareAssetViewSet, LicenseRequestViewSet
from .governance_views import (
    AICodeRequestViewSet,
    GithubAccountViewSet,
    GithubCommitActivityViewSet,
    GithubPullRequestActivityViewSet,
    GithubRepositoryViewSet,
    GithubWebhookReceiveView,
    RepositoryScanViewSet,
    StandardProfileViewSet,
    StandardRuleViewSet,
)
from django.urls import path
from .views import CustomLoginView, LogoutView, change_password, update_profile, register_user, google_auth, DashboardActivityView, AdminContactListView

router = DefaultRouter()
router.register(r'snippets', SnippetViewSet, basename='snippet')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'status', EmployeeStatusViewSet, basename='status')
router.register(r'team-messages', TeamMessageViewSet, basename='team-message')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'users', UserAccountViewSet, basename='user-account')
router.register(r'notifications', UserNotificationViewSet, basename='notification')
router.register(r'page-configs', PageConfigViewSet, basename='page-config')
router.register(r'software-assets', SoftwareAssetViewSet, basename='software-asset')
router.register(r'license-requests', LicenseRequestViewSet, basename='license-request')
router.register(r'standard-profiles', StandardProfileViewSet, basename='standard-profile')
router.register(r'standard-rules', StandardRuleViewSet, basename='standard-rule')
router.register(r'github-accounts', GithubAccountViewSet, basename='github-account')
router.register(r'github-repositories', GithubRepositoryViewSet, basename='github-repository')
router.register(r'repository-scans', RepositoryScanViewSet, basename='repository-scan')
router.register(r'github-commit-activities', GithubCommitActivityViewSet, basename='github-commit-activity')
router.register(r'github-pull-request-activities', GithubPullRequestActivityViewSet, basename='github-pull-request-activity')
router.register(r'ai-code-requests', AICodeRequestViewSet, basename='ai-code-request')


urlpatterns = [
    path(
        'github-accounts/sync-all-repositories/',
        GithubAccountViewSet.as_view({'post': 'sync_all_repositories'}),
        name='github-account-sync-all-repositories',
    ),
    path(
        'github-repositories/team-scoreboard/',
        GithubRepositoryViewSet.as_view({'get': 'team_scoreboard'}),
        name='github-repository-team-scoreboard',
    ),
    path('', include(router.urls)),
    path('github-webhooks/receive/', GithubWebhookReceiveView.as_view(), name='github-webhook-receive'),
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
