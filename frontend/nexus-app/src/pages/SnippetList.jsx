"use client";
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useList } from "@refinedev/core";
import Sidebar from "../component/layout/Sidebar";
import SnippetHeader from "../component/snippets/SnippetHeader";
import SnippetGrid from "../component/snippets/SnippetGrid";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { FeatherCode, FeatherPlus, FeatherSearch } from "@subframe/core";
import { useI18n } from "../I18nContext.jsx";
import { useUser } from "../UserContext.jsx";
import { getSessionValue } from "../refine/sessionStorage.js";

const EMPTY_SNIPPETS = [];

function SnippetList() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { userData } = useUser();
  const snippetsQuery = useList({
    resource: "snippets",
    queryOptions: {
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  });
  const snippets = useMemo(
    () => snippetsQuery.data?.data ?? EMPTY_SNIPPETS,
    [snippetsQuery.data]
  );
  const activeView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("view") === "mine" ? "mine" : "all";
  }, [location.search]);

  const currentUserId = String(userData?.id || getSessionValue("user_id") || "").trim();
  const currentUsername = String(
    userData?.username || getSessionValue("username") || ""
  )
    .trim()
    .toLowerCase();

  const isCurrentUserSnippet = (snippet) => {
    const authorId = String(snippet.author_details?.id || "").trim();
    const authorUsername = String(snippet.author_details?.username || "")
      .trim()
      .toLowerCase();

    if (currentUserId && authorId && currentUserId === authorId) {
      return true;
    }

    return Boolean(currentUsername && authorUsername && currentUsername === authorUsername);
  };

  const uniqueSnippets = useMemo(() => {
    const uniqueItems = [];
    const seenCodes = new Set();

    snippets.forEach((item) => {
      const normalizedCode = item.code?.trim();
      if (!seenCodes.has(normalizedCode)) {
        seenCodes.add(normalizedCode);
        uniqueItems.push(item);
      }
    });

    return uniqueItems;
  }, [snippets]);

  const mySnippets = useMemo(
    () => uniqueSnippets.filter((snippet) => isCurrentUserSnippet(snippet)),
    [currentUserId, currentUsername, uniqueSnippets]
  );

  const filteredSnippets = useMemo(() => {
    const scopedSnippets = activeView === "mine" ? mySnippets : uniqueSnippets;
    const lowerSearch = searchTerm.toLowerCase().trim();
    if (!lowerSearch) return scopedSnippets;
    return scopedSnippets.filter((s) =>
      s.title?.toLowerCase().includes(lowerSearch) ||
      s.language?.toLowerCase().includes(lowerSearch) ||
      s.description?.toLowerCase().includes(lowerSearch) ||
      s.code?.toLowerCase().includes(lowerSearch)
    );
  }, [activeView, mySnippets, searchTerm, uniqueSnippets]);

  const handleViewChange = (nextView) => {
    const params = new URLSearchParams(location.search);

    if (nextView === "mine") {
      params.set("view", "mine");
    } else {
      params.delete("view");
    }

    navigate({
      pathname: "/snippets",
      search: params.toString() ? `?${params.toString()}` : "",
    });
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar activeItem="snippets" showTeamSubmenu={true} logoClickable={true} />
      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">
        <TopbarWithRightNav
          className="border-b border-solid border-neutral-border bg-white px-8 py-3"
          leftSlot={<Badge variant="neutral" icon={<FeatherCode />}>{t("snippets.workspace")}</Badge>}
          rightSlot={<Badge variant={filteredSnippets.length === 0 && searchTerm ? "error" : "success"}>{filteredSnippets.length} {t("snippets.resultsFound")}</Badge>}
        />
        {snippetsQuery.isLoading && !snippetsQuery.data ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
            <p className="font-bold italic text-purple-600">{t("snippets.loading")}</p>
          </div>
        ) : (
          <>
            <SnippetHeader
              searchTerm={searchTerm}
              onSearchChange={(e) => setSearchTerm(e.target.value)}
              activeView={activeView}
              onViewChange={handleViewChange}
              allCount={uniqueSnippets.length}
              mineCount={mySnippets.length}
            />
            {filteredSnippets.length === 0 && activeView === "mine" && !searchTerm.trim() ? (
              <div className="flex w-full flex-col items-center justify-center gap-4 px-8 py-20 text-center">
                <div className="rounded-full border border-sky-100 bg-sky-50 p-4 text-sky-700 shadow-[0_18px_40px_rgba(56,189,248,0.14)]">
                  <FeatherPlus size={28} />
                </div>
                <div className="max-w-xl">
                  <p className="text-2xl font-black tracking-tight text-slate-900">
                    {t("snippets.emptyMineTitle")}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {t("snippets.emptyMineBody")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/add-snippets")}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  {t("snippets.createFirstSnippet")}
                </button>
              </div>
            ) : filteredSnippets.length === 0 && searchTerm ? (
              <div className="flex w-full flex-col items-center justify-center py-20 text-slate-400">
                <FeatherSearch size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">"{searchTerm}" {t("snippets.noResultsFor")}.</p>
                <button onClick={() => setSearchTerm("")} className="mt-2 text-purple-600 hover:underline">{t("snippets.clearSearch")}</button>
              </div>
            ) : (
              <SnippetGrid
                snippets={filteredSnippets}
                onSnippetClick={(snippet) => navigate(`/snippets/${snippet.id}`)}
                onSnippetEdit={(snippet) => navigate(`/snippets/${snippet.id}/edit`)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SnippetList;
