from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.validators import MaxValueValidator, MinValueValidator



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
