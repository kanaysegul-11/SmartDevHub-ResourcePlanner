from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import EmploymentStatus, Project, Task, UserNotification, UserProfile


class ApiBehaviorTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="member",
            password="strong-pass-123",
            email="member@example.com",
        )
        self.client.force_authenticate(user=self.user)

    def test_admin_contacts_creates_status_records_for_admins(self):
        admin_user = User.objects.create_user(
            username="admin",
            password="strong-pass-123",
            email="admin@example.com",
            is_staff=True,
        )

        response = self.client.get("/api/admin-contacts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user_details"]["id"], admin_user.id)

        admin_status = EmploymentStatus.objects.get(user=admin_user)
        self.assertEqual(admin_status.position, "Administrator")
        self.assertEqual(admin_status.status_type, "available")

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
