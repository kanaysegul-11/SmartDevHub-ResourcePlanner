from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Comment, EmploymentStatus, Project, Snippet, Task, TeamMessage, UserNotification, UserProfile


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
            title="Görev tamamlandı",
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

    def test_notifications_endpoint_normalizes_legacy_turkish_ascii_text(self):
        UserNotification.objects.create(
            recipient=self.user,
            title="Gorev tamamlandi",
            body="Demo projesi icindeki Test gorevini tamamladi.",
            type="task",
        )

        response = self.client.get("/api/notifications/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["title"], "Görev tamamlandı")
        self.assertEqual(
            response.data[0]["body"],
            "Demo projesi içindeki Test görevini tamamladı.",
        )
