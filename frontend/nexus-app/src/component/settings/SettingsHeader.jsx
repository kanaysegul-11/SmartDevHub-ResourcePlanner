"use client";
import React from "react";
import { FeatherCheck } from "@subframe/core";

function SettingsHeader({ successMsg }) {
  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-4 border-b bg-white px-8 py-5 shadow-sm">
      <div className="grow">
        <h1 className="block text-2xl font-black tracking-tight text-slate-800">Ayarlar</h1>
        <p className="text-sm font-medium text-slate-500">
          Hesap tercihlerini ve güvenlik yapılandırmalarını buradan yönet.
        </p>
      </div>
      {successMsg ? (
        <div className="animate-in fade-in flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-4 py-2 text-green-600">
          <FeatherCheck size={16} />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      ) : null}
    </div>
  );
}

export default SettingsHeader;
