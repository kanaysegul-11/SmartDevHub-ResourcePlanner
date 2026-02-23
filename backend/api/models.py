from django.db import models
from django.contrib.auth.models import User

#Kod Parçacıkları modeli
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
    usage_count = models.PositiveIntegerField(default=0) # Her kopyalandığında veya bakıldığında +1
    happiness_score = models.IntegerField(default=100) # 0-100 arası puan

    def __str__(self):
        return self.title
#Yorum ve Deneyim
class Comment(models.Model):
    snippet = models.ForeignKey(Snippet, related_name='comments', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    experience_raiting = models.IntegerField(default=5 , help_text="1-5 arasında bir puan veriniz.")
    created_at = models.DateTimeField(auto_now_add=True)

#Çalışan Durumu
class EmploymentStatus(models.Model):
    STATUS_CHOICES = [
        ('available', 'Müsait'),
        ('busy', 'Meşgul'),
        ('meeting', 'Toplantıda'),
        ('out_of_office', 'Ofis Dışında'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='status')
    current_work = models.CharField(max_length=255, blank=True, help_text="Anlık ne ile meşgulsünüz?")
    status_type = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.status_type}"