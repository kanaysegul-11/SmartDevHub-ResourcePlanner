from django.contrib import admin
from .models import (
    EmploymentStatus,
    UserProfile,
    TeamMessage,
    Project,
    Task,
    SoftwareAsset,
    SoftwareAssetAssignment,
    SoftwareAssetAuditLog,
    SoftwareAssetSyncLog,
    LicenseRequest,
)

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


class SoftwareAssetAssignmentInline(admin.TabularInline):
    model = SoftwareAssetAssignment
    extra = 0


@admin.register(SoftwareAsset)
class SoftwareAssetAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'vendor',
        'record_type',
        'license_mode',
        'operational_status',
        'provider_code',
        'seats_total',
        'renewal_date',
        'sync_status',
        'updated_at',
    )
    list_filter = (
        'record_type',
        'license_mode',
        'operational_status',
        'provider_code',
        'billing_cycle',
        'currency',
        'auto_renew',
        'sync_status',
    )
    search_fields = (
        'name',
        'vendor',
        'plan_name',
        'account_email',
        'billing_email',
        'external_id',
        'external_workspace_id',
        'department',
        'cost_center',
        'invoice_number',
        'contract_reference',
    )
    inlines = [SoftwareAssetAssignmentInline]


@admin.register(SoftwareAssetAssignment)
class SoftwareAssetAssignmentAdmin(admin.ModelAdmin):
    list_display = ('asset', 'user', 'access_email', 'assigned_at', 'is_active')
    list_filter = ('is_active', 'assigned_at')
    search_fields = ('asset__name', 'user__username', 'user__email', 'access_email')


@admin.register(SoftwareAssetAuditLog)
class SoftwareAssetAuditLogAdmin(admin.ModelAdmin):
    list_display = ('asset', 'event_type', 'actor', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('asset__name', 'message', 'actor__username')


@admin.register(SoftwareAssetSyncLog)
class SoftwareAssetSyncLogAdmin(admin.ModelAdmin):
    list_display = ('asset', 'provider_code', 'status', 'triggered_by', 'created_at')
    list_filter = ('provider_code', 'status', 'created_at')
    search_fields = ('asset__name', 'message', 'triggered_by__username')


@admin.register(LicenseRequest)
class LicenseRequestAdmin(admin.ModelAdmin):
    list_display = ('requested_product', 'requester', 'status', 'provider_code', 'created_at')
    list_filter = ('status', 'provider_code', 'request_type', 'created_at')
    search_fields = ('requested_product', 'requester__username', 'preferred_plan', 'justification')
