"use client";

import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { FeatherActivity, FeatherStar, FeatherTarget, FeatherTrendingUp } from "@subframe/core";
import { useNavigate } from "react-router-dom";
import Sidebar from "../component/layout/Sidebar";
import AnalyticsHeader from "../component/analytics/AnalyticsHeader";
import LanguageChart from "../component/analytics/LanguageChart";
import SentimentChart from "../component/analytics/SentimentChart";
import LanguageLeaderboard from "../component/analytics/LanguageLeaderboard";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { useI18n } from "../I18nContext.jsx";

const EMPTY_LIST = [];

function Analytics() {
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const sharedQueryOptions = {
    queryOptions: {
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  };
  const snippetsQuery = useList({ resource: "snippets", ...sharedQueryOptions });
  const commentsQuery = useList({ resource: "comments", ...sharedQueryOptions });

  const snippets = useMemo(
    () => snippetsQuery.data?.data ?? EMPTY_LIST,
    [snippetsQuery.data]
  );
  const comments = useMemo(
    () => commentsQuery.data?.data ?? EMPTY_LIST,
    [commentsQuery.data]
  );
  const filteredSnippets = snippets;

  const filteredSnippetMap = useMemo(
    () => new Map(filteredSnippets.map((snippet) => [snippet.id, snippet])),
    [filteredSnippets]
  );

  const filteredComments = useMemo(
    () => comments.filter((comment) => filteredSnippetMap.has(comment.snippet)),
    [comments, filteredSnippetMap]
  );

  const languageData = useMemo(
    () =>
      filteredSnippets
        .reduce((acc, snippet) => {
          const languageName = snippet.language || t("analytics.unknown");
          const existing = acc.find((item) => item.name === languageName);
          if (existing) existing.value += 1;
          else acc.push({ name: languageName, value: 1 });
          return acc;
        }, [])
        .sort((a, b) => b.value - a.value),
    [filteredSnippets, t]
  );

  const isCommentsLoading = commentsQuery.isLoading || (!commentsQuery.data && commentsQuery.isFetching) || false;
  const ratingBuckets = filteredComments.reduce(
    (acc, comment) => {
      const rating = Number(comment?.experience_rating);
      if (rating >= 4) acc.happy += 1;
      else if (rating === 3) acc.neutral += 1;
      else if (rating > 0 && rating <= 2) acc.unhappy += 1;
      return acc;
    },
    { happy: 0, neutral: 0, unhappy: 0 }
  );

  const totalComments = filteredComments.length;
  const toPercent = (count) => (totalComments ? Math.round((count / totalComments) * 100) : 0);

  const sentimentData = isCommentsLoading
    ? [
        { name: t("analytics.happy"), value: 1, color: "#22c55e", percentage: null },
        { name: t("analytics.neutral"), value: 1, color: "#9333ea", percentage: null },
        { name: t("analytics.unhappy"), value: 1, color: "#ef4444", percentage: null },
      ]
    : [
        { name: t("analytics.happy"), value: toPercent(ratingBuckets.happy), color: "#22c55e", percentage: toPercent(ratingBuckets.happy) },
        { name: t("analytics.neutral"), value: toPercent(ratingBuckets.neutral), color: "#9333ea", percentage: toPercent(ratingBuckets.neutral) },
        { name: t("analytics.unhappy"), value: toPercent(ratingBuckets.unhappy), color: "#ef4444", percentage: toPercent(ratingBuckets.unhappy) },
      ];

  const snippetFeedbackStats = useMemo(() => {
    const feedbackMap = new Map();
    filteredComments.forEach((comment) => {
      const current = feedbackMap.get(comment.snippet) || { count: 0, total: 0, latest: null };
      const createdAt = comment.created_at ? new Date(comment.created_at) : null;
      feedbackMap.set(comment.snippet, {
        count: current.count + 1,
        total: current.total + Number(comment.experience_rating || 0),
        latest:
          createdAt && !Number.isNaN(createdAt.getTime()) && (!current.latest || createdAt > current.latest)
            ? createdAt
            : current.latest,
      });
    });

    return filteredSnippets.map((snippet) => {
      const stats = feedbackMap.get(snippet.id) || { count: 0, total: 0, latest: null };
      return {
        id: snippet.id,
        title: snippet.title || t("analytics.unknown"),
        language: snippet.language || t("analytics.unknown"),
        count: stats.count,
        average: stats.count ? Number((stats.total / stats.count).toFixed(1)) : null,
        latest: stats.latest,
      };
    });
  }, [filteredComments, filteredSnippets, t]);

  const averageRating = totalComments
    ? Number(
        (
          filteredComments.reduce((sum, comment) => sum + Number(comment.experience_rating || 0), 0) / totalComments
        ).toFixed(1)
      )
    : 0;

  const languageRatingStats = useMemo(() => {
    const stats = {};
    filteredComments.forEach((comment) => {
      const snippet = filteredSnippetMap.get(comment.snippet);
      const languageName = snippet?.language || t("analytics.unknown");
      if (!stats[languageName]) stats[languageName] = { total: 0, count: 0 };
      stats[languageName].total += Number(comment.experience_rating || 0);
      stats[languageName].count += 1;
    });

    return Object.entries(stats)
      .map(([name, values]) => ({
        name,
        average: Number((values.total / values.count).toFixed(1)),
        count: values.count,
      }))
      .sort((a, b) => b.average - a.average || b.count - a.count);
  }, [filteredComments, filteredSnippetMap, t]);

  const reviewQueue = [...snippetFeedbackStats]
    .filter((snippet) => snippet.count === 0 || (snippet.average !== null && snippet.average < 3.5))
    .sort((a, b) => {
      if (a.count === 0 && b.count !== 0) return -1;
      if (a.count !== 0 && b.count === 0) return 1;
      return (a.average ?? 0) - (b.average ?? 0);
    })
    .slice(0, 4);

  const topLanguage = languageData[0] || null;
  const bestRatedLanguage = languageRatingStats[0] || null;
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const recentFeedbackCount = filteredComments.filter((comment) => {
    const date = new Date(comment.created_at);
    return !Number.isNaN(date.getTime()) && date >= lastWeekDate;
  }).length;

  const formatDate = (value) => {
    if (!value) return t("analytics.noFeedbackYet");
    return new Intl.DateTimeFormat(language || "en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(value);
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="analytics" showTeamSubmenu={true} logoClickable={true} />

      <div className="relative flex grow flex-col items-start self-stretch overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={<Badge variant="neutral" icon={<FeatherTrendingUp />}>{t("analytics.workspace")}</Badge>}
            rightSlot={<Badge variant="success">{t("analytics.liveData")}</Badge>}
          />

          <div className="flex w-full flex-col items-start gap-6 px-6 md:px-8 xl:px-10">
            <AnalyticsHeader
              totalComments={totalComments}
              averageRating={averageRating}
            />

            <section className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  key: "snippets",
                  label: t("analytics.snippetsTracked"),
                  value: filteredSnippets.length,
                  icon: <FeatherActivity size={18} />,
                  tone: "bg-sky-50 text-sky-700",
                },
                {
                  key: "feedback",
                  label: t("analytics.feedbackEntries"),
                  value: totalComments,
                  icon: <FeatherStar size={18} />,
                  tone: "bg-amber-50 text-amber-700",
                },
                {
                  key: "rating",
                  label: t("analytics.averageRating"),
                  value: `${averageRating.toFixed(1)} / 5`,
                  icon: <FeatherTrendingUp size={18} />,
                  tone: "bg-emerald-50 text-emerald-700",
                },
                {
                  key: "languages",
                  label: t("analytics.languageCoverage"),
                  value: languageData.length,
                  icon: <FeatherTarget size={18} />,
                  tone: "bg-violet-50 text-violet-700",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="rounded-[26px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-5 shadow-[0_18px_40px_rgba(148,163,184,0.14)]"
                >
                  <div className={`inline-flex rounded-2xl p-3 ${item.tone}`}>{item.icon}</div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="dark-surface rounded-[30px] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("analytics.topLanguage")}</p>
                    <p className="mt-3 text-2xl font-black text-white">{topLanguage?.name || t("analytics.unknown")}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {topLanguage ? `${topLanguage.value} ${t("analytics.snippetUnits")}` : t("analytics.noResults")}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("analytics.bestRatedLanguage")}</p>
                    <p className="mt-3 text-2xl font-black text-white">{bestRatedLanguage?.name || t("analytics.unknown")}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {bestRatedLanguage ? `${bestRatedLanguage.average} / 5` : t("analytics.noFeedbackYet")}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("analytics.recentFeedback")}</p>
                    <p className="mt-3 text-2xl font-black text-white">{recentFeedbackCount}</p>
                    <p className="mt-2 text-sm text-slate-300">{t("analytics.last7Days")}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-6 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("analytics.feedbackFlow")}</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t("analytics.feedbackFlowTitle")}</h2>
                <div className="mt-5 space-y-3">
                  {snippetFeedbackStats.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-slate-200/80 bg-white/85 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{item.language}</p>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          {item.count} {t("analytics.commentsCount")}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                        <span>{item.average !== null ? `${t("analytics.avgScore")}: ${item.average} / 5` : t("analytics.noFeedbackYet")}</span>
                        <span>{formatDate(item.latest)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid w-full grid-cols-12 gap-6">
              <LanguageChart data={languageData} />
              <SentimentChart data={sentimentData} isLoading={isCommentsLoading} />
            </div>

            <section className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <LanguageLeaderboard
                snippets={filteredSnippets}
                comments={filteredComments}
                isLoading={snippetsQuery.isLoading || (!snippetsQuery.data && snippetsQuery.isFetching) || isCommentsLoading}
              />

              <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-6 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("analytics.reviewQueue")}</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t("analytics.reviewQueueTitle")}</h2>

                <div className="mt-5 space-y-3">
                  {reviewQueue.length ? (
                    reviewQueue.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(`/snippets/${item.id}`)}
                        className="w-full rounded-[22px] border border-slate-200/80 bg-white/85 p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_40px_rgba(148,163,184,0.16)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{item.language}</p>
                          </div>
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            {item.count === 0 ? t("analytics.needsFirstReview") : t("analytics.needsReview")}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                          <span>{item.average !== null ? `${t("analytics.avgScore")}: ${item.average} / 5` : t("analytics.noFeedbackYet")}</span>
                          <span>{item.count} {t("analytics.commentsCount")}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 text-sm text-slate-500">
                      {t("analytics.emptyQueue")}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
