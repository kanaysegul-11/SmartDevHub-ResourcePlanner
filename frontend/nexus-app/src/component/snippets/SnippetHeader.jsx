"use client";
import React from "react";
import { FeatherSearch } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

function SnippetHeader({ searchTerm, onSearchChange }) {
  const { t } = useI18n();
  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-4 border-b bg-white px-8 py-5">
      <div className="grow">
        <span className="block text-2xl font-bold text-slate-800">{t("snippets.libraryTitle")}</span>
        <span className="text-sm text-slate-500">{t("snippets.librarySubtitle")}</span>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><FeatherSearch size={16} /></div>
        <input type="text" placeholder={t("snippets.searchPlaceholder")} className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm transition-all focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400" value={searchTerm} onChange={onSearchChange} />
      </div>
    </div>
  );
}

export default SnippetHeader;

