from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_photo = models.FileField(upload_to='profile_photos/', blank=True, null=True)

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
        ('python','Python'),
        ('javascript','JavaScript'),
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
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='snippets', null=True, blank=True)

    def __str__(self):
        return self.title

# Yorum Modeli
class Comment(models.Model):
    snippet = models.ForeignKey(Snippet, related_name='comments', on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.CASCADE) # İsmi 'author' olarak sabitledik
    text = models.TextField() # İsmi 'text' olarak sabitledik
    experience_rating = models.IntegerField(default=5, help_text="1-5 arasında bir puan veriniz.")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.author.username} - {self.snippet.title}"

# Çalışan Durumu Modeli
class EmploymentStatus(models.Model):
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