from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SnippetViewSet, CommentViewSet, EmployeeStatusViewSet
from django.urls import path
from .views import CustomLoginView, LogoutView

router = DefaultRouter()
router.register(r'snippets', SnippetViewSet)    
router.register(r'comments', CommentViewSet)
router.register(r'status', EmployeeStatusViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('status/', EmployeeStatusViewSet.as_view({'get': 'list'}), name='status-list'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
]