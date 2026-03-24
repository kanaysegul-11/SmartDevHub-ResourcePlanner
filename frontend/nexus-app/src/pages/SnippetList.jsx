"use client";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList } from "@refinedev/core";
import Sidebar from "../component/layout/Sidebar";
import SnippetHeader from "../component/snippets/SnippetHeader";
import SnippetGrid from "../component/snippets/SnippetGrid";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { FeatherCode, FeatherSearch } from "@subframe/core";
import { useI18n } from "../I18nContext.jsx";

function SnippetList() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { t } = useI18n();
  const snippetsQuery = useList({ resource: "snippets" });
  const snippets = snippetsQuery.data?.data ?? [];

  const filteredSnippets = useMemo(() => {
    const uniqueItems = [];
    const seenCodes = new Set();
    snippets.forEach((item) => {
      const normalizedCode = item.code?.trim();
      if (!seenCodes.has(normalizedCode)) {
        seenCodes.add(normalizedCode);
        uniqueItems.push(item);
      }
    });
    const lowerSearch = searchTerm.toLowerCase().trim();
    if (!lowerSearch) return uniqueItems;
    return uniqueItems.filter((s) =>
      s.title?.toLowerCase().includes(lowerSearch) ||
      s.language?.toLowerCase().includes(lowerSearch) ||
      s.description?.toLowerCase().includes(lowerSearch) ||
      s.code?.toLowerCase().includes(lowerSearch)
    );
  }, [snippets, searchTerm]);

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar activeItem="snippets" showTeamSubmenu={true} logoClickable={true} />
      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">
        <TopbarWithRightNav
          className="border-b border-solid border-neutral-border bg-white px-8 py-3"
          leftSlot={<Badge variant="neutral" icon={<FeatherCode />}>{t("snippets.workspace")}</Badge>}
          rightSlot={<Badge variant={filteredSnippets.length === 0 && searchTerm ? "error" : "success"}>{filteredSnippets.length} {t("snippets.resultsFound")}</Badge>}
        />
        {snippetsQuery.isLoading || snippetsQuery.isFetching ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
            <p className="font-bold italic text-purple-600">{t("snippets.loading")}</p>
          </div>
        ) : (
          <>
            <SnippetHeader searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)} />
            {filteredSnippets.length === 0 && searchTerm ? (
              <div className="flex w-full flex-col items-center justify-center py-20 text-slate-400">
                <FeatherSearch size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">"{searchTerm}" {t("snippets.noResultsFor")}.</p>
                <button onClick={() => setSearchTerm("")} className="mt-2 text-purple-600 hover:underline">{t("snippets.clearSearch")}</button>
              </div>
            ) : (
              <SnippetGrid snippets={filteredSnippets} onSnippetClick={(snippet) => navigate(`/snippets/${snippet.id}`)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SnippetList;

