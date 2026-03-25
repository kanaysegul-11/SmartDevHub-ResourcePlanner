"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  useCreate,
  useDelete,
  useInvalidate,
  useList,
  useUpdate,
} from "@refinedev/core";
import { FeatherBriefcase, FeatherCoffee, FeatherUsers } from "@subframe/core";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../component/layout/Sidebar";
import ProfileCard from "../component/team/ProfileCard.jsx";
import TeamConversationPanel from "../component/team/TeamConversationPanel.jsx";
import TeamDirectoryManager from "../component/team/TeamDirectoryManager.jsx";
import TeamHeader from "../component/team/TeamHeader.jsx";
import TeamList from "../component/team/TeamList.jsx";
import { useUser } from "../UserContext.jsx";
import { useI18n } from "../I18nContext.jsx";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";

function Team() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData } = useUser();
  const { t } = useI18n();
  const sharedQueryOptions = {
    queryOptions: {
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  };
  const teamQuery = useList({ resource: "status", ...sharedQueryOptions });
  const usersQuery = useList({ resource: "users", ...sharedQueryOptions });
  const projectsQuery = useList({ resource: "projects", ...sharedQueryOptions });
  const { mutate: createMember, isLoading: isCreating } = useCreate();
  const { mutate: updateMember, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMember } = useDelete();
  const invalidate = useInvalidate();

  const [selectedMember, setSelectedMember] = useState(null);
  const [profileMember, setProfileMember] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const chatSectionRef = useRef(null);

  const teamMembers = useMemo(
    () => (teamQuery.data?.data ?? []).filter((member) => !member.user_details?.is_admin),
    [teamQuery.data?.data]
  );
  const userOptions = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data?.data]);
  const projects = useMemo(() => projectsQuery.data?.data ?? [], [projectsQuery.data?.data]);
  const chatMemberId = useMemo(
    () => new URLSearchParams(location.search).get("chat"),
    [location.search]
  );
  const chatUserId = useMemo(
    () => new URLSearchParams(location.search).get("chatUser"),
    [location.search]
  );
  const normalizeIdentity = (value) =>
    String(value || "")
      .trim()
      .toLocaleLowerCase("tr")
      .replace(/\s+/g, " ");

  const routeChatMember = useMemo(() => {
    if (chatMemberId) {
      return teamMembers.find((item) => String(item.id) === String(chatMemberId)) || null;
    }

    if (!chatUserId) return null;

    const targetUser = userOptions.find((item) => String(item.id) === String(chatUserId));
    if (!targetUser) return null;

    const targetFullName = normalizeIdentity(
      `${targetUser.first_name || ""} ${targetUser.last_name || ""}`
    );
    const targetUsername = normalizeIdentity(targetUser.username);

    return (
      teamMembers.find(
        (item) =>
          String(item.user_details?.id || "") === String(chatUserId) ||
          normalizeIdentity(item.employee_name) === targetFullName ||
          normalizeIdentity(item.employee_name) === targetUsername
      ) || null
    );
  }, [chatMemberId, chatUserId, teamMembers, userOptions]);

  const teamMembersWithProjects = useMemo(() => {
    return teamMembers.map((member) => {
      const memberProjects = projects.filter((project) =>
        (project.team_members || []).some((memberId) => String(memberId) === String(member.id))
      );
      const taskProject =
        projects.find(
          (project) => String(project.name) === String(member.active_task_project_name)
        ) || null;
      const activeProject =
        taskProject ||
        memberProjects.find((project) => project.status === "active") ||
        memberProjects[0] ||
        null;

      return {
        ...member,
        activeTaskTitle: member.active_task_title || "",
        activeTaskDeadline: member.active_task_deadline || "",
        effectiveStatus: member.effective_status || "available",
        currentProject: activeProject,
        currentProjectName: member.active_task_project_name || activeProject?.name || "",
        currentProjectClient: member.active_task_project_client || activeProject?.client_name || "",
        currentProjectEndDate: member.active_task_project_end_date || activeProject?.end_date || "",
        projectCount: memberProjects.length,
        profileNote: member.current_work || "",
        projectSummary: member.active_task_description || activeProject?.summary || "",
      };
    });
  }, [projects, teamMembers]);

  const activeProjectMembers = useMemo(
    () => teamMembersWithProjects.filter((member) => member.effectiveStatus === "busy"),
    [teamMembersWithProjects]
  );
  const availableMembers = useMemo(
    () => teamMembersWithProjects.filter((member) => member.effectiveStatus === "available"),
    [teamMembersWithProjects]
  );

  const teamStats = useMemo(
    () => ({
      totalMembers: teamMembers.length,
      busyMembers: activeProjectMembers.length,
      availableMembers: availableMembers.length,
    }),
    [activeProjectMembers.length, availableMembers.length, teamMembers.length]
  );

  const refreshTeam = () => {
    invalidate({ resource: "status", invalidates: ["list", "detail"] });
  };

  const normalizeMemberValues = (values) => ({
    ...values,
    user: values.user || null,
  });

  const scrollToChat = () => {
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCreateMember = (values) => {
    createMember(
      { resource: "status", values: normalizeMemberValues(values) },
      {
        onSuccess: refreshTeam,
        onError: (error) => {
          console.error("Create member error:", error);
          alert(t("team.createError"));
        },
      }
    );
  };

  const handleUpdateMember = (id, values) => {
    updateMember(
      { resource: "status", id, values: normalizeMemberValues(values) },
      {
        onSuccess: refreshTeam,
        onError: (error) => {
          console.error("Update member error:", error);
          alert(t("team.updateError"));
        },
      }
    );
  };

  const handleDeleteMember = (id) => {
    if (!window.confirm(t("team.confirmDelete"))) {
      return;
    }

    deleteMember(
      { resource: "status", id },
      {
        onSuccess: () => {
          refreshTeam();
          if (selectedMember?.id === id) setSelectedMember(null);
          if (profileMember?.id === id) {
            setProfileMember(null);
            setIsProfileOpen(false);
          }
        },
        onError: (error) => {
          console.error("Delete member error:", error);
          alert(t("team.deleteError"));
        },
      }
    );
  };

  const openProfile = (member) => {
    if (chatMemberId || chatUserId) {
      navigate("/team", { replace: true });
    }
    setProfileMember(member);
    setSelectedMember(member);
    setIsProfileOpen(true);
  };

  const openMessaging = (member, options = {}) => {
    const { scroll = true } = options;
    if (chatMemberId || chatUserId) {
      navigate("/team", { replace: true });
    }
    setSelectedMember(member);
    setProfileMember(member);
    setIsProfileOpen(false);

    if (scroll) {
      window.requestAnimationFrame(() => {
        scrollToChat();
      });
    }
  };

  const canManageTeam = Boolean(userData?.isAdmin);
  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="team" showTeamSubmenu={true} logoutVariant="danger" logoClickable={true} />

      <div className="relative flex grow flex-col items-start self-stretch overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />

        <div className="relative flex w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={<FeatherUsers />}>
                {t("team.workspace")}
              </Badge>
            }
            rightSlot={<Badge variant="success">{t("team.liveCommunication")}</Badge>}
          />

          <TeamHeader
            loading={teamQuery.isLoading || usersQuery.isLoading || projectsQuery.isLoading || isCreating}
            stats={teamStats}
            spotlightMembers={teamMembersWithProjects.slice(0, 3)}
            onInspect={openProfile}
            onMessageClick={openMessaging}
          />

          <div className="flex w-full flex-col gap-8 px-6 pb-10 md:px-8 xl:px-10">
            <div
              ref={chatSectionRef}
              className={`grid w-full scroll-mt-6 grid-cols-1 gap-6 ${canManageTeam ? "xl:grid-cols-[360px_minmax(0,1fr)]" : "xl:grid-cols-1"}`}
            >
              {canManageTeam ? (
                <TeamDirectoryManager
                  members={teamMembersWithProjects}
                  userOptions={userOptions}
                  isSubmitting={isCreating || isUpdating}
                  onCreate={handleCreateMember}
                  onUpdate={handleUpdateMember}
                  onDelete={handleDeleteMember}
                  onSelectMember={setSelectedMember}
                />
              ) : (
                <div className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("team.userView")}
                  </p>
                  <h3 className="mt-3 font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                    {t("team.managementHidden")}
                  </h3>
                </div>
              )}

              <TeamConversationPanel member={routeChatMember || selectedMember} />
            </div>

            <div className="flex min-w-0 flex-col items-start gap-8">
              <TeamList
                title={t("team.activeProjectMembers")}
                count={activeProjectMembers.length}
                icon={<FeatherBriefcase size={20} />}
                members={activeProjectMembers}
                variant="busy"
                onDelete={handleDeleteMember}
                onInspect={openProfile}
                onMessageClick={openMessaging}
                canManage={canManageTeam}
                emptyMessage={t("team.noBusyMembers")}
              />

              <TeamList
                title={t("team.availableMembers")}
                count={availableMembers.length}
                icon={<FeatherCoffee size={20} />}
                members={availableMembers}
                variant="available"
                onDelete={handleDeleteMember}
                onInspect={openProfile}
                onMessageClick={openMessaging}
                canManage={canManageTeam}
                emptyMessage={t("team.noAvailableMembers")}
              />
            </div>
          </div>
        </div>
      </div>

      <ProfileCard
        member={profileMember}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onMessageClick={openMessaging}
      />
    </div>
  );
}

export default Team;
