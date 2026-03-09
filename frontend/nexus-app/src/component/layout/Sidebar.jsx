"use client";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../../ui/components/Avatar";
import { SidebarWithSections } from "../../ui/components/SidebarWithSections";
import { useUser } from "../../UserContext.jsx";
import {
  FeatherZap,
  FeatherLayout,
  FeatherTrendingUp,
  FeatherUsers,
  FeatherLogOut,
  FeatherCode,
  FeatherPlus,
  FeatherChevronDown,
  FeatherSettings,
} from "@subframe/core";

function Sidebar({
  activeItem,
  showTeamSubmenu = false,
  showUserEmail = false,
  logoutVariant = "default",
  logoClickable = false,
  menuPreset = "full",
}) {
  const navigate = useNavigate();
  const { userData } = useUser();
  const [isLibraryHovered, setIsLibraryHovered] = useState(false);
  const [isTeamHovered, setIsTeamHovered] = useState(false);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  const resolvedActive =
    activeItem ||
    (pathname === "/" || pathname === "/dashboard"
        ? "dashboard"
        : pathname === "/puck" || pathname === "/admin/layout-editor"
        ? "puck"
      : pathname === "/team"
        ? "team"
        : pathname.includes("snippets")
          ? "snippets"
          : pathname === "/analytics"
            ? "analytics"
            : pathname === "/settings"
              ? "settings"
              : "");

  const logoutContainerClass =
    logoutVariant === "danger"
      ? "hover:bg-red-50 group transition-colors"
      : "hover:bg-brand-50";
  const logoutIconClass =
    logoutVariant === "danger"
      ? "text-slate-300 group-hover:text-red-500"
      : "text-slate-400";
  const submenuLinkClass =
    "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-500 transition-colors hover:bg-neutral-50 hover:text-brand-700";

  return (
    <SidebarWithSections
      className="z-20 w-64 flex-none self-stretch bg-white shadow-lg"
      header={
        <div
          className={`flex w-full items-center gap-3 ${logoClickable ? "cursor-pointer" : ""}`}
          onClick={logoClickable ? () => navigate("/dashboard") : undefined}
        >
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
            <FeatherZap className="text-[20px] text-white" />
          </div>
          <span className="text-xl font-bold">Nexus</span>
        </div>
      }
      footer={
        <div
          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${logoutContainerClass}`}
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
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
            <span className="text-sm font-bold text-slate-700">
              {userData.username || "Kullanici"}
            </span>
            {showUserEmail ? (
              <span
                className={`text-[10px] font-bold uppercase text-slate-400 ${logoutVariant === "danger" ? "group-hover:text-red-500" : ""}`}
              >
                {userData.email || ""}
              </span>
            ) : null}
            <span
              className={`text-xs text-slate-400 ${logoutVariant === "danger" ? "text-[10px] font-bold uppercase group-hover:text-red-500" : ""}`}
            >
              Çıkış Yap
            </span>
          </div>
          <FeatherLogOut className={logoutIconClass} size={16} />
        </div>
      }
    >
      <SidebarWithSections.NavSection label="Genel">
        <SidebarWithSections.NavItem
          selected={resolvedActive === "dashboard"}
          icon={<FeatherLayout />}
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </SidebarWithSections.NavItem>

        {menuPreset === "full" ? (
          showTeamSubmenu ? (
            <div
              className="flex w-full flex-col gap-1"
              onMouseEnter={() => setIsTeamHovered(true)}
              onMouseLeave={() => setIsTeamHovered(false)}
            >
              <SidebarWithSections.NavItem
                selected={isTeamHovered || resolvedActive === "team"}
                icon={<FeatherUsers />}
                rightSlot={
                  <FeatherChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${isTeamHovered ? "rotate-180" : ""}`}
                  />
                }
                onClick={() => navigate("/team")}
              >
                Team
              </SidebarWithSections.NavItem>
              <div
                className={`flex flex-col gap-1 overflow-hidden pl-9 transition-all duration-300 ${isTeamHovered ? "mb-2 max-h-20 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
              >
                <button
                  onClick={() => navigate("/add-member")}
                  className={submenuLinkClass}
                >
                  <FeatherPlus size={14} /> Create Member
                </button>
              </div>
            </div>
          ) : (
            <SidebarWithSections.NavItem
              selected={resolvedActive === "team"}
              icon={<FeatherUsers />}
              onClick={() => navigate("/team")}
            >
              Team
            </SidebarWithSections.NavItem>
          )
        ) : null}

        {menuPreset === "full" ? (
          <div
            className="flex w-full flex-col gap-1"
            onMouseEnter={() => setIsLibraryHovered(true)}
            onMouseLeave={() => setIsLibraryHovered(false)}
          >
            <SidebarWithSections.NavItem
              selected={isLibraryHovered || resolvedActive === "snippets"}
              icon={<FeatherCode />}
              rightSlot={
                <FeatherChevronDown
                  size={14}
                  className={`transition-transform duration-300 ${isLibraryHovered ? "rotate-180" : ""}`}
                />
              }
              onClick={() => navigate("/snippets")}
            >
              Code Library
            </SidebarWithSections.NavItem>
            <div
              className={`flex flex-col gap-1 overflow-hidden pl-9 transition-all duration-300 ${isLibraryHovered ? "mb-2 max-h-20 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
            >
              <button
                onClick={() => navigate("/add-snippets")}
                className={submenuLinkClass}
              >
                <FeatherPlus size={14} /> Create Snippet
              </button>
            </div>
          </div>
        ) : null}

        {menuPreset === "full" ? (
          <SidebarWithSections.NavItem
            selected={resolvedActive === "analytics"}
            icon={<FeatherTrendingUp />}
            onClick={() => navigate("/analytics")}
          >
            Analytics
          </SidebarWithSections.NavItem>
        ) : null}

      </SidebarWithSections.NavSection>

      <SidebarWithSections.NavSection label="Hesap">
        <SidebarWithSections.NavItem
          selected={resolvedActive === "settings"}
          icon={<FeatherSettings />}
          onClick={() => navigate("/settings")}
        >
          Settings
        </SidebarWithSections.NavItem>
      </SidebarWithSections.NavSection>
    </SidebarWithSections>
  );
}

export default Sidebar;