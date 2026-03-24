"use client";
import React, { useMemo } from "react";
import { FeatherStar, FeatherTrendingDown, FeatherTrendingUp } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

function LanguageLeaderboard({ snippets = [], comments = [], isLoading = false }) {
  const { t } = useI18n();

  const leaderboard = useMemo(() => {
    const snippetMap = new Map(snippets.map((snippet) => [snippet.id, snippet]));
    const stats = {};

    comments.forEach((comment) => {
      const snippet = snippetMap.get(comment.snippet);
      const language = snippet?.language || t("analytics.unknown");
      if (!stats[language]) {
        stats[language] = { total: 0, ratingCount: 0, snippetIds: new Set() };
      }

      stats[language].total += Number(comment.experience_rating || 0);
      stats[language].ratingCount += 1;
      if (snippet?.id) stats[language].snippetIds.add(snippet.id);
    });

    return Object.entries(stats)
      .map(([name, values]) => ({
        name,
        avg: Number((values.total / values.ratingCount).toFixed(1)),
        count: values.snippetIds.size || values.ratingCount,
      }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count)
      .slice(0, 5);
  }, [comments, snippets, t]);

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-[30px] bg-slate-100" />;
  }

  return (
    <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-6 shadow-[0_20px_50px_rgba(148,163,184,0.14)] transition-all hover:shadow-[0_24px_65px_rgba(148,163,184,0.18)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tighter text-slate-800">
            <FeatherStar className="text-amber-500" size={16} fill="currentColor" />
            {t("analytics.leaderboard")}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">{t("analytics.leaderboardBody")}</p>
        </div>
        <span className="rounded border bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400">{t("analytics.top5")}</span>
      </div>

      {!leaderboard.length ? (
        <div className="flex h-40 items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 text-sm text-slate-500">
          {t("analytics.noLeaderboardData")}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {leaderboard.map((item, index) => (
            <div key={item.name} className="group flex items-center gap-4">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                  index === 0
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                    : "bg-slate-50 text-slate-400 transition-colors group-hover:bg-purple-50 group-hover:text-purple-600"
                }`}
              >
                {index + 1}
              </div>
              <div className="grow">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">{item.name}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-900">★ {item.avg}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${index === 0 ? "bg-purple-600" : "bg-purple-400 opacity-60"}`}
                    style={{ width: `${(item.avg / 5) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.avg >= 4 ? (
                  <FeatherTrendingUp size={14} className="text-green-500" />
                ) : (
                  <FeatherTrendingDown size={14} className="text-slate-300" />
                )}
                <span className="text-[9px] font-bold italic text-slate-400">
                  {item.count} {t("analytics.codeCount")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageLeaderboard;
