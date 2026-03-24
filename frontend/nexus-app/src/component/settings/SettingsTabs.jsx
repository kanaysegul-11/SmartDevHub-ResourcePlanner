"use client";
import React from "react";
import { FeatherBell, FeatherGlobe, FeatherLock, FeatherUser } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

function SettingsTabs({ activeTab, onTabChange }) {
  const { t } = useI18n();

  const tabs = [
    { id: "profile", label: t("settings.profileTab"), icon: <FeatherUser size={18} /> },
    { id: "security", label: t("settings.securityTab"), icon: <FeatherLock size={18} /> },
    { id: "notifications", label: t("settings.notificationsTab"), icon: <FeatherBell size={18} /> },
    { id: "language", label: t("settings.languageTab"), icon: <FeatherGlobe size={18} /> },
  ];

  return (
    <div className="flex w-72 flex-none flex-col gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold transition-all ${
            activeTab === tab.id
              ? "border border-sky-100 bg-white text-sky-600 shadow-md"
              : "text-slate-400 hover:bg-white/50 hover:text-slate-600"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default SettingsTabs;

