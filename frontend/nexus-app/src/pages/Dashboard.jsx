"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import Navbar from "../component/dashboard/DashboardNavbar";
import DashboardSummary from "../component/dashboard/DashboardSummary";
import Sidebar from "../component/layout/Sidebar";
import ProfileCard from "../component/team/ProfileCard";
import { useI18n } from "../I18nContext.jsx";
import { apiClient } from "../refine/axios";

function Dashboard() {
  const { t } = useI18n();
  const dashboardQueryOptions = {
    queryOptions: {
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  };
  const snippetsQuery = useList({
    resource: "snippets",
    ...dashboardQueryOptions,
  });
  const commentsQuery = useList({
    resource: "comments",
    ...dashboardQueryOptions,
  });
  const teamQuery = useList({
    resource: "status",
    ...dashboardQueryOptions,
  });
  const tasksQuery = useList({
    resource: "tasks",
    ...dashboardQueryOptions,
  });
  const projectsQuery = useList({
    resource: "projects",
    ...dashboardQueryOptions,
  });
  const usersQuery = useList({
    resource: "users",
    ...dashboardQueryOptions,
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState([]);

  useEffect(() => {
    let ignore = false;

    const loadRecentActivity = async () => {
      try {
        const response = await apiClient.get("/dashboard-activity/");
        if (!ignore) {
          setRecentActivity(response.data || []);
        }
      } catch (error) {
        if (!ignore) {
          setRecentActivity([]);
        }
      }
    };

    loadRecentActivity();

    return () => {
      ignore = true;
    };
  }, [
    commentsQuery.data?.data?.length,
    projectsQuery.data?.data?.length,
    snippetsQuery.data?.data?.length,
    tasksQuery.data?.data?.length,
    teamQuery.data?.data?.length,
  ]);

  useEffect(() => {
    let ignore = false;

    const loadUnreadNotifications = async () => {
      try {
        const response = await apiClient.get("/notifications/", {
          params: { is_read: false },
        });
        if (!ignore) {
          setUnreadNotifications(response.data || []);
        }
      } catch (error) {
        if (!ignore) {
          setUnreadNotifications([]);
        }
      }
    };

    loadUnreadNotifications();

    return () => {
      ignore = true;
    };
  }, [tasksQuery.data?.data?.length, teamQuery.data?.data?.length, projectsQuery.data?.data?.length]);

  const stats = useMemo(() => {
    const snippetsResult = snippetsQuery.data;
    const snippets = snippetsResult?.data ?? [];
    const comments = commentsQuery.data?.data ?? [];
    const teamMembers = teamQuery.data?.data ?? [];
    const tasks = tasksQuery.data?.data ?? [];
    const projects = projectsQuery.data?.data ?? [];
    const users = usersQuery.data?.data ?? [];

    const normalizeIdentity = (value) =>
      String(value || "")
        .toLocaleLowerCase("tr")
        .replace(/\s+/g, " ")
        .trim();

    const resolveMemberUser = (member) => {
      if (member?.user_details?.id) return member.user_details;

      const employeeName = normalizeIdentity(member?.employee_name);

      return (
        users.find((user) => normalizeIdentity(user.username) === employeeName) ||
        users.find(
          (user) =>
            normalizeIdentity(`${user.first_name || ""} ${user.last_name || ""}`) === employeeName
        ) ||
        null
      );
    };

    const enrichedTeamMembers = teamMembers
      .map((member) => {
        const resolvedUser = resolveMemberUser(member);
        if (!resolvedUser?.id) return null;

        const activeTask = tasks.find(
          (task) =>
            String(task.assignee) === String(resolvedUser.id) &&
            task.status !== "done"
        );

        const linkedProjects = projects.filter((project) =>
          (project.team_members || []).some((memberId) => String(memberId) === String(member.id))
        );

        const activeProject =
          linkedProjects.find((project) => project.status === "active") ||
          linkedProjects[0] ||
          null;

        const effectiveStatus = member.effective_status || (activeTask ? "busy" : "available");

        return {
          ...member,
          user_details: resolvedUser,
          status_type: effectiveStatus,
          effective_status: effectiveStatus,
          current_work: member.active_task_description || member.current_work || "",
          currentProject: activeProject,
          currentProjectName: member.active_task_project_name || activeProject?.name || "",
          currentProjectClient: member.active_task_project_client || activeProject?.client_name || "",
          currentProjectEndDate: member.active_task_project_end_date || activeProject?.end_date || "",
          activeTask,
          projectCount: linkedProjects.length,
        };
      })
      .filter(Boolean);

    const busyMembers = enrichedTeamMembers.filter((member) => member.effective_status === "busy");
    const availableMembers = enrichedTeamMembers.filter((member) => member.effective_status === "available");
    const totalRating = comments.reduce((sum, comment) => sum + Number(comment?.experience_rating || 0), 0);
    const averageRating = comments.length ? Number((totalRating / comments.length).toFixed(1)) : 0;
    const languageCounts = snippets.reduce((acc, snippet) => {
      const language = snippet.language || "unknown";
      acc[language] = (acc[language] || 0) + 1;
      return acc;
    }, {});
    const languageSpread = Object.entries(languageCounts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const snippetsByFeedback = snippets
      .map((snippet) => {
        const snippetComments = comments.filter(
          (comment) => Number(comment.snippet) === Number(snippet.id)
        );
        const snippetAverage = snippetComments.length
          ? snippetComments.reduce(
              (sum, comment) => sum + Number(comment.experience_rating || 0),
              0
            ) / snippetComments.length
          : null;

        return {
          ...snippet,
          commentCount: snippetComments.length,
          averageRating: snippetAverage,
        };
      })
      .sort((a, b) => {
        if (a.commentCount !== b.commentCount) {
          return a.commentCount - b.commentCount;
        }

        return new Date(b.created_at) - new Date(a.created_at);
      });

    return {
      totalSnippets: snippetsResult?.total || snippets.length,
      latestSnippet: snippets[0] || null,
      totalComments: comments.length,
      averageRating,
      uniqueLanguageCount: languageSpread.length,
      languageSpread,
      busyMembers: busyMembers.length,
      availableMembers: availableMembers.length,
      totalMembers: enrichedTeamMembers.length,
      reviewQueue: snippetsByFeedback.slice(0, 4),
      recentActivity,
      enrichedTeamMembers,
    };
  }, [commentsQuery.data, projectsQuery.data, recentActivity, snippetsQuery.data, t, tasksQuery.data, teamQuery.data, usersQuery.data]);

  const teamActivities = useMemo(() => stats?.enrichedTeamMembers ?? [], [stats]);

  const hasDashboardBaseData =
    Boolean(snippetsQuery.data) &&
    Boolean(commentsQuery.data) &&
    Boolean(teamQuery.data) &&
    Boolean(tasksQuery.data) &&
    Boolean(projectsQuery.data) &&
    Boolean(usersQuery.data);

  const isInitialLoading =
    !hasDashboardBaseData &&
    (
      snippetsQuery?.isLoading ||
      commentsQuery?.isLoading ||
      teamQuery?.isLoading ||
      tasksQuery?.isLoading ||
      projectsQuery?.isLoading ||
      usersQuery?.isLoading
    );

  const openProfile = (member) => {
    setSelectedMember(member);
    setIsProfileOpen(true);
  };

  const closeProfile = () => {
    setSelectedMember(null);
    setIsProfileOpen(false);
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent text-slate-900">
      <Sidebar activeItem="dashboard" showTeamSubmenu={true} />

      <div className="relative flex grow flex-col items-start self-stretch overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />

        <div className="relative flex w-full flex-col gap-10 px-6 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
          <header className="rounded-[36px] border border-white/60 bg-white/40 p-2 shadow-[0_24px_60px_rgba(148,163,184,0.18)] backdrop-blur">
            <Navbar />
          </header>

          {unreadNotifications.length ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 px-6 py-4 text-amber-900 shadow-[0_16px_40px_rgba(251,191,36,0.12)]">
              <p className="text-sm font-black">
                Bildirimleriniz var, bakmanizi oneririm.
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                {unreadNotifications.length} okunmamis bildirim bulundu. Ayarlar icindeki Bildirimler panelinden detaylari gorebilirsiniz.
              </p>
            </div>
          ) : null}

          {isInitialLoading ? (
            <div className="flex w-full flex-col items-center gap-4 rounded-[32px] border border-white/60 bg-white/70 py-24 text-center shadow-[0_20px_50px_rgba(148,163,184,0.14)] backdrop-blur">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
              <p className="font-bold text-slate-500">{t("dashboard.syncing")}</p>
            </div>
          ) : (
            <DashboardSummary
              stats={stats}
              teamActivities={teamActivities}
              onMemberClick={openProfile}
            />
          )}
        </div>
      </div>

      <ProfileCard
        member={selectedMember}
        isOpen={isProfileOpen}
        onClose={closeProfile}
      />
    </div>
  );
}

export default Dashboard;
