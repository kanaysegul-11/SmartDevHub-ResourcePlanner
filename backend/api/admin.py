from django.contrib import admin
from .models import EmploymentStatus,UserProfile

@admin.register(EmploymentStatus)
class EmploymentStatusAdmin(admin.ModelAdmin):
    # Admin panelinde görünecek sütunlar 
    list_display = ('employee_name', 'position', 'status_type', 'last_updated')
    # Tıklanıp düzenlenebilecek alanlar
    list_editable = ('status_type', 'position')
    # Arama yapılabilecek alanlar
    search_fields = ('employee_name',)
    # Sağ taraftaki filtre paneli
    list_filter = ('status_type',)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user','profile_photo')
    search_fields = ('user__username',)