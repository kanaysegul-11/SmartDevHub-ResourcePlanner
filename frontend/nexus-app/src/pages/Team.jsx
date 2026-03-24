"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const teamQuery = useList({ resource: "status" });
  const { mutate: createMember, isLoading: isCreating } = useCreate();
  const { mutate: updateMember, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMember } = useDelete();
  const invalidate = useInvalidate();

  const [selectedMember, setSelectedMember] = useState(null);
  const [profileMember, setProfileMember] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const chatSectionRef = useRef(null);

  const teamMembers = teamQuery.data?.data ?? [];
  const activeProjectMembers = teamMembers.filter((member) => member.status_type === "busy");
  const availableMembers = teamMembers.filter((member) => member.status_type === "available");

  const spotlightMembers = useMemo(() => [...teamMembers].slice(0, 3), [teamMembers]);

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

  const scrollToChat = () => {
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCreateMember = (values) => {
    createMember(
      { resource: "status", values },
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
      { resource: "status", id, values },
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
    setProfileMember(member);
    setSelectedMember(member);
    setIsProfileOpen(true);
  };

  const openMessaging = (member, options = {}) => {
    const { scroll = true } = options;
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chatId = params.get("chat");
    if (!chatId || !teamMembers.length) return;

    const member = teamMembers.find((item) => String(item.id) === String(chatId));
    if (!member) return;

    openMessaging(member);
    navigate("/team", { replace: true });
  }, [location.search, navigate, teamMembers]);

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
            loading={teamQuery.isLoading || teamQuery.isFetching || isCreating}
            stats={teamStats}
            spotlightMembers={spotlightMembers}
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
                  members={teamMembers}
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
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {t("team.managementHiddenBody")}
                  </p>
                </div>
              )}

              <TeamConversationPanel member={selectedMember} />
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

