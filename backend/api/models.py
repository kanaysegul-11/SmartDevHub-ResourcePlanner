from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils import timezone
from .text_utils import restore_missing_turkish_dotted_i



class UserProfile(models.Model):
    LANGUAGE_CHOICES = [
        ("en", "English"),
        ("tr", "Turkish"),
        ("de", "German"),
        ("fr", "French"),
        ("es", "Spanish"),
        ("ar", "Arabic"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_photo = models.FileField(upload_to='profile_photos/', blank=True, null=True)
    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default="en",
    )

    def __str__(self):
        return f"{self.user.username} profile"


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    else:
        UserProfile.objects.get_or_create(user=instance)

# Kod Parçacıkları Modeli
class Snippet(models.Model):
    LANGUAGE_CHOICES = [
        ('python', 'Python'),
        ('javascript', 'JavaScript'),
        ('react/js', 'React/JS'),
        ('csharp', 'C#'),
        ('css', 'CSS'),
        ('html', 'HTML'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(help_text="Nerde ve ne işe yaradığını belirtiniz.")
    code = models.TextField()
    language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='snippets', null=True, blank=True)

    def save(self, *args, **kwargs):
        self.title = restore_missing_turkish_dotted_i(self.title)
        self.description = restore_missing_turkish_dotted_i(self.description)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

# Yorum Modeli
class Comment(models.Model):
    snippet = models.ForeignKey(Snippet, related_name='comments', on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True) # İsmi 'author' olarak sabitledik
    text = models.TextField() # İsmi 'text' olarak sabitledik
    experience_rating = models.IntegerField(
    default=5, 
    validators=[MinValueValidator(1), MaxValueValidator(5)],
    help_text="1-5 arasında bir puan veriniz."
)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        author_name = self.author.username if self.author else "anonymous"
        return f"{author_name} - {self.snippet.title}"

# Çalışan Durumu Modeli
class EmploymentStatus(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        related_name="employment_status",
        null=True,
        blank=True,
        verbose_name="Bağlı Kullanıcı",
    )
    employee_name = models.CharField(max_length=100, blank=True, null=True, verbose_name="Çalışan İsmi")
    position = models.CharField(max_length=100, blank=True, null=True, verbose_name="Pozisyon")
    current_work = models.TextField(verbose_name="Şu Anki Görev")
    status_type = models.CharField(
        max_length=20, 
        choices=[('available', 'Müsait'), ('busy', 'Meşgul')],
        default='available',
        verbose_name="Durum"
    )
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ekip Durumu"
        verbose_name_plural = "Ekip Durumları"

    def __str__(self):
        return self.employee_name if self.employee_name else "İsimsiz"


class TeamMessage(models.Model):
    recipient = models.ForeignKey(
        EmploymentStatus,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="team_messages",
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_for_sender = models.BooleanField(default=False)
    deleted_for_recipient = models.BooleanField(default=False)
    deleted_for_everyone = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Team Message"
        verbose_name_plural = "Team Messages"

    def __str__(self):
        recipient_name = self.recipient.employee_name or "Recipient"
        return f"{self.sender.username} -> {recipient_name}"


class Project(models.Model):
    STATUS_CHOICES = [
        ("planning", "Planning"),
        ("active", "Active"),
        ("blocked", "Blocked"),
        ("completed", "Completed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    name = models.CharField(max_length=160)
    client_name = models.CharField(max_length=160, blank=True)
    summary = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planning")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    progress = models.PositiveIntegerField(default=0)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    tech_stack = models.CharField(max_length=255, blank=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="owned_projects",
        null=True,
        blank=True,
    )
    team_members = models.ManyToManyField(
        EmploymentStatus,
        related_name="projects",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        verbose_name = "Project"
        verbose_name_plural = "Projects"

    def __str__(self):
        return self.name


class Task(models.Model):
    STATUS_CHOICES = [
        ("todo", "To Do"),
        ("in_progress", "In Progress"),
        ("review", "Review"),
        ("done", "Done"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="tasks",
        null=True,
        blank=True,
    )
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="created_tasks",
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="todo")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    deadline = models.DateField(null=True, blank=True)
    estimated_hours = models.PositiveIntegerField(default=0)
    actual_hours = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "deadline", "-updated_at"]
        verbose_name = "Task"
        verbose_name_plural = "Tasks"

    def __str__(self):
        return self.title


class PageConfig(models.Model):
    key = models.SlugField(unique=True)
    data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Page Config"
        verbose_name_plural = "Page Configs"

    def __str__(self):
        return self.key


class UserNotification(models.Model):
    TYPE_CHOICES = [
        ("task", "Task"),
        ("project", "Project"),
        ("message", "Message"),
        ("comment", "Comment"),
        ("snippet", "Snippet"),
        ("license", "License"),
        ("system", "System"),
    ]

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="sent_notifications",
        null=True,
        blank=True,
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="system")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User Notification"
        verbose_name_plural = "User Notifications"

    def __str__(self):
        return f"{self.recipient.username} - {self.title}"


class SoftwareAsset(models.Model):
    RECORD_TYPE_CHOICES = [
        ("saas", "SaaS Subscription"),
        ("desktop_license", "Desktop License"),
        ("team_tool", "Team Tool"),
        ("single_user_license", "Single User License"),
        ("api_subscription", "API Subscription"),
        ("support_service", "Support Service"),
    ]
    LICENSE_MODE_CHOICES = [
        ("shared", "Shared Team License"),
        ("assigned", "Assigned User License"),
    ]
    OPERATIONAL_STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("archived", "Archived"),
    ]
    BILLING_CYCLE_CHOICES = [
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("yearly", "Yearly"),
        ("one_time", "One Time"),
    ]
    CURRENCY_CHOICES = [
        ("TRY", "TRY"),
        ("USD", "USD"),
        ("EUR", "EUR"),
        ("GBP", "GBP"),
    ]
    PROVIDER_CHOICES = [
        ("manual", "Manual"),
        ("cursor", "Cursor"),
        ("adobe", "Adobe"),
        ("figma", "Figma"),
        ("github", "GitHub"),
        ("microsoft", "Microsoft 365"),
        ("openai", "OpenAI"),
        ("other", "Other"),
    ]
    RECORD_SOURCE_CHOICES = [
        ("manual", "Manual"),
        ("provider_sync", "Provider Sync"),
    ]
    SYNC_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("ok", "OK"),
        ("error", "Error"),
    ]

    name = models.CharField(max_length=160)
    vendor = models.CharField(max_length=120)
    plan_name = models.CharField(max_length=160, blank=True)
    record_type = models.CharField(
        max_length=30,
        choices=RECORD_TYPE_CHOICES,
        default="saas",
    )
    license_mode = models.CharField(
        max_length=20,
        choices=LICENSE_MODE_CHOICES,
        default="assigned",
    )
    operational_status = models.CharField(
        max_length=20,
        choices=OPERATIONAL_STATUS_CHOICES,
        default="active",
    )
    provider_code = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        default="manual",
    )
    record_source = models.CharField(
        max_length=20,
        choices=RECORD_SOURCE_CHOICES,
        default="manual",
    )
    external_id = models.CharField(max_length=255, blank=True)
    external_workspace_id = models.CharField(max_length=255, blank=True)
    account_email = models.EmailField(blank=True)
    billing_email = models.EmailField(blank=True)
    seats_total = models.PositiveIntegerField(default=1)
    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLE_CHOICES,
        default="monthly",
    )
    department = models.CharField(max_length=120, blank=True)
    cost_center = models.CharField(max_length=120, blank=True)
    invoice_number = models.CharField(max_length=120, blank=True)
    contract_reference = models.CharField(max_length=160, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    renewal_date = models.DateField(null=True, blank=True)
    auto_renew = models.BooleanField(default=False)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    sync_status = models.CharField(
        max_length=20,
        choices=SYNC_STATUS_CHOICES,
        default="pending",
    )
    sync_error = models.TextField(blank=True)
    purchase_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="USD")
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="approved_software_assets",
        null=True,
        blank=True,
    )
    purchased_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="purchased_software_assets",
        null=True,
        blank=True,
    )
    renewal_owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="owned_software_renewals",
        null=True,
        blank=True,
    )
    vendor_contact = models.CharField(max_length=255, blank=True)
    support_link = models.URLField(max_length=500, blank=True)
    documentation_link = models.URLField(max_length=500, blank=True)
    is_scim_managed = models.BooleanField(default=False)
    is_sso_managed = models.BooleanField(default=False)
    extra_metadata = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="created_software_assets",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["renewal_date", "name", "-updated_at"]
        verbose_name = "Software Asset"
        verbose_name_plural = "Software Assets"

    def save(self, *args, **kwargs):
        if self.license_mode == "assigned":
            self.seats_total = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.get_license_mode_display()})"


class SoftwareAssetAssignment(models.Model):
    asset = models.ForeignKey(
        SoftwareAsset,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="software_asset_assignments",
    )
    access_email = models.EmailField(blank=True)
    assigned_at = models.DateField(default=timezone.localdate)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_active", "assigned_at", "user__username"]
        verbose_name = "Software Asset Assignment"
        verbose_name_plural = "Software Asset Assignments"
        constraints = [
            models.UniqueConstraint(
                fields=["asset", "user"],
                name="unique_software_asset_assignment",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.access_email and self.user_id:
            self.access_email = self.user.email or ""
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.asset.name} -> {self.user.username}"


class SoftwareAssetAuditLog(models.Model):
    EVENT_TYPE_CHOICES = [
        ("created", "Created"),
        ("updated", "Updated"),
        ("deleted", "Deleted"),
        ("imported", "Imported"),
        ("assignment_changed", "Assignment Changed"),
        ("reclaimed", "Reclaimed"),
        ("sync_requested", "Sync Requested"),
        ("sync_result", "Sync Result"),
        ("request_created", "Request Created"),
        ("request_status_changed", "Request Status Changed"),
    ]

    asset = models.ForeignKey(
        SoftwareAsset,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        null=True,
        blank=True,
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="software_asset_audit_logs",
        null=True,
        blank=True,
    )
    event_type = models.CharField(max_length=40, choices=EVENT_TYPE_CHOICES)
    message = models.CharField(max_length=255)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Software Asset Audit Log"
        verbose_name_plural = "Software Asset Audit Logs"

    def __str__(self):
        asset_name = self.asset.name if self.asset else "License"
        return f"{asset_name} - {self.event_type}"


class SoftwareAssetSyncLog(models.Model):
    asset = models.ForeignKey(
        SoftwareAsset,
        on_delete=models.SET_NULL,
        related_name="sync_logs",
        null=True,
        blank=True,
    )
    provider_code = models.CharField(
        max_length=20,
        choices=SoftwareAsset.PROVIDER_CHOICES,
        default="manual",
    )
    status = models.CharField(
        max_length=20,
        choices=SoftwareAsset.SYNC_STATUS_CHOICES,
        default="pending",
    )
    triggered_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="software_asset_sync_logs",
        null=True,
        blank=True,
    )
    message = models.CharField(max_length=255)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Software Asset Sync Log"
        verbose_name_plural = "Software Asset Sync Logs"

    def __str__(self):
        asset_name = self.asset.name if self.asset else self.provider_code
        return f"{asset_name} - {self.status}"


class LicenseRequest(models.Model):
    REQUEST_TYPE_CHOICES = [
        ("access_request", "Access Request"),
        ("new_purchase", "New Purchase"),
        ("seat_increase", "Seat Increase"),
        ("replacement", "Replacement"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("fulfilled", "Fulfilled"),
        ("rejected", "Rejected"),
    ]

    asset = models.ForeignKey(
        SoftwareAsset,
        on_delete=models.SET_NULL,
        related_name="license_requests",
        null=True,
        blank=True,
    )
    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="license_requests",
    )
    requested_product = models.CharField(max_length=160)
    provider_code = models.CharField(
        max_length=20,
        choices=SoftwareAsset.PROVIDER_CHOICES,
        default="other",
    )
    request_type = models.CharField(
        max_length=30,
        choices=REQUEST_TYPE_CHOICES,
        default="access_request",
    )
    preferred_plan = models.CharField(max_length=160, blank=True)
    department = models.CharField(max_length=120, blank=True)
    cost_center = models.CharField(max_length=120, blank=True)
    justification = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    resolution_note = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="resolved_license_requests",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "License Request"
        verbose_name_plural = "License Requests"

    def __str__(self):
        return f"{self.requested_product} - {self.requester.username}"


from .governance_models import (  # noqa: E402
    AICodeRequest,
    AICodeValidationResult,
    CodeViolation,
    DeveloperRepositoryScore,
    GithubAccount,
    GithubCommitActivity,
    GithubPullRequestActivity,
    GithubRepository,
    RepositoryScan,
    StandardProfile,
    StandardRule,
)
