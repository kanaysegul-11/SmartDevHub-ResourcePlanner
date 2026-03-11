"use client";

import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";

import Navbar from "../component/dashboard/DashboardNavbar";
import DashboardSummary from "../component/dashboard/DashboardSummary";
import Sidebar from "../component/layout/Sidebar";
import ProfileCard from "../component/team/ProfileCard";

function Dashboard() {
  const snippetsQuery = useList({
    resource: "snippets",
  });
  const teamQuery = useList({
    resource: "status",
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const stats = useMemo(() => {
    const snippetsResult = snippetsQuery.data;
    const snippets = snippetsResult?.data ?? [];

    return {
      totalSnippets: snippetsResult?.total || snippets.length,
      latestSnippet: snippets[0] || null,
    };
  }, [snippetsQuery.data]);

  const teamActivities = useMemo(
    () => teamQuery.data?.data ?? [],
    [teamQuery.data]
  );

  const isInitialLoading =
    snippetsQuery?.isLoading ||
    snippetsQuery?.isFetching ||
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
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar activeItem="dashboard" showTeamSubmenu={true} />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">
        <div className="flex w-full flex-col gap-8 px-8 py-8">
          <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <Navbar />
          </header>

          {isInitialLoading ? (
            <div className="flex w-full flex-col items-center gap-4 py-20 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
              <p className="font-bold text-slate-400">
                Veriler senkronize ediliyor...
              </p>
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
