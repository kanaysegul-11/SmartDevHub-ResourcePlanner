import csv
import tempfile
from datetime import timedelta
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management import call_command
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Comment,
    EmploymentStatus,
    Project,
    Snippet,
    Task,
    TeamMessage,
    UserNotification,
    UserProfile,
    SoftwareAsset,
    SoftwareAssetAssignment,
    SoftwareAssetAuditLog,
    SoftwareAssetSyncLog,
    LicenseRequest,
)
from .software_asset_live_csv import (
    export_live_license_csvs_for_users,
    sync_live_license_csv_directory,
)


class ApiBehaviorTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="member",
            password="strong-pass-123",
            email="member@example.com",
        )
        self.client.force_authenticate(user=self.user)

    def test_admin_contacts_returns_existing_status_records_without_creating_new_rows(self):
        admin_user = User.objects.create_user(
            username="admin",
            password="strong-pass-123",
            email="admin@example.com",
            is_staff=True,
        )
        admin_status = EmploymentStatus.objects.create(
            user=admin_user,
            employee_name="Admin User",
            position="Administrator",
            current_work="Destek taleplerini takip ediyor.",
            status_type="available",
        )
        before_count = EmploymentStatus.objects.count()

        response = self.client.get("/api/admin-contacts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], admin_status.id)
        self.assertEqual(response.data[0]["user_details"]["id"], admin_user.id)
        self.assertEqual(EmploymentStatus.objects.count(), before_count)

    def test_admin_contacts_does_not_recreate_missing_status_rows(self):
        admin_user = User.objects.create_user(
            username="admin-without-status",
            password="strong-pass-123",
            email="admin-without-status@example.com",
            is_staff=True,
        )

        response = self.client.get("/api/admin-contacts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
        self.assertFalse(EmploymentStatus.objects.filter(user=admin_user).exists())

    def test_non_author_cannot_delete_foreign_snippet(self):
        other_user = User.objects.create_user(
            username="snippet-owner",
            password="strong-pass-123",
            email="snippet-owner@example.com",
        )
        snippet = Snippet.objects.create(
            title="Shared utility",
            description="Library helper",
            code="print('hello')",
            language="python",
            author=other_user,
        )

        response = self.client.delete(f"/api/snippets/{snippet.id}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Snippet.objects.filter(id=snippet.id).exists())

    def test_snippet_create_normalizes_broken_turkish_dotted_i(self):
        response = self.client.post(
            "/api/snippets/",
            {
                "title": "Backend ?şlem Log Stilleri",
                "description": "Satır ?çi etiket kullanımı için örnek.",
                "code": "print('normalized')",
                "language": "python",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Backend İşlem Log Stilleri")
        self.assertEqual(response.data["description"], "Satır İçi etiket kullanımı için örnek.")

        snippet = Snippet.objects.get(id=response.data["id"])
        self.assertEqual(snippet.title, "Backend İşlem Log Stilleri")
        self.assertEqual(snippet.description, "Satır İçi etiket kullanımı için örnek.")

    def test_non_author_cannot_update_foreign_comment(self):
        other_user = User.objects.create_user(
            username="comment-owner",
            password="strong-pass-123",
            email="comment-owner@example.com",
        )
        snippet = Snippet.objects.create(
            title="Portal helper",
            description="Reusable note",
            code="const value = 1;",
            language="javascript",
            author=self.user,
        )
        comment = Comment.objects.create(
            snippet=snippet,
            author=other_user,
            text="Original feedback",
            experience_rating=4,
        )

        response = self.client.patch(
            f"/api/comments/{comment.id}/",
            {"text": "Blocked change"},
            format="json",
        )

        comment.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(comment.text, "Original feedback")

    def test_admin_can_update_foreign_comment(self):
        admin_user = User.objects.create_user(
            username="comment-admin",
            password="strong-pass-123",
            email="comment-admin@example.com",
            is_staff=True,
        )
        other_user = User.objects.create_user(
            username="comment-owner-admin-update",
            password="strong-pass-123",
            email="comment-owner-admin-update@example.com",
        )
        snippet = Snippet.objects.create(
            title="Portal helper",
            description="Reusable note",
            code="const value = 1;",
            language="javascript",
            author=self.user,
        )
        comment = Comment.objects.create(
            snippet=snippet,
            author=other_user,
            text="Original feedback",
            experience_rating=4,
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.patch(
            f"/api/comments/{comment.id}/",
            {"text": "Admin updated feedback"},
            format="json",
        )

        comment.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(comment.text, "Admin updated feedback")

    def test_author_can_update_own_comment(self):
        snippet = Snippet.objects.create(
            title="Portal helper",
            description="Reusable note",
            code="const value = 1;",
            language="javascript",
            author=self.user,
        )
        comment = Comment.objects.create(
            snippet=snippet,
            author=self.user,
            text="Original feedback",
            experience_rating=4,
        )

        response = self.client.patch(
            f"/api/comments/{comment.id}/",
            {"text": "Updated feedback", "experience_rating": 2},
            format="json",
        )

        comment.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(comment.text, "Updated feedback")
        self.assertEqual(comment.experience_rating, 2)

    def test_author_can_delete_own_comment(self):
        snippet = Snippet.objects.create(
            title="Portal helper",
            description="Reusable note",
            code="const value = 1;",
            language="javascript",
            author=self.user,
        )
        comment = Comment.objects.create(
            snippet=snippet,
            author=self.user,
            text="Original feedback",
            experience_rating=4,
        )

        response = self.client.delete(f"/api/comments/{comment.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Comment.objects.filter(id=comment.id).exists())

    def test_admin_can_delete_foreign_comment(self):
        admin_user = User.objects.create_user(
            username="comment-admin-delete",
            password="strong-pass-123",
            email="comment-admin-delete@example.com",
            is_staff=True,
        )
        other_user = User.objects.create_user(
            username="comment-owner-admin-delete",
            password="strong-pass-123",
            email="comment-owner-admin-delete@example.com",
        )
        snippet = Snippet.objects.create(
            title="Portal helper",
            description="Reusable note",
            code="const value = 1;",
            language="javascript",
            author=self.user,
        )
        comment = Comment.objects.create(
            snippet=snippet,
            author=other_user,
            text="Original feedback",
            experience_rating=4,
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.delete(f"/api/comments/{comment.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Comment.objects.filter(id=comment.id).exists())

    def test_commenting_on_foreign_snippet_creates_notification_for_owner(self):
        self.user.first_name = "Kaan"
        self.user.last_name = "Yildiz"
        self.user.save(update_fields=["first_name", "last_name"])
        snippet_owner = User.objects.create_user(
            username="snippet-owner",
            password="strong-pass-123",
            email="snippet-owner@example.com",
        )
        snippet = Snippet.objects.create(
            title="Shared utility",
            description="Library helper",
            code="print('shared')",
            language="python",
            author=snippet_owner,
        )

        response = self.client.post(
            "/api/comments/",
            {
                "snippet": snippet.id,
                "text": "Looks reusable",
                "experience_rating": 4,
            },
            format="json",
        )

        notification = UserNotification.objects.filter(
            recipient=snippet_owner,
            actor=self.user,
            type="comment",
        ).first()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(notification)
        self.assertIn("Kaan Yildiz", notification.title)
        self.assertIn(snippet.title, notification.body)
        self.assertEqual(notification.link, f"/snippets/{snippet.id}")

    def test_comment_creation_requires_rating(self):
        snippet = Snippet.objects.create(
            title="Shared utility",
            description="Library helper",
            code="print('shared')",
            language="python",
            author=self.user,
        )

        response = self.client.post(
            "/api/comments/",
            {
                "snippet": snippet.id,
                "text": "Missing score",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("experience_rating", response.data)
        self.assertFalse(Comment.objects.filter(snippet=snippet, text="Missing score").exists())

    def test_commenting_on_own_snippet_does_not_create_notification(self):
        snippet = Snippet.objects.create(
            title="Self note",
            description="Owned by current user",
            code="print('self')",
            language="python",
            author=self.user,
        )

        response = self.client.post(
            "/api/comments/",
            {
                "snippet": snippet.id,
                "text": "My own note",
                "experience_rating": 5,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(
            UserNotification.objects.filter(
                recipient=self.user,
                actor=self.user,
                type="comment",
            ).exists()
        )

    def test_deleting_user_preserves_snippets_and_comments(self):
        author = User.objects.create_user(
            username="library-owner",
            password="strong-pass-123",
            email="library-owner@example.com",
        )
        snippet = Snippet.objects.create(
            title="Reusable card",
            description="UI snippet",
            code="export const Card = () => null;",
            language="react/js",
            author=author,
        )
        comment = Comment.objects.create(
            snippet=snippet,
            author=author,
            text="Looks solid",
            experience_rating=5,
        )

        author.delete()
        snippet.refresh_from_db()
        comment.refresh_from_db()

        self.assertIsNone(snippet.author)
        self.assertIsNone(comment.author)

    def test_non_admin_task_patch_only_updates_allowed_fields(self):
        task = Task.objects.create(
            title="Original title",
            description="Original description",
            assignee=self.user,
            status="todo",
            priority="medium",
        )

        response = self.client.patch(
            f"/api/tasks/{task.id}/",
            {
                "title": "Blocked change",
                "status": "done",
                "actual_hours": 6,
            },
            format="json",
        )

        task.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(task.title, "Original title")
        self.assertEqual(task.status, "done")
        self.assertEqual(task.actual_hours, 6)

    def test_update_profile_saves_language_preference(self):
        response = self.client.patch(
            "/api/update-profile/",
            {"language": "tr"},
            format="json",
        )

        profile = UserProfile.objects.get(user=self.user)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.language, "tr")
        self.assertEqual(response.data["language"], "tr")

    def test_dashboard_activity_uses_english_runtime_labels_for_english_profile(self):
        EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            current_work="",
            status_type="available",
        )
        project = Project.objects.create(
            name="Portal Refresh",
            summary="First project",
            status="active",
        )
        project.team_members.add(self.user.employment_status)
        task = Task.objects.create(
            title="Landing page polish",
            project=project,
            assignee=self.user,
            status="in_progress",
        )

        response = self.client.get("/api/dashboard-activity/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task_item = next(item for item in response.data if item["id"] == f"task-{task.id}")
        project_item = next(
            item for item in response.data if item["id"] == f"project-{project.id}"
        )
        status_item = next(
            item
            for item in response.data
            if item["id"] == f"status-{self.user.employment_status.id}"
        )

        self.assertEqual(task_item["meta"], "Portal Refresh - Assignee: Member User")
        self.assertEqual(project_item["meta"], "Internal project - 1 team member")
        self.assertEqual(status_item["meta"], "Available")

    def test_status_endpoint_clears_project_count_when_only_completed_tasks_remain(self):
        employment_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            current_work="Tüm görevlerini tamamladı.",
            status_type="busy",
        )
        first_project = Project.objects.create(
            name="Portal Refresh",
            summary="First project",
            status="active",
        )
        second_project = Project.objects.create(
            name="Mobile API",
            summary="Second project",
            status="planning",
        )
        first_project.team_members.add(employment_status)
        second_project.team_members.add(employment_status)

        Task.objects.create(
            title="Landing page polish",
            project=first_project,
            assignee=self.user,
            status="done",
        )
        Task.objects.create(
            title="API cleanup",
            project=second_project,
            assignee=self.user,
            status="done",
        )

        response = self.client.get("/api/status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["effective_status"], "available")
        self.assertEqual(response.data[0]["active_project_count"], 0)
        self.assertEqual(response.data[0]["active_task_project_name"], "")
        self.assertTrue(first_project.team_members.filter(id=employment_status.id).exists())
        self.assertTrue(second_project.team_members.filter(id=employment_status.id).exists())

    def test_status_endpoint_counts_active_project_membership_without_project_task(self):
        employment_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            current_work="Projeye atandi ama gorevi bagimsiz ilerliyor.",
            status_type="busy",
        )
        project = Project.objects.create(
            name="Egitim Teknolojileri",
            summary="Takim atamasi gorevden bagimsiz tutulabilir.",
            status="planning",
            end_date=timezone.localdate() + timedelta(days=30),
        )
        project.team_members.add(employment_status)
        Task.objects.create(
            title="React + Vite arayuzu",
            assignee=self.user,
            status="todo",
        )

        response = self.client.get("/api/status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["effective_status"], "busy")
        self.assertEqual(response.data[0]["active_project_count"], 1)
        self.assertEqual(response.data[0]["active_task_project_name"], "")

    def test_admin_task_creation_adds_persistent_membership_and_counts_distinct_active_projects(self):
        admin_user = User.objects.create_user(
            username="admin",
            password="strong-pass-123",
            email="admin@example.com",
            is_staff=True,
        )
        employment_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            current_work="Birden fazla projede gorev aliyor.",
            status_type="busy",
        )
        first_project = Project.objects.create(
            name="Portal Refresh",
            summary="First project",
            status="active",
        )
        second_project = Project.objects.create(
            name="Mobile API",
            summary="Second project",
            status="active",
        )

        self.client.force_authenticate(user=admin_user)

        create_task = lambda payload: self.client.post("/api/tasks/", payload, format="json")

        first_response = create_task(
            {
                "title": "Landing page polish",
                "project": first_project.id,
                "assignee": self.user.id,
                "status": "todo",
            }
        )
        second_response = create_task(
            {
                "title": "Portal API cleanup",
                "project": first_project.id,
                "assignee": self.user.id,
                "status": "in_progress",
            }
        )
        third_response = create_task(
            {
                "title": "Mobile endpoint review",
                "project": second_project.id,
                "assignee": self.user.id,
                "status": "review",
            }
        )

        first_project.refresh_from_db()
        second_project.refresh_from_db()

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(third_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(first_project.team_members.filter(id=employment_status.id).exists())
        self.assertTrue(second_project.team_members.filter(id=employment_status.id).exists())
        self.assertEqual(first_project.team_members.filter(id=employment_status.id).count(), 1)

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["active_project_count"], 2)
        self.assertEqual(response.data[0]["effective_status"], "busy")

    def test_projects_endpoint_includes_task_assignees_in_persistent_member_history(self):
        employment_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            current_work="Tamamlanan projelerde de gorunmeli.",
            status_type="available",
        )
        project = Project.objects.create(
            name="Legacy Project",
            summary="Existing history should stay visible",
            status="completed",
            progress=100,
        )
        Task.objects.create(
            title="Archived delivery",
            project=project,
            assignee=self.user,
            status="done",
        )

        response = self.client.get("/api/projects/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertIn(employment_status.id, response.data[0]["team_members"])
        self.assertEqual(len(response.data[0]["team_member_details"]), 1)
        self.assertEqual(response.data[0]["team_member_details"][0]["id"], employment_status.id)

    def test_projects_endpoint_marks_due_fully_completed_project_as_completed_archive(self):
        today = timezone.localdate()
        project = Project.objects.create(
            name="Delivery Archive",
            summary="Should move to completed archive.",
            status="active",
            end_date=today,
        )
        Task.objects.create(
            title="Final QA",
            project=project,
            assignee=self.user,
            status="done",
        )

        response = self.client.get("/api/projects/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["status"], "active")
        self.assertEqual(response.data[0]["effective_status"], "completed")
        self.assertTrue(response.data[0]["is_completed_archive"])
        self.assertEqual(response.data[0]["total_task_count"], 1)
        self.assertEqual(response.data[0]["completed_task_count"], 1)

    def test_projects_endpoint_keeps_future_due_completed_work_out_of_archive_until_delivery_date(self):
        future_date = timezone.localdate() + timedelta(days=1)
        project = Project.objects.create(
            name="Awaiting Delivery Date",
            summary="Done work should stay active until delivery day.",
            status="active",
            end_date=future_date,
        )
        Task.objects.create(
            title="Implementation done",
            project=project,
            assignee=self.user,
            status="done",
        )

        response = self.client.get("/api/projects/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["effective_status"], "active")
        self.assertFalse(response.data[0]["is_completed_archive"])
        self.assertEqual(response.data[0]["total_task_count"], 1)
        self.assertEqual(response.data[0]["completed_task_count"], 1)

    def test_non_admin_marking_task_done_keeps_project_history_and_notifies_admin(self):
        admin_user = User.objects.create_user(
            username="admin",
            password="strong-pass-123",
            email="admin@example.com",
            is_staff=True,
        )
        employment_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            current_work="Gorev uzerinde calisiyor.",
            status_type="busy",
        )
        project = Project.objects.create(
            name="Portal Refresh",
            summary="First project",
            status="active",
        )
        project.team_members.add(employment_status)
        task = Task.objects.create(
            title="Landing page polish",
            project=project,
            assignee=self.user,
            created_by=admin_user,
            status="in_progress",
        )

        response = self.client.patch(
            f"/api/tasks/{task.id}/",
            {"status": "done"},
            format="json",
        )

        project.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(project.team_members.filter(id=employment_status.id).exists())

        status_response = self.client.get("/api/status/")
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertEqual(status_response.data[0]["active_project_count"], 0)
        self.assertEqual(status_response.data[0]["effective_status"], "available")

        notification = UserNotification.objects.filter(
            recipient=admin_user,
            actor=self.user,
            type="task",
            title="Task completed",
        ).first()

        self.assertIsNotNone(notification)
        self.assertIn("Landing page polish", notification.body)

    def test_non_admin_marking_task_done_keeps_active_project_count_for_same_project(self):
        employment_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            current_work="Birden fazla gorev uzerinde calisiyor.",
            status_type="busy",
        )
        project = Project.objects.create(
            name="Portal Refresh",
            summary="First project",
            status="active",
        )
        project.team_members.add(employment_status)
        task = Task.objects.create(
            title="Landing page polish",
            project=project,
            assignee=self.user,
            status="in_progress",
        )
        Task.objects.create(
            title="API cleanup",
            project=project,
            assignee=self.user,
            status="todo",
        )

        response = self.client.patch(
            f"/api/tasks/{task.id}/",
            {"status": "done"},
            format="json",
        )

        project.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(project.team_members.filter(id=employment_status.id).exists())

        status_response = self.client.get("/api/status/")
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertEqual(status_response.data[0]["active_project_count"], 1)

    def test_sender_can_edit_own_team_message(self):
        other_user = User.objects.create_user(
            username="other",
            password="strong-pass-123",
            email="other@example.com",
        )
        recipient_status = EmploymentStatus.objects.create(
            user=other_user,
            employee_name="Other User",
            position="Developer",
            status_type="available",
        )
        message = TeamMessage.objects.create(
            sender=self.user,
            recipient=recipient_status,
            content="Initial content",
        )

        response = self.client.patch(
            f"/api/team-messages/{message.id}/",
            {"content": "Updated content"},
            format="json",
        )

        message.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(message.content, "Updated content")
        self.assertIsNotNone(message.edited_at)

    def test_user_cannot_send_team_message_to_self(self):
        own_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            status_type="available",
        )

        response = self.client.post(
            "/api/team-messages/",
            {"recipient": own_status.id, "content": "Self message"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(TeamMessage.objects.count(), 0)

    def test_sending_team_message_creates_named_notification_for_recipient(self):
        self.user.first_name = "Kaan"
        self.user.last_name = "Yıldız"
        self.user.save(update_fields=["first_name", "last_name"])

        other_user = User.objects.create_user(
            username="other-team-notify",
            password="strong-pass-123",
            email="other-team-notify@example.com",
        )
        recipient_status = EmploymentStatus.objects.create(
            user=other_user,
            employee_name="Other Team Notify",
            position="Developer",
            status_type="available",
        )

        response = self.client.post(
            "/api/team-messages/",
            {"recipient": recipient_status.id, "content": "Merhaba"},
            format="json",
        )

        notification = UserNotification.objects.filter(
            recipient=other_user,
            actor=self.user,
            type="message",
        ).first()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(notification)
        self.assertIn("Kaan Yıldız", notification.title)
        self.assertIn("Kaan Yıldız", notification.body)

    def test_sending_team_message_to_admin_links_notification_to_admin_inbox(self):
        self_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            status_type="available",
        )
        admin_user = User.objects.create_user(
            username="admin-inbox",
            password="strong-pass-123",
            email="admin-inbox@example.com",
            is_staff=True,
        )
        admin_status = EmploymentStatus.objects.create(
            user=admin_user,
            employee_name="Inbox Admin",
            position="Administrator",
            status_type="available",
        )

        response = self.client.post(
            "/api/team-messages/",
            {"recipient": admin_status.id, "content": "Need approval"},
            format="json",
        )

        notification = UserNotification.objects.filter(
            recipient=admin_user,
            actor=self.user,
            type="message",
        ).first()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(notification)
        self.assertEqual(notification.link, f"/administrators?chat={self_status.id}")

    def test_sending_team_message_to_member_keeps_team_chat_link(self):
        self_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            status_type="available",
        )
        other_user = User.objects.create_user(
            username="other-team-link",
            password="strong-pass-123",
            email="other-team-link@example.com",
        )
        recipient_status = EmploymentStatus.objects.create(
            user=other_user,
            employee_name="Other Team Member",
            position="Developer",
            status_type="available",
        )

        response = self.client.post(
            "/api/team-messages/",
            {"recipient": recipient_status.id, "content": "Quick sync"},
            format="json",
        )

        notification = UserNotification.objects.filter(
            recipient=other_user,
            actor=self.user,
            type="message",
        ).first()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(notification)
        self.assertEqual(notification.link, f"/team?chat={self_status.id}")

    def test_recipient_cannot_edit_foreign_team_message(self):
        sender = User.objects.create_user(
            username="sender",
            password="strong-pass-123",
            email="sender@example.com",
        )
        recipient_status = EmploymentStatus.objects.create(
            user=self.user,
            employee_name="Member User",
            position="Developer",
            status_type="available",
        )
        message = TeamMessage.objects.create(
            sender=sender,
            recipient=recipient_status,
            content="Recipient should not edit this",
        )

        response = self.client.patch(
            f"/api/team-messages/{message.id}/",
            {"content": "Blocked update"},
            format="json",
        )

        message.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(message.content, "Recipient should not edit this")

    def test_sender_can_delete_team_message_only_for_self(self):
        other_user = User.objects.create_user(
            username="other-team",
            password="strong-pass-123",
            email="other-team@example.com",
        )
        recipient_status = EmploymentStatus.objects.create(
            user=other_user,
            employee_name="Other Team Member",
            position="Developer",
            status_type="available",
        )
        message = TeamMessage.objects.create(
            sender=self.user,
            recipient=recipient_status,
            content="Delete only for me",
        )

        response = self.client.post(
            f"/api/team-messages/{message.id}/remove/",
            {"scope": "self"},
            format="json",
        )

        message.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(message.deleted_for_sender)
        self.assertFalse(message.deleted_for_everyone)

        sender_history = self.client.get(
            "/api/team-messages/",
            {"conversation_with": recipient_status.id},
        )
        self.assertEqual(sender_history.status_code, status.HTTP_200_OK)
        self.assertEqual(sender_history.data, [])

        self.client.force_authenticate(user=other_user)
        recipient_history = self.client.get("/api/team-messages/")
        self.assertEqual(recipient_history.status_code, status.HTTP_200_OK)
        self.assertEqual(len(recipient_history.data), 1)

    def test_sender_can_delete_team_message_for_everyone_but_recipient_cannot(self):
        other_user = User.objects.create_user(
            username="other-team-2",
            password="strong-pass-123",
            email="other-team-2@example.com",
        )
        recipient_status = EmploymentStatus.objects.create(
            user=other_user,
            employee_name="Other Team Member 2",
            position="Developer",
            status_type="available",
        )
        message = TeamMessage.objects.create(
            sender=self.user,
            recipient=recipient_status,
            content="Delete for everyone",
        )

        self.client.force_authenticate(user=other_user)
        forbidden_response = self.client.post(
            f"/api/team-messages/{message.id}/remove/",
            {"scope": "everyone"},
            format="json",
        )
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.user)
        delete_response = self.client.post(
            f"/api/team-messages/{message.id}/remove/",
            {"scope": "everyone"},
            format="json",
        )

        message.refresh_from_db()

        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(message.deleted_for_everyone)

        sender_history = self.client.get(
            "/api/team-messages/",
            {"conversation_with": recipient_status.id},
        )
        self.assertEqual(sender_history.status_code, status.HTTP_200_OK)
        self.assertEqual(sender_history.data, [])

        self.client.force_authenticate(user=other_user)
        recipient_history = self.client.get("/api/team-messages/")
        self.assertEqual(recipient_history.status_code, status.HTTP_200_OK)
        self.assertEqual(recipient_history.data, [])

    def test_user_can_delete_only_own_notification(self):
        other_user = User.objects.create_user(
            username="other",
            password="strong-pass-123",
            email="other@example.com",
        )
        own_notification = UserNotification.objects.create(
            recipient=self.user,
            title="Own notification",
            body="Can be deleted",
            type="system",
        )
        other_notification = UserNotification.objects.create(
            recipient=other_user,
            title="Other notification",
            body="Should remain",
            type="system",
        )

        response = self.client.delete(f"/api/notifications/{own_notification.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserNotification.objects.filter(id=own_notification.id).exists())
        self.assertTrue(UserNotification.objects.filter(id=other_notification.id).exists())

    def test_user_can_clear_all_own_notifications(self):
        other_user = User.objects.create_user(
            username="other2",
            password="strong-pass-123",
            email="other2@example.com",
        )
        UserNotification.objects.create(
            recipient=self.user,
            title="First notification",
            body="Will be deleted",
            type="task",
        )
        UserNotification.objects.create(
            recipient=self.user,
            title="Second notification",
            body="Will be deleted",
            type="message",
        )
        UserNotification.objects.create(
            recipient=other_user,
            title="Foreign notification",
            body="Should remain",
            type="system",
        )

        response = self.client.delete("/api/notifications/clear-all/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["deleted_count"], 2)
        self.assertEqual(UserNotification.objects.filter(recipient=self.user).count(), 0)
        self.assertEqual(UserNotification.objects.filter(recipient=other_user).count(), 1)

    def test_non_admin_cannot_create_software_asset(self):
        response = self.client.post(
            "/api/software-assets/",
            {
                "name": "Cursor Pro",
                "vendor": "Cursor",
                "license_mode": "assigned",
                "account_email": "member@example.com",
                "billing_email": "member@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(SoftwareAsset.objects.count(), 0)

    def test_admin_can_create_shared_software_asset_with_assignments(self):
        admin_user = User.objects.create_user(
            username="software-admin",
            password="strong-pass-123",
            email="software-admin@example.com",
            is_staff=True,
        )
        assigned_user = User.objects.create_user(
            username="licensed-member",
            password="strong-pass-123",
            email="licensed-member@example.com",
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            "/api/software-assets/",
            {
                "name": "Figma Organization",
                "vendor": "Figma",
                "license_mode": "shared",
                "provider_code": "figma",
                "seats_total": 5,
                "purchase_price": "25.00",
                "billing_cycle": "monthly",
                "shared_user_ids": [assigned_user.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        asset = SoftwareAsset.objects.get(id=response.data["id"])
        assignment = SoftwareAssetAssignment.objects.get(asset=asset, user=assigned_user)
        self.assertEqual(asset.license_mode, "shared")
        self.assertEqual(assignment.access_email, assigned_user.email)
        self.assertEqual(response.data["monthly_cost_estimate"], 125.0)
        self.assertEqual(response.data["annual_cost_estimate"], 1500.0)

    def test_admin_can_create_assigned_software_asset_for_single_user(self):
        admin_user = User.objects.create_user(
            username="software-admin-assigned",
            password="strong-pass-123",
            email="software-admin-assigned@example.com",
            is_staff=True,
        )
        assigned_user = User.objects.create_user(
            username="assigned-designer",
            password="strong-pass-123",
            email="assigned-designer@example.com",
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            "/api/software-assets/",
            {
                "name": "Adobe Photoshop",
                "vendor": "Adobe",
                "license_mode": "assigned",
                "provider_code": "adobe",
                "assigned_user_id": assigned_user.id,
                "account_email": assigned_user.email,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        asset = SoftwareAsset.objects.get(id=response.data["id"])
        assignment = SoftwareAssetAssignment.objects.get(asset=asset, user=assigned_user)
        self.assertEqual(asset.license_mode, "assigned")
        self.assertEqual(asset.seats_total, 1)
        self.assertEqual(assignment.access_email, assigned_user.email)

    def test_non_admin_only_sees_assets_assigned_to_them(self):
        admin_user = User.objects.create_user(
            username="software-admin-view",
            password="strong-pass-123",
            email="software-admin-view@example.com",
            is_staff=True,
        )
        other_user = User.objects.create_user(
            username="other-licensed-member",
            password="strong-pass-123",
            email="other-licensed-member@example.com",
        )
        visible_asset = SoftwareAsset.objects.create(
            name="Notion Plus",
            vendor="Notion",
            license_mode="shared",
            seats_total=3,
            created_by=admin_user,
        )
        hidden_asset = SoftwareAsset.objects.create(
            name="Adobe Illustrator",
            vendor="Adobe",
            license_mode="assigned",
            provider_code="adobe",
            seats_total=1,
            created_by=admin_user,
        )
        SoftwareAssetAssignment.objects.create(asset=visible_asset, user=self.user)
        SoftwareAssetAssignment.objects.create(asset=visible_asset, user=other_user)
        SoftwareAssetAssignment.objects.create(asset=hidden_asset, user=other_user)

        response = self.client.get("/api/software-assets/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], visible_asset.id)
        self.assertEqual(len(response.data[0]["assignments"]), 1)
        self.assertEqual(response.data[0]["assignments"][0]["user"], self.user.id)

    def test_software_asset_summary_reports_costs_alerts_and_requests(self):
        admin_user = User.objects.create_user(
            username="software-summary-admin",
            password="strong-pass-123",
            email="software-summary-admin@example.com",
            is_staff=True,
        )
        expiring_asset = SoftwareAsset.objects.create(
            name="Figma Enterprise",
            vendor="Figma",
            record_type="saas",
            license_mode="shared",
            provider_code="figma",
            seats_total=4,
            purchase_price="120.00",
            billing_cycle="monthly",
            renewal_date=timezone.localdate() + timedelta(days=5),
            created_by=admin_user,
        )
        SoftwareAsset.objects.create(
            name="Cursor Team",
            vendor="Cursor",
            record_type="saas",
            license_mode="assigned",
            provider_code="cursor",
            seats_total=1,
            purchase_price="45.00",
            billing_cycle="monthly",
            sync_status="error",
            sync_error="Provider token expired.",
            created_by=admin_user,
        )
        LicenseRequest.objects.create(
            requester=self.user,
            requested_product="Adobe Creative Cloud",
            provider_code="adobe",
            request_type="new_purchase",
            status="pending",
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/software-assets/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["stats"]["total_records"], 2)
        self.assertEqual(response.data["stats"]["expiring_7_days"], 1)
        self.assertEqual(response.data["request_stats"]["pending"], 1)
        self.assertEqual(response.data["stats"]["monthly_cost_total"], 525.0)
        self.assertEqual(response.data["stats"]["annual_cost_total"], 6300.0)
        alert_kinds = {alert["kind"] for alert in response.data["alerts"]}
        self.assertIn("renewal_due", alert_kinds)
        self.assertIn("sync_error", alert_kinds)
        self.assertEqual(response.data["renewals"]["next_7_days"][0]["id"], expiring_asset.id)

    def test_software_asset_summary_excludes_archived_records_from_totals(self):
        admin_user = User.objects.create_user(
            username="software-summary-archive-admin",
            password="strong-pass-123",
            email="software-summary-archive-admin@example.com",
            is_staff=True,
        )
        visible_asset = SoftwareAsset.objects.create(
            name="Visible License",
            vendor="Adobe",
            record_type="desktop_license",
            license_mode="assigned",
            provider_code="adobe",
            purchase_price="20.00",
            billing_cycle="monthly",
            created_by=admin_user,
        )
        archived_asset = SoftwareAsset.objects.create(
            name="Archived License",
            vendor="Adobe",
            record_type="desktop_license",
            license_mode="assigned",
            provider_code="adobe",
            purchase_price="12.00",
            billing_cycle="monthly",
            operational_status="archived",
            created_by=admin_user,
        )
        SoftwareAssetAssignment.objects.create(asset=visible_asset, user=self.user)
        SoftwareAssetAssignment.objects.create(asset=archived_asset, user=self.user)

        self.client.force_authenticate(user=admin_user)
        response = self.client.get("/api/software-assets/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["stats"]["total_records"], 1)
        self.assertEqual(response.data["stats"]["assigned_records"], 1)
        self.assertEqual(response.data["stats"]["monthly_cost_total"], 20.0)
        self.assertEqual(response.data["stats"]["annual_cost_total"], 240.0)
        self.assertEqual(len(response.data["user_cards"]), 1)
        self.assertEqual(response.data["user_cards"][0]["id"], visible_asset.id)
        self.assertEqual(response.data["provider_spend"][0]["record_count"], 1)

    def test_member_software_asset_list_hides_cost_fields(self):
        admin_user = User.objects.create_user(
            username="software-cost-hidden-admin",
            password="strong-pass-123",
            email="software-cost-hidden-admin@example.com",
            is_staff=True,
        )
        asset = SoftwareAsset.objects.create(
            name="Linear",
            vendor="Linear",
            record_type="saas",
            license_mode="assigned",
            provider_code="manual",
            billing_cycle="monthly",
            purchase_price="18.00",
            created_by=admin_user,
        )
        SoftwareAssetAssignment.objects.create(
            asset=asset,
            user=self.user,
            access_email=self.user.email,
        )

        response = self.client.get("/api/software-assets/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data[0]
        self.assertNotIn("purchase_price", payload)
        self.assertNotIn("monthly_cost_estimate", payload)
        self.assertNotIn("annual_cost_estimate", payload)
        self.assertEqual(payload["billing_cycle"], "monthly")

    def test_member_software_asset_summary_hides_cost_metrics(self):
        admin_user = User.objects.create_user(
            username="software-summary-member-admin",
            password="strong-pass-123",
            email="software-summary-member-admin@example.com",
            is_staff=True,
        )
        asset = SoftwareAsset.objects.create(
            name="Notion Plus",
            vendor="Notion",
            record_type="saas",
            license_mode="assigned",
            provider_code="manual",
            seats_total=4,
            purchase_price="24.00",
            billing_cycle="monthly",
            renewal_date=timezone.localdate() + timedelta(days=4),
            created_by=admin_user,
        )
        SoftwareAssetAssignment.objects.create(
            asset=asset,
            user=self.user,
            access_email=self.user.email,
        )

        response = self.client.get("/api/software-assets/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("monthly_cost_total", response.data["stats"])
        self.assertNotIn("annual_cost_total", response.data["stats"])
        self.assertNotIn("cost_per_used_seat", response.data["stats"])
        self.assertNotIn("paid_unused_records", response.data["stats"])
        self.assertEqual(response.data["provider_spend"], [])
        alert_kinds = {alert["kind"] for alert in response.data["alerts"]}
        self.assertNotIn("paid_unused", alert_kinds)
        self.assertNotIn("low_usage_before_renewal", alert_kinds)

    def test_member_software_asset_list_excludes_archived_records(self):
        admin_user = User.objects.create_user(
            username="software-archived-hidden-admin",
            password="strong-pass-123",
            email="software-archived-hidden-admin@example.com",
            is_staff=True,
        )
        asset = SoftwareAsset.objects.create(
            name="Removed Personal License",
            vendor="Adobe",
            record_type="desktop_license",
            license_mode="assigned",
            provider_code="adobe",
            operational_status="archived",
            created_by=admin_user,
        )
        SoftwareAssetAssignment.objects.create(
            asset=asset,
            user=self.user,
            access_email=self.user.email,
        )

        response = self.client.get("/api/software-assets/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_admin_can_import_software_assets_from_csv_rows(self):
        admin_user = User.objects.create_user(
            username="software-import-admin",
            password="strong-pass-123",
            email="software-import-admin@example.com",
            is_staff=True,
        )
        assigned_user = User.objects.create_user(
            username="software-import-assignee",
            password="strong-pass-123",
            email="software-import-assignee@example.com",
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            "/api/software-assets/import-csv/",
            {
                "rows": [
                    {
                        "name": "GitHub Team",
                        "vendor": "GitHub",
                        "record_type": "team_tool",
                        "license_mode": "shared",
                        "provider_code": "github",
                        "seats_total": 3,
                        "billing_cycle": "monthly",
                        "purchase_price": "30.00",
                        "shared_user_ids": [assigned_user.id],
                    },
                    {
                        "name": "Adobe Illustrator",
                        "vendor": "Adobe",
                        "record_type": "desktop_license",
                        "license_mode": "assigned",
                        "provider_code": "adobe",
                        "billing_cycle": "yearly",
                        "purchase_price": "240.00",
                        "assigned_user_id": assigned_user.id,
                    },
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["created_count"], 2)
        self.assertEqual(response.data["skipped_count"], 0)
        self.assertEqual(SoftwareAsset.objects.count(), 2)
        self.assertEqual(SoftwareAssetAuditLog.objects.filter(event_type="imported").count(), 2)

    def test_admin_import_csv_skips_duplicate_software_assets(self):
        admin_user = User.objects.create_user(
            username="software-import-dedupe-admin",
            password="strong-pass-123",
            email="software-import-dedupe-admin@example.com",
            is_staff=True,
        )
        assigned_user = User.objects.create_user(
            username="software-import-dedupe-user",
            password="strong-pass-123",
            email="software-import-dedupe-user@example.com",
        )
        existing_asset = SoftwareAsset.objects.create(
            name="ChatGPT Plus",
            vendor="OpenAI",
            plan_name="Plus",
            record_type="saas",
            license_mode="assigned",
            provider_code="openai",
            created_by=admin_user,
        )
        SoftwareAssetAssignment.objects.create(
            asset=existing_asset,
            user=assigned_user,
            access_email=assigned_user.email,
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            "/api/software-assets/import-csv/",
            {
                "rows": [
                    {
                        "name": "ChatGPT Plus",
                        "vendor": "OpenAI",
                        "plan_name": "Plus",
                        "record_type": "saas",
                        "license_mode": "assigned",
                        "provider_code": "openai",
                        "billing_cycle": "monthly",
                        "purchase_price": "20.00",
                        "assigned_user_id": assigned_user.id,
                    },
                    {
                        "name": "Cursor Pro",
                        "vendor": "Cursor",
                        "plan_name": "Pro",
                        "record_type": "saas",
                        "license_mode": "assigned",
                        "provider_code": "cursor",
                        "billing_cycle": "monthly",
                        "purchase_price": "20.00",
                        "assigned_user_id": assigned_user.id,
                    },
                    {
                        "name": "Cursor Pro",
                        "vendor": "Cursor",
                        "plan_name": "Pro",
                        "record_type": "saas",
                        "license_mode": "assigned",
                        "provider_code": "cursor",
                        "billing_cycle": "monthly",
                        "purchase_price": "20.00",
                        "assigned_user_id": assigned_user.id,
                    },
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["created_count"], 1)
        self.assertEqual(response.data["skipped_count"], 2)
        self.assertEqual(len(response.data["errors"]), 0)
        self.assertEqual(
            SoftwareAsset.objects.filter(name="Cursor Pro", license_mode="assigned").count(),
            1,
        )
        self.assertEqual(
            SoftwareAssetAuditLog.objects.filter(event_type="imported").count(),
            1,
        )

    def test_admin_can_bulk_assign_shared_assets(self):
        admin_user = User.objects.create_user(
            username="software-bulk-admin",
            password="strong-pass-123",
            email="software-bulk-admin@example.com",
            is_staff=True,
        )
        first_user = User.objects.create_user(
            username="bulk-user-1",
            password="strong-pass-123",
            email="bulk-user-1@example.com",
        )
        second_user = User.objects.create_user(
            username="bulk-user-2",
            password="strong-pass-123",
            email="bulk-user-2@example.com",
        )
        asset = SoftwareAsset.objects.create(
            name="Notion Business",
            vendor="Notion",
            license_mode="shared",
            seats_total=3,
            created_by=admin_user,
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            "/api/software-assets/bulk-assign/",
            {"asset_ids": [asset.id], "user_ids": [first_user.id, second_user.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            asset.assignments.filter(is_active=True).count(),
            2,
        )
        self.assertEqual(len(response.data["errors"]), 0)
        self.assertTrue(
            SoftwareAssetAuditLog.objects.filter(
                asset=asset,
                event_type="assignment_changed",
            ).exists()
        )

    def test_admin_can_bulk_delete_software_assets(self):
        admin_user = User.objects.create_user(
            username="software-bulk-delete-admin",
            password="strong-pass-123",
            email="software-bulk-delete-admin@example.com",
            is_staff=True,
        )
        first_asset = SoftwareAsset.objects.create(
            name="Confluence Standard",
            vendor="Atlassian",
            license_mode="shared",
            seats_total=6,
            created_by=admin_user,
        )
        second_asset = SoftwareAsset.objects.create(
            name="GitHub Copilot",
            vendor="GitHub",
            license_mode="shared",
            seats_total=10,
            created_by=admin_user,
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            "/api/software-assets/bulk-delete/",
            {"asset_ids": [first_asset.id, second_asset.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["deleted_count"], 2)
        self.assertFalse(
            SoftwareAsset.objects.filter(id__in=[first_asset.id, second_asset.id]).exists()
        )
        self.assertEqual(
            SoftwareAssetAuditLog.objects.filter(event_type="deleted").count(),
            2,
        )

    def test_seed_personal_software_assets_assigns_each_user_one_personal_record(self):
        admin_user = User.objects.create_user(
            username="software-seed-admin",
            password="strong-pass-123",
            email="software-seed-admin@example.com",
            is_staff=True,
        )
        other_user = User.objects.create_user(
            username="software-seed-user",
            password="strong-pass-123",
            email="software-seed-user@example.com",
        )

        call_command("seed_personal_software_assets", verbosity=0)

        for user in [self.user, admin_user, other_user]:
            self.assertTrue(
                SoftwareAsset.objects.filter(
                    license_mode="assigned",
                    assignments__user=user,
                    assignments__is_active=True,
                ).exists()
            )

        created_count = SoftwareAsset.objects.filter(
            license_mode="assigned",
            extra_metadata__seed="personal_software_assets",
        ).count()

        call_command("seed_personal_software_assets", verbosity=0)

        self.assertEqual(
            SoftwareAsset.objects.filter(
                license_mode="assigned",
                extra_metadata__seed="personal_software_assets",
            ).count(),
            created_count,
        )

    def test_export_user_license_csvs_creates_one_csv_per_user(self):
        admin_user = User.objects.create_user(
            username="software-export-admin",
            password="strong-pass-123",
            email="software-export-admin@example.com",
            is_staff=True,
        )
        other_user = User.objects.create_user(
            username="software-export-user",
            password="strong-pass-123",
            email="software-export-user@example.com",
        )
        member_asset = SoftwareAsset.objects.create(
            name="Cursor Pro",
            vendor="Cursor",
            plan_name="Pro",
            record_type="saas",
            license_mode="assigned",
            provider_code="cursor",
            created_by=admin_user,
        )
        other_asset = SoftwareAsset.objects.create(
            name="ChatGPT Plus",
            vendor="OpenAI",
            plan_name="Plus",
            record_type="saas",
            license_mode="assigned",
            provider_code="openai",
            created_by=admin_user,
        )
        SoftwareAssetAssignment.objects.create(asset=member_asset, user=self.user)
        SoftwareAssetAssignment.objects.create(asset=other_asset, user=other_user)

        with tempfile.TemporaryDirectory() as temp_dir:
            call_command("export_user_license_csvs", directory=temp_dir, verbosity=0)

            member_file = Path(temp_dir) / "member.csv"
            other_file = Path(temp_dir) / "software-export-user.csv"
            self.assertTrue(member_file.exists())
            self.assertTrue(other_file.exists())

            with member_file.open("r", encoding="utf-8", newline="") as file_handle:
                rows = list(csv.DictReader(file_handle))
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["name"], "Cursor Pro")

            with other_file.open("r", encoding="utf-8", newline="") as file_handle:
                rows = list(csv.DictReader(file_handle))
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["name"], "ChatGPT Plus")

    def test_exported_manual_assigned_asset_is_managed_by_live_csv(self):
        admin_user = User.objects.create_user(
            username="software-export-live-admin",
            password="strong-pass-123",
            email="software-export-live-admin@example.com",
            is_staff=True,
        )
        asset = SoftwareAsset.objects.create(
            name="Manual Personal License",
            vendor="OpenAI",
            plan_name="Plus",
            record_type="saas",
            license_mode="assigned",
            provider_code="openai",
            created_by=admin_user,
        )
        SoftwareAssetAssignment.objects.create(asset=asset, user=self.user)

        with tempfile.TemporaryDirectory() as temp_dir:
            export_live_license_csvs_for_users(user_ids=[self.user.id], directory=temp_dir)

            csv_path = Path(temp_dir) / "member.csv"
            self.assertTrue(csv_path.exists())

            with csv_path.open("r", encoding="utf-8", newline="") as file_handle:
                rows = list(csv.DictReader(file_handle))
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["name"], "Manual Personal License")
            self.assertTrue(rows[0]["asset_id"])

            asset.refresh_from_db()
            self.assertEqual(
                (asset.extra_metadata or {}).get("live_csv", {}).get("source_file"),
                "member.csv",
            )

            with csv_path.open("w", encoding="utf-8", newline="") as file_handle:
                writer = csv.DictWriter(file_handle, fieldnames=rows[0].keys())
                writer.writeheader()

            sync_live_license_csv_directory(temp_dir)

            asset.refresh_from_db()
            self.assertEqual(asset.operational_status, "archived")

    def test_sync_live_license_csvs_creates_updates_and_archives_assets(self):
        User.objects.create_user(
            username="software-sync-live-admin",
            password="strong-pass-123",
            email="software-sync-live-admin@example.com",
            is_staff=True,
        )
        live_user = User.objects.create_user(
            username="live-sync-user",
            password="strong-pass-123",
            email="live-sync-user@example.com",
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            csv_path = Path(temp_dir) / "live-sync-user.csv"
            with csv_path.open("w", encoding="utf-8", newline="") as file_handle:
                writer = csv.DictWriter(
                    file_handle,
                    fieldnames=[
                        "asset_id",
                        "name",
                        "vendor",
                        "plan_name",
                        "record_type",
                        "provider_code",
                        "operational_status",
                        "billing_cycle",
                        "purchase_price",
                        "currency",
                        "purchase_date",
                        "renewal_date",
                        "auto_renew",
                        "assigned_user",
                        "account_email",
                        "billing_email",
                        "department",
                        "cost_center",
                        "notes",
                        "external_id",
                        "external_workspace_id",
                    ],
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "name": "Figma Professional",
                        "vendor": "Figma",
                        "plan_name": "Professional",
                        "record_type": "saas",
                        "provider_code": "figma",
                        "billing_cycle": "monthly",
                        "purchase_price": "15.00",
                        "currency": "USD",
                        "auto_renew": "true",
                        "assigned_user": live_user.username,
                        "notes": "Initial row",
                    }
                )

            call_command("sync_live_license_csvs", directory=temp_dir, verbosity=0)

            asset = SoftwareAsset.objects.get(name="Figma Professional")
            self.assertEqual(asset.license_mode, "assigned")
            self.assertEqual(asset.assignments.filter(user=live_user, is_active=True).count(), 1)

            with csv_path.open("r", encoding="utf-8", newline="") as file_handle:
                rows = list(csv.DictReader(file_handle))
            self.assertEqual(len(rows), 1)
            self.assertTrue(rows[0]["asset_id"])

            with csv_path.open("w", encoding="utf-8", newline="") as file_handle:
                writer = csv.DictWriter(file_handle, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerow(
                    {
                        **rows[0],
                        "purchase_price": "18.50",
                        "notes": "Updated row",
                    }
                )

            call_command("sync_live_license_csvs", directory=temp_dir, verbosity=0)

            asset.refresh_from_db()
            self.assertEqual(str(asset.purchase_price), "18.50")
            self.assertEqual(asset.notes, "Updated row")
            self.assertEqual(
                SoftwareAsset.objects.filter(name="Figma Professional", license_mode="assigned").count(),
                1,
            )

            with csv_path.open("w", encoding="utf-8", newline="") as file_handle:
                writer = csv.DictWriter(file_handle, fieldnames=rows[0].keys())
                writer.writeheader()

            call_command("sync_live_license_csvs", directory=temp_dir, verbosity=0)

            asset.refresh_from_db()
            self.assertEqual(asset.operational_status, "archived")

    def test_sync_live_license_csvs_rejects_asset_id_from_other_user_file(self):
        User.objects.create_user(
            username="software-sync-cross-file-admin",
            password="strong-pass-123",
            email="software-sync-cross-file-admin@example.com",
            is_staff=True,
        )
        first_user = User.objects.create_user(
            username="live-scope-a",
            password="strong-pass-123",
            email="live-scope-a@example.com",
        )
        second_user = User.objects.create_user(
            username="live-scope-b",
            password="strong-pass-123",
            email="live-scope-b@example.com",
        )
        protected_asset = SoftwareAsset.objects.create(
            name="Protected Asset",
            vendor="Adobe",
            plan_name="Single App",
            record_type="desktop_license",
            license_mode="assigned",
            provider_code="adobe",
        )
        SoftwareAssetAssignment.objects.create(asset=protected_asset, user=second_user)

        with tempfile.TemporaryDirectory() as temp_dir:
            csv_path = Path(temp_dir) / "live-scope-a.csv"
            with csv_path.open("w", encoding="utf-8", newline="") as file_handle:
                writer = csv.DictWriter(
                    file_handle,
                    fieldnames=[
                        "asset_id",
                        "name",
                        "vendor",
                        "plan_name",
                        "record_type",
                        "provider_code",
                        "operational_status",
                        "billing_cycle",
                        "purchase_price",
                        "currency",
                        "purchase_date",
                        "renewal_date",
                        "auto_renew",
                        "assigned_user",
                        "account_email",
                        "billing_email",
                        "department",
                        "cost_center",
                        "notes",
                        "external_id",
                        "external_workspace_id",
                    ],
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "asset_id": str(protected_asset.id),
                        "name": "Adobe After Effects",
                        "vendor": "Adobe",
                        "plan_name": "Single App",
                        "record_type": "desktop_license",
                        "provider_code": "adobe",
                        "billing_cycle": "monthly",
                        "purchase_price": "12.29",
                        "currency": "USD",
                        "auto_renew": "true",
                        "assigned_user": first_user.username,
                    }
                )

            summary = sync_live_license_csv_directory(temp_dir)

            protected_asset.refresh_from_db()
            self.assertEqual(protected_asset.name, "Protected Asset")
            self.assertEqual(
                protected_asset.assignments.filter(user=second_user, is_active=True).count(),
                1,
            )
            self.assertFalse(
                SoftwareAsset.objects.filter(
                    name="Adobe After Effects",
                    assignments__user=first_user,
                    assignments__is_active=True,
                ).exists()
            )
            result = summary.results[0]
            self.assertEqual(result.created_count, 0)
            self.assertEqual(result.updated_count, 0)
            self.assertEqual(result.archived_count, 0)
            self.assertEqual(len(result.errors), 1)
            self.assertIn("Leave asset_id empty", result.errors[0])

    def test_admin_can_sync_record_and_create_sync_log(self):
        admin_user = User.objects.create_user(
            username="software-sync-admin",
            password="strong-pass-123",
            email="software-sync-admin@example.com",
            is_staff=True,
        )
        asset = SoftwareAsset.objects.create(
            name="Microsoft 365 E3",
            vendor="Microsoft",
            provider_code="microsoft",
            record_type="saas",
            license_mode="shared",
            seats_total=10,
            external_id="m365-e3",
            external_workspace_id="tenant-001",
            created_by=admin_user,
        )

        self.client.force_authenticate(user=admin_user)
        response = self.client.post(f"/api/software-assets/{asset.id}/sync/", format="json")

        asset.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(asset.sync_status, "ok")
        self.assertTrue(
            SoftwareAssetSyncLog.objects.filter(asset=asset, status="ok").exists()
        )

    def test_user_can_create_license_request_and_admin_can_fulfill_it(self):
        admin_user = User.objects.create_user(
            username="software-request-admin",
            password="strong-pass-123",
            email="software-request-admin@example.com",
            is_staff=True,
        )
        asset = SoftwareAsset.objects.create(
            name="Adobe Creative Cloud",
            vendor="Adobe",
            record_type="desktop_license",
            license_mode="shared",
            provider_code="adobe",
            seats_total=2,
            created_by=admin_user,
        )

        create_response = self.client.post(
            "/api/license-requests/",
            {
                "requested_product": "Adobe Creative Cloud",
                "provider_code": "adobe",
                "request_type": "access_request",
                "preferred_plan": "All Apps",
                "justification": "Design review and export workflows.",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        request_id = create_response.data["id"]

        self.client.force_authenticate(user=admin_user)
        fulfill_response = self.client.patch(
            f"/api/license-requests/{request_id}/",
            {
                "asset": asset.id,
                "status": "fulfilled",
                "resolution_note": "Seat assigned from shared pool.",
            },
            format="json",
        )

        self.assertEqual(fulfill_response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            SoftwareAssetAssignment.objects.filter(asset=asset, user=self.user).exists()
        )
        self.assertTrue(
            UserNotification.objects.filter(
                recipient=self.user,
                type="license",
                title="License request updated",
            ).exists()
        )
        self.assertTrue(
            SoftwareAssetAuditLog.objects.filter(
                event_type="request_status_changed",
            ).exists()
        )

    def test_notifications_endpoint_normalizes_legacy_turkish_ascii_text(self):
        UserNotification.objects.create(
            recipient=self.user,
            title="Gorev tamamlandi",
            body="Demo projesi icindeki Test gorevini tamamladi.",
            type="task",
        )

        response = self.client.get("/api/notifications/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["title"], "Görev Tamamlandı")
        self.assertEqual(
            response.data[0]["body"],
            "Demo projesi içindeki Test görevini tamamladı.",
        )
