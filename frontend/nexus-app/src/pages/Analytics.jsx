"use client";
import React, { useState } from "react";
import LanguageLeaderboard from "../component/analytics/Languageleaderboard";
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
  const { result: commentsResult, query: commentsQuery } = useList({
    resource: "comments",
  });

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

  const comments = commentsResult?.data ?? [];
  const isCommentsLoading =
    commentsQuery?.isLoading || commentsQuery?.isFetching || false;

  const ratingBuckets = comments.reduce(
    (acc, comment) => {
      const rating = Number(comment?.experience_rating);
      if (rating >= 4) {
        acc.happy += 1;
      } else if (rating === 3) {
        acc.neutral += 1;
      } else if (rating > 0 && rating <= 2) {
        acc.unhappy += 1;
      }
      return acc;
    },
    { happy: 0, neutral: 0, unhappy: 0 }
  );

  const totalComments = comments.length;
  const toPercent = (count) => {
    if (!totalComments) {
      return 0;
    }
    return Math.round((count / totalComments) * 100);
  };

  const sentimentData = isCommentsLoading
    ? [
        { name: "Memnun", value: 1, color: "#22c55e", percentage: null },
        { name: "Notr", value: 1, color: "#9333ea", percentage: null },
        { name: "Mutsuz", value: 1, color: "#ef4444", percentage: null },
      ]
    : [
        {
          name: "Memnun",
          value: toPercent(ratingBuckets.happy),
          color: "#22c55e",
          percentage: toPercent(ratingBuckets.happy),
        },
        {
          name: "Notr",
          value: toPercent(ratingBuckets.neutral),
          color: "#9333ea",
          percentage: toPercent(ratingBuckets.neutral),
        },
        {
          name: "Mutsuz",
          value: toPercent(ratingBuckets.unhappy),
          color: "#ef4444",
          percentage: toPercent(ratingBuckets.unhappy),
        },
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
          rightSlot={<Badge variant="success">Canli Veri</Badge>}
        />

        <AnalyticsHeader
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex w-full flex-col items-start gap-8 px-8 py-8">
          <div className="grid w-full grid-cols-12 gap-8">
            <LanguageChart data={languageData} />
            <SentimentChart data={sentimentData} isLoading={isCommentsLoading} />
          </div>
          <div className="w-full">
            <LanguageLeaderboard/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
