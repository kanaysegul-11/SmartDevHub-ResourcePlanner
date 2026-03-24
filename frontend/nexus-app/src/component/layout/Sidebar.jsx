"use client";

import React, { useState } from "react";
import { useLogout } from "@refinedev/core";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FeatherChevronDown,
  FeatherCode,
  FeatherFolderKanban,
  FeatherLayout,
  FeatherLogOut,
  FeatherPlus,
  FeatherSettings,
  FeatherTarget,
  FeatherTrendingUp,
  FeatherUsers,
  FeatherZap,
} from "@subframe/core";

import { useUser } from "../../UserContext.jsx";
import { useI18n } from "../../I18nContext.jsx";
import { Avatar } from "../../ui/components/Avatar";
import { SidebarWithSections } from "../../ui/components/SidebarWithSections";

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
  const [isLibraryHovered, setIsLibraryHovered] = useState(false);
  const [isTeamHovered, setIsTeamHovered] = useState(false);

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

  return (
    <SidebarWithSections
      className="z-20 m-4 mr-0 w-[272px] flex-none self-stretch overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] [&_.border-neutral-border]:border-white/10 [&_.text-subtext-color]:text-slate-500"
      header={
        <div
          className={`flex w-full items-center gap-3 ${
            logoClickable ? "cursor-pointer" : ""
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
                className={`text-[10px] font-bold uppercase text-slate-400 ${
                  logoutVariant === "danger" ? "group-hover:text-red-500" : ""
                }`}
              >
                {userData.email || ""}
              </span>
            ) : null}
            <span
              className={`text-xs text-slate-400 ${
                logoutVariant === "danger"
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
        <SidebarWithSections.NavItem
          className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
          selected={resolvedActive === "dashboard"}
          icon={<FeatherLayout />}
          onClick={() => navigate("/dashboard")}
        >
          {t("sidebar.dashboard")}
        </SidebarWithSections.NavItem>

        {menuPreset === "full" ? (
          showTeamSubmenu ? (
            <div
              className="flex w-full flex-col gap-1"
              onMouseEnter={() => setIsTeamHovered(true)}
              onMouseLeave={() => setIsTeamHovered(false)}
            >
              <SidebarWithSections.NavItem
                className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400 "
                selected={isTeamHovered || resolvedActive === "team"}
                icon={<FeatherUsers />}
                rightSlot={
                  <FeatherChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${
                      isTeamHovered ? "rotate-180" : ""
                    }`}
                  />
                }
                onClick={() => navigate("/team")}
              >
                {t("sidebar.team")}
              </SidebarWithSections.NavItem>
              <div
                className={`flex flex-col gap-1 overflow-hidden pl-9 transition-all duration-300 ${
                  isTeamHovered
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
        ) : null}

        {menuPreset === "full" ? (
          <SidebarWithSections.NavItem
            className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
            selected={resolvedActive === "projects"}
            icon={<FeatherFolderKanban />}
            onClick={() => navigate("/projects")}
          >
            {t("sidebar.projects")}
          </SidebarWithSections.NavItem>
        ) : null}

        {menuPreset === "full" ? (
          <SidebarWithSections.NavItem
            className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
            selected={resolvedActive === "tasks"}
            icon={<FeatherTarget />}
            onClick={() => navigate("/tasks")}
          >
            {t("sidebar.tasks")}
          </SidebarWithSections.NavItem>
        ) : null}

        {menuPreset === "full" ? (
          <div
            className="flex w-full flex-col gap-1"
            onMouseEnter={() => setIsLibraryHovered(true)}
            onMouseLeave={() => setIsLibraryHovered(false)}
          >
            <SidebarWithSections.NavItem
              className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
              selected={isLibraryHovered || resolvedActive === "snippets"}
              icon={<FeatherCode />}
              rightSlot={
                <FeatherChevronDown
                  size={14}
                  className={`transition-transform duration-300 ${
                    isLibraryHovered ? "rotate-180" : ""
                  }`}
                />
              }
              onClick={() => navigate("/snippets")}
            >
              {t("sidebar.codeLibrary")}
            </SidebarWithSections.NavItem>
            <div
              className={`flex flex-col gap-1 overflow-hidden pl-9 transition-all duration-300 ${
                isLibraryHovered
                  ? "mb-2 max-h-20 opacity-100"
                  : "pointer-events-none max-h-0 opacity-0"
              }`}
            >
              <button
                onClick={() => navigate("/add-snippets")}
                className={submenuLinkClass}
              >
                <FeatherPlus size={14} /> {t("sidebar.createSnippet")}
              </button>
            </div>
          </div>
        ) : null}

        {menuPreset === "full" ? (
          <SidebarWithSections.NavItem
            className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
            selected={resolvedActive === "analytics"}
            icon={<FeatherTrendingUp />}
            onClick={() => navigate("/analytics")}
          >
            {t("sidebar.analytics")}
          </SidebarWithSections.NavItem>
        ) : null}
      </SidebarWithSections.NavSection>

      <SidebarWithSections.NavSection label={t("sidebar.account")}>
        <SidebarWithSections.NavItem
          className="rounded-2xl text-slate-300  [&_.text-neutral-600]:text-slate-400"
          selected={resolvedActive === "settings"}
          icon={<FeatherSettings />}
          onClick={() => navigate("/settings")}
        >
          {t("sidebar.settings")}
        </SidebarWithSections.NavItem>
      </SidebarWithSections.NavSection>
    </SidebarWithSections>
  );
}

export default Sidebar;
