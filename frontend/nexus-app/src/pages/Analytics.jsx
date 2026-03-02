"use client";
import React, { useState } from "react";
import { useList } from "@refinedev/core";
import Sidebar from "../component/layout/Sidebar";
import AnalyticsHeader from "../component/analytics/AnalyticsHeader";
import LanguageChart from "../component/analytics/LanguageChart";
import SentimentChart from "../component/analytics/SentimentChart";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { FeatherTrendingUp } from "@subframe/core";

function Analytics() {
  const [searchTerm, setSearchTerm] = useState("");
  const { result: snippetsResult } = useList({ resource: "snippets" });

  const snippets = snippetsResult?.data ?? [];

  const filteredSnippets = snippets.filter((snippet) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (snippet.title || "").toLowerCase().includes(q) ||
      (snippet.language || "").toLowerCase().includes(q) ||
      (snippet.description || "").toLowerCase().includes(q)
    );
  });

  const languageData = filteredSnippets.reduce((acc, snippet) => {
    const lang = snippet.language || "Unknown";
    const found = acc.find((item) => item.name === lang);
    if (found) {
      found.value += 1;
    } else {
      acc.push({ name: lang, value: 1 });
    }
    return acc;
  }, []);

  const sentimentData = [
    { name: "Memnun", value: 70, color: "#9333ea" },
    { name: "Nötr", value: 20, color: "#3b82f6" },
    { name: "Mutsuz", value: 10, color: "#ec4899" },
  ];

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeItem="analytics"
        showTeamSubmenu={true}
        logoClickable={true}
      />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">
        <TopbarWithRightNav
          className="border-b border-solid border-neutral-border bg-white px-8 py-3"
          leftSlot={
            <Badge variant="neutral" icon={<FeatherTrendingUp />}>
              Analytics Workspace
            </Badge>
          }
          rightSlot={<Badge variant="success">Canlı Veri</Badge>}
        />

        <AnalyticsHeader
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex w-full flex-col items-start gap-8 px-8 py-8">
          <div className="grid w-full grid-cols-12 gap-8">
            <LanguageChart data={languageData} />
            <SentimentChart data={sentimentData} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
