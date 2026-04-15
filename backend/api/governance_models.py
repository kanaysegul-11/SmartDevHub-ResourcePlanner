from django.contrib.auth.models import User
from django.db import models


class StandardProfile(models.Model):
    TARGET_STACK_CHOICES = [
        ("polyglot", "Polyglot"),
        ("python", "Python"),
        ("javascript", "JavaScript"),
        ("typescript", "TypeScript"),
        ("react", "React"),
        ("django", "Django"),
        ("other", "Other"),
    ]

    name = models.CharField(max_length=160, unique=True)
    description = models.TextField(blank=True)
    target_stack = models.CharField(
        max_length=20,
        choices=TARGET_STACK_CHOICES,
        default="polyglot",
    )
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    rule_manifest = models.JSONField(default=dict, blank=True)
    ai_manifest = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="created_standard_profiles",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "name"]
        verbose_name = "Standard Profile"
        verbose_name_plural = "Standard Profiles"

    def __str__(self):
        return self.name


class StandardRule(models.Model):
    CATEGORY_CHOICES = [
        ("structure", "Structure"),
        ("naming", "Naming"),
        ("style", "Style"),
        ("testing", "Testing"),
        ("security", "Security"),
        ("complexity", "Complexity"),
        ("ai", "AI"),
    ]
    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    profile = models.ForeignKey(
        StandardProfile,
        on_delete=models.CASCADE,
        related_name="rules",
    )
    code = models.SlugField(max_length=80)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default="style",
    )
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default="medium",
    )
    weight = models.PositiveIntegerField(default=5)
    is_enabled = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "title", "id"]
        verbose_name = "Standard Rule"
        verbose_name_plural = "Standard Rules"
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "code"],
                name="unique_standard_rule_code_per_profile",
            )
        ]

    def __str__(self):
        return f"{self.profile.name} - {self.title}"


class GithubAccount(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="github_accounts",
    )
    github_user_id = models.BigIntegerField(null=True, blank=True)
    github_username = models.CharField(max_length=120)
    account_type = models.CharField(max_length=40, blank=True)
    access_token = models.CharField(max_length=255)
    token_last_four = models.CharField(max_length=4, blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)
    profile_url = models.URLField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-last_synced_at", "-connected_at"]
        verbose_name = "GitHub Account"
        verbose_name_plural = "GitHub Accounts"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "github_username"],
                name="unique_github_username_per_user",
            )
        ]

    def save(self, *args, **kwargs):
        self.token_last_four = (self.access_token or "")[-4:]
        super().save(*args, **kwargs)

    @property
    def masked_token(self):
        if not self.token_last_four:
            return ""
        return f"***{self.token_last_four}"

    def __str__(self):
        return f"{self.user.username} -> {self.github_username}"


class GithubRepository(models.Model):
    VISIBILITY_CHOICES = [
        ("public", "Public"),
        ("private", "Private"),
        ("internal", "Internal"),
    ]

    account = models.ForeignKey(
        GithubAccount,
        on_delete=models.CASCADE,
        related_name="repositories",
    )
    standard_profile = models.ForeignKey(
        StandardProfile,
        on_delete=models.SET_NULL,
        related_name="repositories",
        null=True,
        blank=True,
    )
    external_id = models.BigIntegerField(null=True, blank=True)
    name = models.CharField(max_length=160)
    full_name = models.CharField(max_length=255, unique=True)
    owner_login = models.CharField(max_length=120)
    default_branch = models.CharField(max_length=120, default="main")
    primary_language = models.CharField(max_length=80, blank=True)
    repository_url = models.URLField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    homepage_url = models.URLField(max_length=500, blank=True)
    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default="private",
    )
    is_private = models.BooleanField(default=True)
    is_fork = models.BooleanField(default=False)
    is_organization_repo = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    latest_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    latest_scan_at = models.DateTimeField(null=True, blank=True)
    last_pushed_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "GitHub Repository"
        verbose_name_plural = "GitHub Repositories"

    def __str__(self):
        return self.full_name


class RepositoryScan(models.Model):
    SCAN_TYPE_CHOICES = [
        ("manual", "Manual"),
        ("scheduled", "Scheduled"),
        ("ai_validation", "AI Validation"),
    ]
    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    repository = models.ForeignKey(
        GithubRepository,
        on_delete=models.CASCADE,
        related_name="scans",
    )
    standard_profile = models.ForeignKey(
        StandardProfile,
        on_delete=models.SET_NULL,
        related_name="scans",
        null=True,
        blank=True,
    )
    triggered_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="repository_scans",
        null=True,
        blank=True,
    )
    scan_type = models.CharField(
        max_length=20,
        choices=SCAN_TYPE_CHOICES,
        default="manual",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="queued",
    )
    branch_name = models.CharField(max_length=120, blank=True)
    commit_sha = models.CharField(max_length=120, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    summary = models.JSONField(default=dict, blank=True)
    file_count = models.PositiveIntegerField(default=0)
    violation_count = models.PositiveIntegerField(default=0)
    developer_count = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Repository Scan"
        verbose_name_plural = "Repository Scans"

    def __str__(self):
        return f"{self.repository.full_name} - {self.created_at:%Y-%m-%d %H:%M}"


class CodeViolation(models.Model):
    scan = models.ForeignKey(
        RepositoryScan,
        on_delete=models.CASCADE,
        related_name="violations",
    )
    repository = models.ForeignKey(
        GithubRepository,
        on_delete=models.CASCADE,
        related_name="violations",
    )
    rule = models.ForeignKey(
        StandardRule,
        on_delete=models.SET_NULL,
        related_name="violations",
        null=True,
        blank=True,
    )
    severity = models.CharField(
        max_length=20,
        choices=StandardRule.SEVERITY_CHOICES,
        default="medium",
    )
    code = models.CharField(max_length=80, blank=True)
    title = models.CharField(max_length=160)
    file_path = models.CharField(max_length=500, blank=True)
    line_number = models.PositiveIntegerField(null=True, blank=True)
    message = models.TextField()
    author_login = models.CharField(max_length=120, blank=True)
    commit_sha = models.CharField(max_length=120, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "file_path", "line_number"]
        verbose_name = "Code Violation"
        verbose_name_plural = "Code Violations"

    def __str__(self):
        location = self.file_path or "repository"
        return f"{self.code or 'violation'} @ {location}"


class DeveloperRepositoryScore(models.Model):
    scan = models.ForeignKey(
        RepositoryScan,
        on_delete=models.CASCADE,
        related_name="developer_scores",
    )
    repository = models.ForeignKey(
        GithubRepository,
        on_delete=models.CASCADE,
        related_name="developer_scores",
    )
    github_login = models.CharField(max_length=120, blank=True)
    display_name = models.CharField(max_length=160, blank=True)
    commit_count = models.PositiveIntegerField(default=0)
    files_touched = models.PositiveIntegerField(default=0)
    violation_count = models.PositiveIntegerField(default=0)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    summary = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["score", "github_login"]
        verbose_name = "Developer Repository Score"
        verbose_name_plural = "Developer Repository Scores"

    def __str__(self):
        return self.display_name or self.github_login or "Unknown Developer"


class GithubCommitActivity(models.Model):
    repository = models.ForeignKey(
        GithubRepository,
        on_delete=models.CASCADE,
        related_name="commit_activities",
    )
    scan = models.ForeignKey(
        RepositoryScan,
        on_delete=models.SET_NULL,
        related_name="commit_activities",
        null=True,
        blank=True,
    )
    sha = models.CharField(max_length=120)
    author_login = models.CharField(max_length=120, blank=True)
    author_name = models.CharField(max_length=160, blank=True)
    message_title = models.CharField(max_length=255, blank=True)
    message_body = models.TextField(blank=True)
    quality_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    quality_flags = models.JSONField(default=list, blank=True)
    additions = models.PositiveIntegerField(default=0)
    deletions = models.PositiveIntegerField(default=0)
    changed_files_count = models.PositiveIntegerField(default=0)
    commit_url = models.URLField(max_length=500, blank=True)
    committed_at = models.DateTimeField(null=True, blank=True)
    is_merge_commit = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-committed_at", "-created_at"]
        verbose_name = "GitHub Commit Activity"
        verbose_name_plural = "GitHub Commit Activities"
        constraints = [
            models.UniqueConstraint(
                fields=["repository", "sha"],
                name="unique_commit_sha_per_repository",
            )
        ]

    def __str__(self):
        return f"{self.repository.full_name} @ {self.sha[:7]}"


class GithubPullRequestActivity(models.Model):
    repository = models.ForeignKey(
        GithubRepository,
        on_delete=models.CASCADE,
        related_name="pull_request_activities",
    )
    author_login = models.CharField(max_length=120, blank=True)
    author_name = models.CharField(max_length=160, blank=True)
    pull_number = models.PositiveIntegerField()
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    state = models.CharField(max_length=30, default="open")
    is_draft = models.BooleanField(default=False)
    is_merged = models.BooleanField(default=False)
    quality_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    quality_flags = models.JSONField(default=list, blank=True)
    additions = models.PositiveIntegerField(default=0)
    deletions = models.PositiveIntegerField(default=0)
    changed_files_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)
    review_comments_count = models.PositiveIntegerField(default=0)
    commit_count = models.PositiveIntegerField(default=0)
    html_url = models.URLField(max_length=500, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    merged_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-opened_at", "-last_synced_at"]
        verbose_name = "GitHub Pull Request Activity"
        verbose_name_plural = "GitHub Pull Request Activities"
        constraints = [
            models.UniqueConstraint(
                fields=["repository", "pull_number"],
                name="unique_pull_number_per_repository",
            )
        ]

    def __str__(self):
        return f"{self.repository.full_name} PR #{self.pull_number}"


class AICodeRequest(models.Model):
    VALIDATION_STATUS_CHOICES = [
        ("draft", "Draft"),
        ("validated", "Validated"),
        ("needs_changes", "Needs Changes"),
        ("failed", "Failed"),
    ]

    repository = models.ForeignKey(
        GithubRepository,
        on_delete=models.SET_NULL,
        related_name="ai_requests",
        null=True,
        blank=True,
    )
    standard_profile = models.ForeignKey(
        StandardProfile,
        on_delete=models.SET_NULL,
        related_name="ai_requests",
        null=True,
        blank=True,
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="ai_code_requests",
    )
    provider_name = models.CharField(max_length=80, blank=True)
    model_name = models.CharField(max_length=120, blank=True)
    task_summary = models.TextField(blank=True)
    prompt = models.TextField(blank=True)
    prepared_prompt = models.TextField(blank=True)
    output_payload = models.JSONField(default=dict, blank=True)
    validation_status = models.CharField(
        max_length=20,
        choices=VALIDATION_STATUS_CHOICES,
        default="draft",
    )
    validation_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    validation_summary = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        verbose_name = "AI Code Request"
        verbose_name_plural = "AI Code Requests"

    def __str__(self):
        repository_name = self.repository.full_name if self.repository else "Manual"
        return f"{repository_name} - {self.provider_name or 'AI'}"


class AICodeValidationResult(models.Model):
    request = models.ForeignKey(
        AICodeRequest,
        on_delete=models.CASCADE,
        related_name="validation_results",
    )
    status = models.CharField(
        max_length=20,
        choices=AICodeRequest.VALIDATION_STATUS_CHOICES,
        default="draft",
    )
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    violation_count = models.PositiveIntegerField(default=0)
    summary = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "AI Code Validation Result"
        verbose_name_plural = "AI Code Validation Results"

    def __str__(self):
        return f"{self.request_id} - {self.status}"
