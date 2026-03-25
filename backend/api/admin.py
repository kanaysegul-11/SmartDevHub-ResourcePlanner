from django.contrib import admin
from .models import EmploymentStatus, UserProfile, TeamMessage, Project, Task

@admin.register(EmploymentStatus)
class EmploymentStatusAdmin(admin.ModelAdmin):
    # Admin panelinde görünecek sütunlar 
    list_display = ('employee_name', 'user', 'position', 'status_type', 'last_updated')
    # Tıklanıp düzenlenebilecek alanlar
    list_editable = ('status_type', 'position')
    # Arama yapılabilecek alanlar
    search_fields = ('employee_name', 'user__username', 'user__email')
    # Sağ taraftaki filtre paneli
    list_filter = ('status_type',)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user','profile_photo')
    search_fields = ('user__username',)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'client_name', 'status', 'priority', 'progress', 'updated_at')
    list_filter = ('status', 'priority')
    search_fields = ('name', 'client_name', 'summary', 'tech_stack')
    filter_horizontal = ('team_members',)


@admin.register(TeamMessage)
class TeamMessageAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'sender', 'created_at')
    search_fields = ('recipient__employee_name', 'sender__username', 'content')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'assignee', 'status', 'priority', 'deadline', 'updated_at')
    list_filter = ('status', 'priority', 'project')
    search_fields = ('title', 'description', 'assignee__username', 'project__name')
