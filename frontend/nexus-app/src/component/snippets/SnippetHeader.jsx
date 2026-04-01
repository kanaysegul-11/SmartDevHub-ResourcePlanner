"use client";
import React from "react";
import { FeatherSearch } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

function SnippetHeader({
  searchTerm,
  onSearchChange,
  activeView = "all",
  onViewChange,
  allCount = 0,
  mineCount = 0,
}) {
  const { t } = useI18n();

  const viewOptions = [
    { key: "all", label: t("snippets.allSnippets"), count: allCount },
    { key: "mine", label: t("snippets.mySnippets"), count: mineCount },
  ];

  return (
    <div className="sticky top-0 z-10 flex w-full flex-col gap-4 border-b bg-white px-8 py-5 xl:flex-row xl:items-center">
      <div className="grow">
        <span className="block text-2xl font-bold text-slate-800">{t("snippets.libraryTitle")}</span>
        <span className="text-sm text-slate-500">{t("snippets.librarySubtitle")}</span>
      </div>

      <div className="flex flex-col gap-3 xl:items-end">
        <div className="flex flex-wrap items-center gap-2">
          {viewOptions.map((option) => {
            const isActive = option.key === activeView;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onViewChange?.(option.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                    isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><FeatherSearch size={16} /></div>
          <input type="text" placeholder={t("snippets.searchPlaceholder")} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 sm:w-72" value={searchTerm} onChange={onSearchChange} />
        </div>
      </div>
    </div>
  );
}

export default SnippetHeader;
