"use client";
import React from "react";
import { FeatherUser, FeatherLock, FeatherBell } from "@subframe/core";

const tabs = [
  { id: "profile", label: "Profil Bilgileri", icon: <FeatherUser size={18} /> },
  { id: "security", label: "Güvenlik", icon: <FeatherLock size={18} /> },
  { id: "notifications", label: "Bildirimler", icon: <FeatherBell size={18} /> },
];

function SettingsTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex w-72 flex-none flex-col gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold transition-all ${
            activeTab === tab.id
              ? "border border-purple-100 bg-white text-purple-600 shadow-md"
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
