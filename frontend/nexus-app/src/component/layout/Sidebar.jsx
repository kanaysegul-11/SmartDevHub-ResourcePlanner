"use client";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../../ui/components/Avatar";
import { Button } from "../../ui/components/Button";
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

  const resolvedActive = activeItem || (
    pathname === "/"
      ? "dashboard"
      : pathname === "/team"
        ? "team"
        : pathname.includes("snippets")
          ? "snippets"
          : pathname === "/analytics"
            ? "analytics"
            : pathname === "/settings"
              ? "settings"
              : ""
  );

  const logoutContainerClass =
    logoutVariant === "danger"
      ? "hover:bg-red-50 group transition-colors"
      : "hover:bg-purple-50";
  const logoutIconClass =
    logoutVariant === "danger"
      ? "text-slate-300 group-hover:text-red-500"
      : "text-slate-400";

  return (
    <div className="z-20 flex w-64 flex-none flex-col items-start justify-between self-stretch border-r border-solid border-neutral-200 bg-white px-4 py-6 shadow-lg">
      <div className="flex w-full flex-col items-start gap-8">
        <div
          className={`flex w-full items-center gap-3 px-2 ${logoClickable ? "cursor-pointer" : ""}`}
          onClick={logoClickable ? () => navigate("/") : undefined}
        >
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
            <FeatherZap className="text-white text-[20px]" />
          </div>
          <span className="text-xl font-bold">Nexus</span>
        </div>
        <div className="flex w-full flex-col items-start gap-1">
          <Button
            className={`w-full justify-start rounded-lg ${resolvedActive === "dashboard" ? "bg-purple-50 text-purple-600 font-bold" : ""}`}
            variant="neutral-tertiary"
            icon={<FeatherLayout />}
            onClick={() => navigate("/")}
          >
            Dashboard
          </Button>
          {menuPreset === "full" ? (showTeamSubmenu ? (
            <div
              className="flex w-full flex-col gap-1"
              onMouseEnter={() => setIsTeamHovered(true)}
              onMouseLeave={() => setIsTeamHovered(false)}
            >
              <Button
                className={`w-full justify-start rounded-lg transition-all ${isTeamHovered || resolvedActive === "team" ? "bg-purple-50 text-purple-600 font-bold" : ""}`}
                variant="neutral-tertiary"
                icon={<FeatherUsers />}
                onClick={() => navigate("/team")}
              >
                <div className="flex w-full items-center justify-between">
                  <span>Team</span>
                  <FeatherChevronDown size={14} className={`transition-transform duration-300 ${isTeamHovered ? "rotate-180" : ""}`} />
                </div>
              </Button>
              <div className={`flex flex-col gap-1 overflow-hidden pl-9 transition-all duration-300 ${isTeamHovered ? "mb-2 max-h-20 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}>
                <button
                  onClick={() => navigate("/add-member")}
                  className="flex items-center gap-2 py-2 text-left text-sm font-semibold text-slate-500 transition-colors hover:text-purple-600"
                >
                  <FeatherPlus size={14} /> Create Member
                </button>
              </div>
            </div>
          ) : (
            <Button
              className={`w-full justify-start rounded-lg ${resolvedActive === "team" ? "bg-purple-50 text-purple-600 font-bold" : ""}`}
              variant="neutral-tertiary"
              icon={<FeatherUsers />}
              onClick={() => navigate("/team")}
            >
              Team
            </Button>
          )) : null}
          {menuPreset === "full" ? (
          <div
            className="flex w-full flex-col gap-1"
            onMouseEnter={() => setIsLibraryHovered(true)}
            onMouseLeave={() => setIsLibraryHovered(false)}
          >
            <Button
              className={`w-full justify-start rounded-lg transition-colors ${isLibraryHovered || resolvedActive === "snippets" ? "bg-purple-50 text-purple-600" : ""}`}
              variant="neutral-tertiary"
              icon={<FeatherCode />}
              onClick={() => navigate("/snippets")}
            >
              <div className="flex w-full items-center justify-between">
                <span>Code Library</span>
                <FeatherChevronDown size={14} className={`transition-transform duration-300 ${isLibraryHovered ? "rotate-180" : ""}`} />
              </div>
            </Button>
            <div className={`flex flex-col gap-1 overflow-hidden pl-9 transition-all duration-300 ${isLibraryHovered ? "mb-2 max-h-20 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}>
              <button
                onClick={() => navigate("/add-snippets")}
                className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-purple-600"
              >
                <FeatherPlus size={14} /> Create Snippet
              </button>
            </div>
          </div>
          ) : null}
          {menuPreset === "full" ? (
          <Button
            className={`w-full justify-start rounded-lg ${resolvedActive === "analytics" ? "bg-purple-50 text-purple-600 font-bold" : ""}`}
            variant="neutral-tertiary"
            icon={<FeatherTrendingUp />}
            onClick={() => navigate("/analytics")}
          >
            Analytics
          </Button>
          ) : null}
          <Button
            className={`w-full justify-start rounded-lg ${resolvedActive === "settings" ? "bg-purple-50 text-purple-600 font-bold" : ""}`}
            variant="neutral-tertiary"
            icon={<FeatherSettings />}
            onClick={() => navigate("/settings")}
          >
            Settings
          </Button>
        </div>
      </div>
      <div className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${logoutContainerClass}`} onClick={() => { localStorage.clear(); navigate("/login"); }}>
        <Avatar variant="brand" size="small">
          {userData.avatar ? <img src={userData.avatar} alt="Profile" className="h-full w-full rounded-full object-cover" /> : (userData.username?.[0]?.toUpperCase() || "U")}
        </Avatar>
        <div className="flex grow flex-col">
          <span className="text-sm font-bold text-slate-700">{userData.username || "Kullanici"}</span>
          {showUserEmail ? (
            <span className={`text-[10px] font-bold uppercase text-slate-400 ${logoutVariant === "danger" ? "group-hover:text-red-500" : ""}`}>{userData.email || ""}</span>
          ) : null}
          <span className={`text-xs text-slate-400 ${logoutVariant === "danger" ? "font-bold uppercase group-hover:text-red-500 text-[10px]" : ""}`}>Çıkış Yap</span>
        </div>
        <FeatherLogOut className={logoutIconClass} size={16} />
      </div>
    </div>
  );
}

export default Sidebar;
