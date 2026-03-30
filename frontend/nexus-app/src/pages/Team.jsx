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
import ConfirmDialog from "../component/common/ConfirmDialog.jsx";
import ProfileCard from "../component/team/ProfileCard.jsx";
import TeamConversationPanel from "../component/team/TeamConversationPanel.jsx";
import TeamDirectoryManager from "../component/team/TeamDirectoryManager.jsx";
import TeamHeader from "../component/team/TeamHeader.jsx";
import TeamList from "../component/team/TeamList.jsx";
import { useUser } from "../UserContext.jsx";
import { useI18n } from "../I18nContext.jsx";
import { apiClient } from "../refine/axios";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";

const TEAM_ORDER_CONFIG_KEY = "team-member-order";

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
  const [memberOrder, setMemberOrder] = useState([]);
  const [dragState, setDragState] = useState({
    draggedId: null,
    targetId: null,
    overChatPanel: false,
  });
  const [confirmMemberId, setConfirmMemberId] = useState(null);
  const [teamErrorMessage, setTeamErrorMessage] = useState("");
  const chatSectionRef = useRef(null);
  const orderConfigRef = useRef(null);
  const orderHydratedRef = useRef(false);
  const lastSavedOrderRef = useRef("");

  const teamMembers = useMemo(
    () => (teamQuery.data?.data ?? []).filter((member) => !member.user_details?.is_admin),
    [teamQuery.data?.data]
  );
  const userOptions = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data?.data]);
  const projects = useMemo(() => projectsQuery.data?.data ?? [], [projectsQuery.data?.data]);
  const memberOrderOwnerKey = useMemo(
    () => String(userData?.id || userData?.username || "guest"),
    [userData?.id, userData?.username]
  );
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

    const directMatch =
      teamMembers.find(
        (item) => String(item.user_details?.id || "") === String(chatUserId)
      ) || null;

    if (directMatch) {
      return directMatch;
    }

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
      const taskProject = member.active_task_project_name
        ? projects.find(
            (project) => String(project.name) === String(member.active_task_project_name)
          ) || null
        : null;
      const effectiveStatus = member.effective_status || "available";

      return {
        ...member,
        activeTaskTitle: member.active_task_title || "",
        activeTaskDeadline: member.active_task_deadline || "",
        effectiveStatus,
        effective_status: effectiveStatus,
        status_type: effectiveStatus,
        currentProject: taskProject,
        currentProjectName: member.active_task_project_name || "",
        currentProjectClient: member.active_task_project_client || "",
        currentProjectEndDate: member.active_task_project_end_date || "",
        projectCount: Number(member.active_project_count || 0),
        profileNote: member.current_work || "",
        projectSummary: member.active_task_description || "",
      };
    });
  }, [projects, teamMembers]);

  useEffect(() => {
    const nextIds = teamMembersWithProjects.map((member) => String(member.id));

    setMemberOrder((current) => {
      const preserved = current.filter((id) => nextIds.includes(String(id)));
      const additions = nextIds.filter((id) => !preserved.includes(String(id)));
      const merged = [...preserved, ...additions];

      if (
        merged.length === current.length &&
        merged.every((id, index) => String(current[index]) === String(id))
      ) {
        return current;
      }

      return merged;
    });
  }, [teamMembersWithProjects]);

  useEffect(() => {
    let isActive = true;

    const loadSavedOrder = async () => {
      orderHydratedRef.current = false;
      setTeamErrorMessage("");

      try {
        const response = await apiClient.get(`/page-configs/${TEAM_ORDER_CONFIG_KEY}/`);
        if (!isActive) return;

        orderConfigRef.current = response.data;
        const savedOrder =
          response.data?.data?.ordersByUser?.[memberOrderOwnerKey] ?? [];
        const normalizedOrder = Array.isArray(savedOrder)
          ? savedOrder.map((id) => String(id))
          : [];

        lastSavedOrderRef.current = JSON.stringify(normalizedOrder);
        setMemberOrder(normalizedOrder);
      } catch (error) {
        if (!isActive) return;

        if (error?.response?.status !== 404) {
          console.error("Team order load error:", error);
          setTeamErrorMessage(t("team.orderLoadError"));
        }

        orderConfigRef.current = null;
        lastSavedOrderRef.current = JSON.stringify([]);
      } finally {
        if (isActive) {
          orderHydratedRef.current = true;
        }
      }
    };

    void loadSavedOrder();

    return () => {
      isActive = false;
    };
  }, [memberOrderOwnerKey, t]);

  useEffect(() => {
    if (!orderHydratedRef.current) return;

    const normalizedOrder = memberOrder.map((id) => String(id));
    const serializedOrder = JSON.stringify(normalizedOrder);
    if (serializedOrder === lastSavedOrderRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const existingData = orderConfigRef.current?.data || {};
        const nextData = {
          ...existingData,
          ordersByUser: {
            ...(existingData.ordersByUser || {}),
            [memberOrderOwnerKey]: normalizedOrder,
          },
        };

        const response = orderConfigRef.current
          ? await apiClient.patch(`/page-configs/${TEAM_ORDER_CONFIG_KEY}/`, {
              data: nextData,
            })
          : await apiClient.post("/page-configs/", {
              key: TEAM_ORDER_CONFIG_KEY,
              data: nextData,
            });

        orderConfigRef.current = response.data;
        lastSavedOrderRef.current = serializedOrder;
        setTeamErrorMessage("");
      } catch (error) {
        console.error("Team order save error:", error);
        setTeamErrorMessage(t("team.orderSaveError"));
      }
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [memberOrder, memberOrderOwnerKey, t]);

  const memberOrderMap = useMemo(
    () => new Map(memberOrder.map((id, index) => [String(id), index])),
    [memberOrder]
  );

  const orderedTeamMembers = useMemo(
    () =>
      [...teamMembersWithProjects].sort((left, right) => {
        const leftOrder = memberOrderMap.get(String(left.id));
        const rightOrder = memberOrderMap.get(String(right.id));

        if (leftOrder != null && rightOrder != null && leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        if (leftOrder != null && rightOrder == null) return -1;
        if (leftOrder == null && rightOrder != null) return 1;

        return String(left.employee_name || "").localeCompare(
          String(right.employee_name || ""),
          "tr"
        );
      }),
    [memberOrderMap, teamMembersWithProjects]
  );

  const activeProjectMembers = useMemo(
    () => orderedTeamMembers.filter((member) => member.effectiveStatus === "busy"),
    [orderedTeamMembers]
  );
  const availableMembers = useMemo(
    () => orderedTeamMembers.filter((member) => member.effectiveStatus === "available"),
    [orderedTeamMembers]
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

  const reorderMembers = (draggedId, targetId) => {
    if (!draggedId || !targetId || String(draggedId) === String(targetId)) {
      return;
    }

    setMemberOrder((current) => {
      const source = current.length
        ? [...current]
        : teamMembersWithProjects.map((member) => String(member.id));
      const fromIndex = source.findIndex((id) => String(id) === String(draggedId));
      const toIndex = source.findIndex((id) => String(id) === String(targetId));

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current;
      }

      const next = [...source];
      const [movedId] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedId);
      return next;
    });
  };

  const handleMemberDragStart = (memberId) => (event) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(memberId));
    setDragState({
      draggedId: String(memberId),
      targetId: null,
      overChatPanel: false,
    });
  };

  const handleMemberDragOver = (memberId) => (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    setDragState((current) =>
      current.targetId === String(memberId) && !current.overChatPanel
        ? current
        : { ...current, targetId: String(memberId), overChatPanel: false }
    );
  };

  const handleMemberDrop = (memberId) => (event) => {
    event.preventDefault();

    const draggedId =
      dragState.draggedId || event.dataTransfer.getData("text/plain") || null;

    reorderMembers(draggedId, memberId);
    setDragState({ draggedId: null, targetId: null, overChatPanel: false });
  };

  const handleMemberDragEnd = () => {
    setDragState({ draggedId: null, targetId: null, overChatPanel: false });
  };

  const handleChatPanelDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    setDragState((current) =>
      current.overChatPanel && current.targetId === null
        ? current
        : { ...current, targetId: null, overChatPanel: true }
    );
  };

  const handleChatPanelDragLeave = (event) => {
    const nextTarget = event.relatedTarget;
    if (event.currentTarget.contains(nextTarget)) {
      return;
    }

    setDragState((current) =>
      current.overChatPanel
        ? { ...current, overChatPanel: false }
        : current
    );
  };

  const handleChatPanelDrop = (event) => {
    event.preventDefault();

    const draggedId =
      dragState.draggedId || event.dataTransfer.getData("text/plain") || null;
    const draggedMember =
      orderedTeamMembers.find((member) => String(member.id) === String(draggedId)) || null;

    if (draggedMember) {
      openMessaging(draggedMember, { scroll: false });
    }

    setDragState({ draggedId: null, targetId: null, overChatPanel: false });
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
    deleteMember(
      { resource: "status", id },
      {
        onSuccess: () => {
          refreshTeam();
          setConfirmMemberId(null);
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

  const openDeleteMemberConfirm = (id) => {
    setConfirmMemberId(id);
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
  const activeErrorMessage =
    teamErrorMessage ||
    (teamQuery.error || usersQuery.error || projectsQuery.error
      ? t("team.loadError")
      : "");
  const confirmMember =
    orderedTeamMembers.find((member) => String(member.id) === String(confirmMemberId || "")) ||
    null;
  const actionMember =
    routeChatMember ||
    selectedMember ||
    profileMember ||
    orderedTeamMembers[0] ||
    null;
  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="team" showTeamSubmenu={true} logoClickable={true} />

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

          {activeErrorMessage ? (
            <div className="px-6 md:px-8 xl:px-10">
              <div className="rounded-[24px] border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>{activeErrorMessage}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setTeamErrorMessage("");
                      if (teamErrorMessage) {
                        window.location.reload();
                        return;
                      }
                      teamQuery.refetch?.();
                      usersQuery.refetch?.();
                      projectsQuery.refetch?.();
                    }}
                    className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-100"
                  >
                    {t("app.retry")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <TeamHeader
            loading={teamQuery.isLoading || usersQuery.isLoading || projectsQuery.isLoading || isCreating}
            stats={teamStats}
            spotlightMembers={orderedTeamMembers}
            actionMember={actionMember}
            onInspect={openProfile}
            onMessageClick={openMessaging}
            onMemberDragStart={handleMemberDragStart}
            onMemberDragOver={handleMemberDragOver}
            onMemberDrop={handleMemberDrop}
            onMemberDragEnd={handleMemberDragEnd}
            draggedMemberId={dragState.draggedId}
            dropTargetMemberId={dragState.targetId}
          />

          <div className="flex w-full flex-col gap-8 px-6 pb-10 md:px-8 xl:px-10">
            <div
              ref={chatSectionRef}
              className={`grid w-full scroll-mt-6 grid-cols-1 gap-6 ${canManageTeam ? "xl:grid-cols-[360px_minmax(0,1fr)]" : "xl:grid-cols-1"}`}
            >
              {canManageTeam ? (
                <TeamDirectoryManager
                  members={orderedTeamMembers}
                  userOptions={userOptions}
                  isSubmitting={isCreating || isUpdating}
                  onCreate={handleCreateMember}
                  onUpdate={handleUpdateMember}
                  onDelete={openDeleteMemberConfirm}
                  onSelectMember={setSelectedMember}
                />
              ) : null}

              <TeamConversationPanel
                member={routeChatMember || selectedMember}
                dropPreviewMember={
                  orderedTeamMembers.find(
                    (member) => String(member.id) === String(dragState.draggedId || "")
                  ) || null
                }
                isDropActive={dragState.overChatPanel}
                onPanelDragOver={handleChatPanelDragOver}
                onPanelDragLeave={handleChatPanelDragLeave}
                onPanelDrop={handleChatPanelDrop}
              />
            </div>

            <div className="flex min-w-0 flex-col items-start gap-8">
              <TeamList
                title={t("team.activeProjectMembers")}
                count={activeProjectMembers.length}
                icon={<FeatherBriefcase size={20} />}
                members={activeProjectMembers}
                variant="busy"
                onDelete={openDeleteMemberConfirm}
                onInspect={openProfile}
                onMessageClick={openMessaging}
                canManage={canManageTeam}
                emptyMessage={t("team.noBusyMembers")}
                onMemberDragStart={handleMemberDragStart}
                onMemberDragOver={handleMemberDragOver}
                onMemberDrop={handleMemberDrop}
                onMemberDragEnd={handleMemberDragEnd}
                draggedMemberId={dragState.draggedId}
                dropTargetMemberId={dragState.targetId}
              />

              <TeamList
                title={t("team.availableMembers")}
                count={availableMembers.length}
                icon={<FeatherCoffee size={20} />}
                members={availableMembers}
                variant="available"
                onDelete={openDeleteMemberConfirm}
                onInspect={openProfile}
                onMessageClick={openMessaging}
                canManage={canManageTeam}
                emptyMessage={t("team.noAvailableMembers")}
                onMemberDragStart={handleMemberDragStart}
                onMemberDragOver={handleMemberDragOver}
                onMemberDrop={handleMemberDrop}
                onMemberDragEnd={handleMemberDragEnd}
                draggedMemberId={dragState.draggedId}
                dropTargetMemberId={dragState.targetId}
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

      <ConfirmDialog
        open={Boolean(confirmMember)}
        title={t("team.deleteMember")}
        description={
          confirmMember
            ? `${confirmMember.employee_name}: ${t("team.confirmDelete")}`
            : ""
        }
        onClose={() => setConfirmMemberId(null)}
        onConfirm={() => {
          if (confirmMemberId) {
            handleDeleteMember(confirmMemberId);
          }
        }}
      />
    </div>
  );
}

export default Team;
