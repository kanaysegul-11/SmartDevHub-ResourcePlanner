"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLogout } from "@refinedev/core";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FeatherBell,
  FeatherChevronDown,
  FeatherCode,
  FeatherFolderKanban,
  FeatherLayout,
  FeatherLogOut,
  FeatherMessageCircle,
  FeatherPlus,
  FeatherSettings,
  FeatherTarget,
  FeatherTrendingUp,
  FeatherUsers,
  FeatherZap,
} from "@subframe/core";

import { useUser } from "../../UserContext.jsx";
import { useI18n } from "../../I18nContext.jsx";
import { apiClient } from "../../refine/axios";
import { NOTIFICATIONS_UPDATED_EVENT } from "../../refine/notifications.js";
import { getSessionValue } from "../../refine/sessionStorage.js";
import { Avatar } from "../../ui/components/Avatar";
import { SidebarWithSections } from "../../ui/components/SidebarWithSections";
import {
  readSidebarOrder,
  reorderSidebarItems,
  writeSidebarOrder,
} from "../../utils/sidebarPreferences.js";

const GENERAL_SECTION_KEY = "general";
const ACCOUNT_SECTION_KEY = "account";

const getDragPlacement = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  return event.clientY < midpoint ? "before" : "after";
};

function Sidebar({
  activeItem,
  showTeamSubmenu = false,
  showUserEmail = false,
  logoutVariant = "default",
  logoClickable = false,
  menuPreset = "full",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: logout } = useLogout();
  const { userData } = useUser();
  const { t } = useI18n();
  const canManageTeam = Boolean(userData?.isAdmin);
  const [isLibraryHovered, setIsLibraryHovered] = useState(false);
  const [isTeamHovered, setIsTeamHovered] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [generalOrder, setGeneralOrder] = useState([]);
  const [accountOrder, setAccountOrder] = useState([]);
  const [dragState, setDragState] = useState({ sectionKey: null, itemId: null });
  const [dropState, setDropState] = useState({
    sectionKey: null,
    targetId: null,
    placement: "after",
  });

  const pathname = location.pathname;
  const resolvedActive =
    activeItem ||
    (pathname === "/" || pathname === "/dashboard"
      ? "dashboard"
      : pathname === "/team" || pathname === "/add-member"
        ? "team"
        : pathname === "/projects"
          ? "projects"
          : pathname === "/tasks"
            ? "tasks"
            : pathname === "/notifications"
              ? "notifications"
              : pathname === "/contact-admin" || pathname === "/administrators"
                ? "administrators"
                : pathname.startsWith("/snippets") || pathname === "/add-snippets"
                  ? "snippets"
                  : pathname === "/analytics"
                    ? "analytics"
                    : pathname === "/settings"
                      ? "settings"
                      : "");

  const logoutContainerClass =
    logoutVariant === "danger"
      ? "group transition-all hover:bg-red-500/10"
      : "group transition-all hover:bg-white/10";
  const logoutIconClass =
    logoutVariant === "danger"
      ? "text-slate-300 group-hover:text-red-500"
      : "text-slate-400";
  const submenuLinkClass =
    "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white";
  const sidebarUserKey = useMemo(
    () =>
      String(
        getSessionValue("user_id") ||
        userData?.username ||
        getSessionValue("username") ||
        "guest"
      ),
    [userData?.username]
  );
  const generalItemIds = useMemo(() => {
    const nextItems = ["dashboard"];

    if (menuPreset === "full") {
      nextItems.push("team", "projects", "tasks", "snippets", "analytics");
    }

    return nextItems;
  }, [menuPreset]);
  const accountItemIds = useMemo(
    () => ["notifications", "administrators", "settings"],
    []
  );

  useEffect(() => {
    setGeneralOrder(
      readSidebarOrder(GENERAL_SECTION_KEY, sidebarUserKey, generalItemIds)
    );
  }, [generalItemIds, sidebarUserKey]);

  useEffect(() => {
    setAccountOrder(
      readSidebarOrder(ACCOUNT_SECTION_KEY, sidebarUserKey, accountItemIds)
    );
  }, [accountItemIds, sidebarUserKey]);

  useEffect(() => {
    let ignore = false;

    const loadUnreadNotificationCount = async () => {
      try {
        const response = await apiClient.get("/notifications/", {
          params: { is_read: false },
        });
        if (!ignore) {
          setUnreadNotificationCount((response.data || []).length);
        }
      } catch {
        if (!ignore) {
          setUnreadNotificationCount(0);
        }
      }
    };

    const handleNotificationsUpdated = (event) => {
      const nextCount = event?.detail?.unreadCount;

      if (typeof nextCount === "number") {
        setUnreadNotificationCount(nextCount);
        return;
      }

      void loadUnreadNotificationCount();
    };

    const handleWindowFocus = () => {
      void loadUnreadNotificationCount();
    };

    void loadUnreadNotificationCount();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdated);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      ignore = true;
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        handleNotificationsUpdated
      );
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [pathname]);

  const updateSectionOrder = (sectionKey, nextOrder) => {
    if (sectionKey === GENERAL_SECTION_KEY) {
      setGeneralOrder(nextOrder);
    } else {
      setAccountOrder(nextOrder);
    }

    writeSidebarOrder(sectionKey, sidebarUserKey, nextOrder);
  };

  const handleDragStart = (sectionKey, itemId) => (event) => {
    setDragState({ sectionKey, itemId });
    setDropState({ sectionKey, targetId: itemId, placement: "after" });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${sectionKey}:${itemId}`);
  };

  const handleDragOver = (sectionKey, targetId) => (event) => {
    event.preventDefault();

    if (dragState.sectionKey !== sectionKey || !dragState.itemId) {
      return;
    }

    const placement = getDragPlacement(event);
    setDropState((prev) => {
      if (
        prev.sectionKey === sectionKey &&
        prev.targetId === targetId &&
        prev.placement === placement
      ) {
        return prev;
      }

      return { sectionKey, targetId, placement };
    });

    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (sectionKey, targetId) => (event) => {
    event.preventDefault();

    if (dragState.sectionKey !== sectionKey || !dragState.itemId) {
      return;
    }

    const placement = getDragPlacement(event);
    const currentOrder =
      sectionKey === GENERAL_SECTION_KEY ? generalOrder : accountOrder;
    const nextOrder = reorderSidebarItems(
      currentOrder,
      dragState.itemId,
      targetId,
      placement
    );

    updateSectionOrder(sectionKey, nextOrder);
    setDragState({ sectionKey: null, itemId: null });
    setDropState({ sectionKey: null, targetId: null, placement: "after" });
  };

  const handleDragEnd = () => {
    setDragState({ sectionKey: null, itemId: null });
    setDropState({ sectionKey: null, targetId: null, placement: "after" });
  };

  const renderDraggableItem = (sectionKey, itemId, content) => {
    const isDragging =
      dragState.sectionKey === sectionKey && dragState.itemId === itemId;
    const showDropBefore =
      dropState.sectionKey === sectionKey &&
      dropState.targetId === itemId &&
      dropState.placement === "before" &&
      dragState.itemId !== itemId;
    const showDropAfter =
      dropState.sectionKey === sectionKey &&
      dropState.targetId === itemId &&
      dropState.placement === "after" &&
      dragState.itemId !== itemId;

    return (
      <div
        key={itemId}
        draggable
        onDragStart={handleDragStart(sectionKey, itemId)}
        onDragOver={handleDragOver(sectionKey, itemId)}
        onDrop={handleDrop(sectionKey, itemId)}
        onDragEnd={handleDragEnd}
        className={`relative w-full cursor-grab active:cursor-grabbing ${isDragging ? "opacity-65" : ""
          }`}
      >
        {showDropBefore ? (
          <div className="pointer-events-none absolute inset-x-0 -top-1 h-0.5 rounded-full bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,0.14)]" />
        ) : null}
        {content}
        {showDropAfter ? (
          <div className="pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,0.14)]" />
        ) : null}
      </div>
    );
  };

  const orderedGeneralItems = useMemo(
    () =>
      generalOrder.length
        ? generalOrder
        : readSidebarOrder(GENERAL_SECTION_KEY, sidebarUserKey, generalItemIds),
    [generalItemIds, generalOrder, sidebarUserKey]
  );

  const orderedAccountItems = useMemo(
    () =>
      accountOrder.length
        ? accountOrder
        : readSidebarOrder(ACCOUNT_SECTION_KEY, sidebarUserKey, accountItemIds),
    [accountItemIds, accountOrder, sidebarUserKey]
  );

  const renderGeneralItem = (itemId) => {
    if (itemId === "dashboard") {
      return renderDraggableItem(
        GENERAL_SECTION_KEY,
        itemId,
        <SidebarWithSections.NavItem
          className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
          selected={resolvedActive === "dashboard"}
          icon={<FeatherLayout />}
          onClick={() => navigate("/dashboard")}
        >
          {t("sidebar.dashboard")}
        </SidebarWithSections.NavItem>
      );
    }

    if (menuPreset !== "full") {
      return null;
    }

    if (itemId === "team") {
      return renderDraggableItem(
        GENERAL_SECTION_KEY,
        itemId,
        showTeamSubmenu && canManageTeam ? (
          <div
            className="flex w-full flex-col gap-1"
            onMouseEnter={() => setIsTeamHovered(true)}
            onMouseLeave={() => setIsTeamHovered(false)}
          >
            <SidebarWithSections.NavItem
              className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400 "
              selected={isTeamHovered || resolvedActive === "team"}
              icon={<FeatherUsers />}
              onClick={() => navigate("/team")}
              rightSlot={
                <FeatherChevronDown
                  size={14}
                  className={`transition-transform duration-300 ${isTeamHovered ? "rotate-180" : ""
                    }`}
                />
              }
            >
              {t("sidebar.team")}
            </SidebarWithSections.NavItem>
            <div
              className={`flex flex-col gap-1 overflow-hidden pl-9 transition-all duration-300 ${isTeamHovered
                  ? "mb-2 max-h-20 opacity-100"
                  : "pointer-events-none max-h-0 opacity-0"
                }`}
            >
              <button
                onClick={() => navigate("/add-member")}
                className={submenuLinkClass}
              >
                <FeatherPlus size={14} /> {t("sidebar.createMember")}
              </button>
            </div>
          </div>
        ) : (
          <SidebarWithSections.NavItem
            className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
            selected={resolvedActive === "team"}
            icon={<FeatherUsers />}
            onClick={() => navigate("/team")}
          >
            {t("sidebar.team")}
          </SidebarWithSections.NavItem>
        )
      );
    }

    if (itemId === "projects") {
      return renderDraggableItem(
        GENERAL_SECTION_KEY,
        itemId,
        <SidebarWithSections.NavItem
          className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
          selected={resolvedActive === "projects"}
          icon={<FeatherFolderKanban />}
          onClick={() => navigate("/projects")}
        >
          {t("sidebar.projects")}
        </SidebarWithSections.NavItem>
      );
    }

    if (itemId === "tasks") {
      return renderDraggableItem(
        GENERAL_SECTION_KEY,
        itemId,
        <SidebarWithSections.NavItem
          className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
          selected={resolvedActive === "tasks"}
          icon={<FeatherTarget />}
          onClick={() => navigate("/tasks")}
        >
          {t("sidebar.tasks")}
        </SidebarWithSections.NavItem>
      );
    }

    if (itemId === "snippets") {
      return renderDraggableItem(
        GENERAL_SECTION_KEY,
        itemId,
        <div
          className="flex w-full flex-col gap-1"
          onMouseEnter={() => setIsLibraryHovered(true)}
          onMouseLeave={() => setIsLibraryHovered(false)}
        >
          <SidebarWithSections.NavItem
            className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
            selected={isLibraryHovered || resolvedActive === "snippets"}
            icon={<FeatherCode />}
            onClick={() => navigate("/snippets")}
            rightSlot={
              <FeatherChevronDown
                size={14}
                className={`transition-transform duration-300 ${isLibraryHovered ? "rotate-180" : ""
                  }`}
              />
            }
          >
            {t("sidebar.codeLibrary")}
          </SidebarWithSections.NavItem>
          <div
            className={`flex flex-col gap-1 overflow-hidden pl-9 transition-all duration-300 ${isLibraryHovered
                ? "mb-2 max-h-32 opacity-100"
                : "pointer-events-none max-h-0 opacity-0"
              }`}
          >
            <button
              onClick={() => navigate("/snippets?view=mine")}
              className={submenuLinkClass}
            >
              <FeatherCode size={14} /> {t("sidebar.mySnippets")}
            </button>
            <button
              onClick={() => navigate("/add-snippets")}
              className={submenuLinkClass}
            >
              <FeatherPlus size={14} /> {t("sidebar.createSnippet")}
            </button>
          </div>
        </div>
      );
    }

    if (itemId === "analytics") {
      return renderDraggableItem(
        GENERAL_SECTION_KEY,
        itemId,
        <SidebarWithSections.NavItem
          className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
          selected={resolvedActive === "analytics"}
          icon={<FeatherTrendingUp />}
          onClick={() => navigate("/analytics")}
        >
          {t("sidebar.analytics")}
        </SidebarWithSections.NavItem>
      );
    }

    return null;
  };

  const renderAccountItem = (itemId) => {
    if (itemId === "notifications") {
      return renderDraggableItem(
        ACCOUNT_SECTION_KEY,
        itemId,
        <SidebarWithSections.NavItem
          className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
          selected={resolvedActive === "notifications"}
          icon={<FeatherBell />}
          onClick={() => navigate("/notifications")}
          rightSlot={
            unreadNotificationCount ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-sky-400 px-2 py-0.5 text-[11px] font-black text-slate-950 shadow-[0_8px_18px_rgba(56,189,248,0.35)]">
                {unreadNotificationCount}
              </span>
            ) : null
          }
        >
          {t("sidebar.notifications")}
        </SidebarWithSections.NavItem>
      );
    }

    if (itemId === "administrators") {
      return renderDraggableItem(
        ACCOUNT_SECTION_KEY,
        itemId,
        <SidebarWithSections.NavItem
          className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
          selected={resolvedActive === "administrators"}
          icon={<FeatherMessageCircle />}
          onClick={() => navigate("/administrators")}
        >
          {t("sidebar.administrators")}
        </SidebarWithSections.NavItem>
      );
    }

    if (itemId === "settings") {
      return renderDraggableItem(
        ACCOUNT_SECTION_KEY,
        itemId,
        <SidebarWithSections.NavItem
          className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
          selected={resolvedActive === "settings"}
          icon={<FeatherSettings />}
          onClick={() => navigate("/settings")}
        >
          {t("sidebar.settings")}
        </SidebarWithSections.NavItem>
      );
    }

    return null;
  };

  return (
    <SidebarWithSections
      className="dark-surface z-20 m-4 mr-0 w-[272px] flex-none self-stretch overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] [&_.border-neutral-border]:border-white/10 [&_.text-subtext-color]:text-slate-300"
      header={
        <div
          className={`flex w-full items-center gap-3 ${logoClickable ? "cursor-pointer" : ""
            }`}
          onClick={logoClickable ? () => navigate("/dashboard") : undefined}
        >
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-amber-200 shadow-[0_12px_24px_rgba(56,189,248,0.28)]">
            <FeatherZap className="text-[20px] text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white">Nexus</span>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {t("sidebar.resourcePlanner")}
            </span>
          </div>
        </div>
      }
      footer={
        <div
          className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur ${logoutContainerClass}`}
          onClick={() => logout()}
        >
          <Avatar variant="brand" size="small">
            {userData.avatar ? (
              <img
                src={userData.avatar}
                alt="Profile"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              userData.username?.[0]?.toUpperCase() || "U"
            )}
          </Avatar>
          <div className="flex grow flex-col">
            <span className="text-sm font-bold text-white">
              {userData.username || t("app.user")}
            </span>
            {showUserEmail ? (
              <span
                className={`text-[10px] font-bold uppercase text-slate-400 ${logoutVariant === "danger" ? "group-hover:text-red-500" : ""
                  }`}
              >
                {userData.email || ""}
              </span>
            ) : null}
            <span
              className={`text-xs text-slate-400 ${logoutVariant === "danger"
                  ? "text-[10px] font-bold uppercase group-hover:text-red-500"
                  : ""
                }`}
            >
              {t("sidebar.logout")}
            </span>
          </div>
          <FeatherLogOut className={logoutIconClass} size={16} />
        </div>
      }
    >
      <SidebarWithSections.NavSection label={t("sidebar.general")}>
        {orderedGeneralItems.map(renderGeneralItem)}
      </SidebarWithSections.NavSection>

      <SidebarWithSections.NavSection label={t("sidebar.account")}>
        {orderedAccountItems.map(renderAccountItem)}
      </SidebarWithSections.NavSection>
    </SidebarWithSections>
  );
}

export default Sidebar;
