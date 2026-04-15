from django.contrib import admin
from .models import (
    AICodeRequest,
    AICodeValidationResult,
    CodeViolation,
    DeveloperRepositoryScore,
    EmploymentStatus,
    GithubAccount,
    GithubCommitActivity,
    GithubPullRequestActivity,
    GithubRepository,
    UserProfile,
    RepositoryScan,
    StandardProfile,
    StandardRule,
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


class StandardRuleInline(admin.TabularInline):
    model = StandardRule
    extra = 0


@admin.register(StandardProfile)
class StandardProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "target_stack", "is_default", "is_active", "updated_at")
    list_filter = ("target_stack", "is_default", "is_active")
    search_fields = ("name", "description")
    inlines = [StandardRuleInline]


@admin.register(StandardRule)
class StandardRuleAdmin(admin.ModelAdmin):
    list_display = ("title", "profile", "category", "severity", "weight", "is_enabled")
    list_filter = ("category", "severity", "is_enabled", "profile")
    search_fields = ("title", "code", "description")


@admin.register(GithubAccount)
class GithubAccountAdmin(admin.ModelAdmin):
    list_display = ("github_username", "user", "account_type", "last_synced_at", "is_active")
    list_filter = ("account_type", "is_active", "last_synced_at")
    search_fields = ("github_username", "user__username", "user__email")


@admin.register(GithubRepository)
class GithubRepositoryAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "account",
        "standard_profile",
        "primary_language",
        "latest_score",
        "latest_scan_at",
        "is_active",
    )
    list_filter = ("primary_language", "visibility", "is_active", "standard_profile")
    search_fields = ("name", "full_name", "owner_login", "description")


@admin.register(RepositoryScan)
class RepositoryScanAdmin(admin.ModelAdmin):
    list_display = ("repository", "scan_type", "status", "score", "violation_count", "created_at")
    list_filter = ("scan_type", "status", "standard_profile")
    search_fields = ("repository__full_name", "commit_sha")


@admin.register(CodeViolation)
class CodeViolationAdmin(admin.ModelAdmin):
    list_display = ("code", "repository", "severity", "author_login", "file_path", "line_number")
    list_filter = ("severity", "code")
    search_fields = ("code", "title", "message", "file_path", "author_login")


@admin.register(DeveloperRepositoryScore)
class DeveloperRepositoryScoreAdmin(admin.ModelAdmin):
    list_display = ("repository", "github_login", "score", "commit_count", "violation_count")
    list_filter = ("repository",)
    search_fields = ("github_login", "display_name", "repository__full_name")


@admin.register(GithubCommitActivity)
class GithubCommitActivityAdmin(admin.ModelAdmin):
    list_display = (
        "repository",
        "author_login",
        "message_title",
        "quality_score",
        "committed_at",
    )
    list_filter = ("repository", "is_merge_commit")
    search_fields = ("author_login", "author_name", "message_title", "sha")


@admin.register(GithubPullRequestActivity)
class GithubPullRequestActivityAdmin(admin.ModelAdmin):
    list_display = (
        "repository",
        "pull_number",
        "author_login",
        "state",
        "quality_score",
        "opened_at",
    )
    list_filter = ("repository", "state", "is_draft", "is_merged")
    search_fields = ("author_login", "author_name", "title")


@admin.register(AICodeRequest)
class AICodeRequestAdmin(admin.ModelAdmin):
    list_display = ("provider_name", "model_name", "repository", "validation_status", "validation_score", "updated_at")
    list_filter = ("provider_name", "validation_status", "standard_profile")
    search_fields = ("provider_name", "model_name", "task_summary", "repository__full_name")


@admin.register(AICodeValidationResult)
class AICodeValidationResultAdmin(admin.ModelAdmin):
    list_display = ("request", "status", "score", "violation_count", "created_at")
    list_filter = ("status",)
