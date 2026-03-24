"use client";

import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import Navbar from "../component/dashboard/DashboardNavbar";
import DashboardSummary from "../component/dashboard/DashboardSummary";
import Sidebar from "../component/layout/Sidebar";
import ProfileCard from "../component/team/ProfileCard";
import { useI18n } from "../I18nContext.jsx";

function Dashboard() {
  const { t } = useI18n();
  const snippetsQuery = useList({
    resource: "snippets",
  });
  const commentsQuery = useList({
    resource: "comments",
  });
  const teamQuery = useList({
    resource: "status",
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const stats = useMemo(() => {
    const snippetsResult = snippetsQuery.data;
    const snippets = snippetsResult?.data ?? [];
    const comments = commentsQuery.data?.data ?? [];
    const teamMembers = teamQuery.data?.data ?? [];
    const busyMembers = teamMembers.filter((member) => member.status_type === "busy");
    const availableMembers = teamMembers.filter((member) => member.status_type === "available");
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

    const recentActivity = [
      ...snippets.slice(0, 3).map((snippet) => ({
        id: `snippet-${snippet.id}`,
        type: "snippet",
        title: snippet.title,
        meta: snippet.language || t("dashboard.activityCode"),
        timestamp: snippet.created_at,
      })),
      ...comments.slice(0, 3).map((comment) => ({
        id: `comment-${comment.id}`,
        type: "comment",
        title: comment.author_details?.username || t("dashboard.activityFeedback"),
        meta: `${comment.experience_rating || "-"} ${t("dashboard.activityMetaCommentSuffix")}`,
        timestamp: comment.created_at,
      })),
      ...teamMembers.slice(0, 3).map((member) => ({
        id: `member-${member.id}`,
        type: "team",
        title: member.employee_name || t("dashboard.activityMetaUnknownTeam"),
        meta:
          member.status_type === "busy"
            ? t("dashboard.statusBusy")
            : t("dashboard.statusAvailable"),
        timestamp: member.last_updated,
      })),
    ]
      .filter((item) => item.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6);

    return {
      totalSnippets: snippetsResult?.total || snippets.length,
      latestSnippet: snippets[0] || null,
      totalComments: comments.length,
      averageRating,
      uniqueLanguageCount: languageSpread.length,
      languageSpread,
      busyMembers: busyMembers.length,
      availableMembers: availableMembers.length,
      totalMembers: teamMembers.length,
      reviewQueue: snippetsByFeedback.slice(0, 4),
      recentActivity,
    };
  }, [commentsQuery.data, snippetsQuery.data, t, teamQuery.data]);

  const teamActivities = useMemo(() => teamQuery.data?.data ?? [], [teamQuery.data]);

  const isInitialLoading =
    snippetsQuery?.isLoading ||
    snippetsQuery?.isFetching ||
    commentsQuery?.isLoading ||
    commentsQuery?.isFetching ||
    teamQuery?.isLoading ||
    teamQuery?.isFetching;

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

