"use client";
import React from "react";
import { FeatherCheck } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

function SettingsHeader({ successMsg }) {
  const { t } = useI18n();

  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-4 border-b bg-white px-8 py-5 shadow-sm">
      <div className="grow">
        <h1 className="block text-2xl font-black tracking-tight text-slate-800">
          {t("settings.title")}
        </h1>
        <p className="text-sm font-medium text-slate-500">
          {t("settings.subtitle")}
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

