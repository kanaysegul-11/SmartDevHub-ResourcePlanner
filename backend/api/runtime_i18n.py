RUNTIME_TEXT = {
    "en": {
        "user_fallback": "User",
        "independent_task": "Independent task",
        "code_snippet": "Code snippet",
        "administrator_role": "Administrator",
        "admin_support_tracking": "Following support requests.",
        "task_completed_title": "Task completed",
        "task_completed_body": "{actor_name} completed {task_title} in {project_name}.",
        "comment_title": "{actor_name} commented on your snippet",
        "comment_body": "There is a new comment for {snippet_title}.",
        "message_title": "You have a message from {actor_name}",
        "message_body": "{actor_name} sent you a message.",
        "project_added_title": "You were added to a project",
        "project_added_body": "You were added to the {project_name} project.",
        "project_updated_title": "Project details were updated",
        "project_updated_body": "There is a new update for the {project_name} project.",
        "task_assigned_title": "You were assigned a new task",
        "task_assigned_body": "The {task_title} task was assigned to you.",
        "task_reassigned_title": "A task was assigned to you",
        "task_reassigned_body": "The {task_title} task was assigned to you.",
        "dashboard_unassigned": "Unassigned",
        "dashboard_no_project": "No project linked",
        "dashboard_internal_project": "Internal project",
        "dashboard_team_member": "Team member",
        "dashboard_message_meta": "Team message sent",
        "dashboard_code_label": "Code",
        "dashboard_busy": "Busy",
        "dashboard_available": "Available",
        "dashboard_task_meta": "{project_name} - Assignee: {assignee_name}",
        "dashboard_project_meta": "{client_name} - {team_member_count}",
    },
    "tr": {
        "user_fallback": "Kullanıcı",
        "independent_task": "Bağımsız görev",
        "code_snippet": "Kod parçası",
        "administrator_role": "Administrator",
        "admin_support_tracking": "Yönetici destek taleplerini takip ediyor.",
        "task_completed_title": "Görev tamamlandı",
        "task_completed_body": "{actor_name}, {project_name} içindeki {task_title} görevini tamamladı.",
        "comment_title": "{actor_name} kod parçana yorum yaptı",
        "comment_body": "{snippet_title} için yeni bir yorum var.",
        "message_title": "{actor_name} adlı kullanıcıdan mesajınız var",
        "message_body": "{actor_name} size bir mesaj gönderdi.",
        "project_added_title": "Yeni projeye eklendiniz",
        "project_added_body": "{project_name} projesine dahil edildiniz.",
        "project_updated_title": "Proje bilgisi güncellendi",
        "project_updated_body": "{project_name} projesiyle ilgili yeni bir güncelleme var.",
        "task_assigned_title": "Size yeni görev atandı",
        "task_assigned_body": "{task_title} görevi size atandı.",
        "task_reassigned_title": "Size görev atandı",
        "task_reassigned_body": "{task_title} görevi size atandı.",
        "dashboard_unassigned": "Atanmadı",
        "dashboard_no_project": "Proje bağlanmadı",
        "dashboard_internal_project": "İç proje",
        "dashboard_team_member": "Ekip üyesi",
        "dashboard_message_meta": "Takım mesajı gönderildi",
        "dashboard_code_label": "Kod",
        "dashboard_busy": "Meşgul",
        "dashboard_available": "Müsait",
        "dashboard_task_meta": "{project_name} - Atanan: {assignee_name}",
        "dashboard_project_meta": "{client_name} - {team_member_count}",
    },
}


def get_runtime_language(user):
    language = getattr(getattr(user, "profile", None), "language", "en")
    return "tr" if language == "tr" else "en"


def runtime_text(user, key, **kwargs):
    language = get_runtime_language(user)
    template = RUNTIME_TEXT.get(language, RUNTIME_TEXT["en"]).get(
        key, RUNTIME_TEXT["en"][key]
    )
    return template.format(**kwargs)


def format_team_member_count(user, count):
    language = get_runtime_language(user)
    if language == "tr":
        return f"{count} ekip üyesi"
    suffix = "team member" if count == 1 else "team members"
    return f"{count} {suffix}"
