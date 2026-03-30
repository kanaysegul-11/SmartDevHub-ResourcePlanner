"use client";
import React from "react";
import { useI18n } from "../../I18nContext.jsx";

function AnalyticsHeader({ totalComments = 0, averageRating = 0 }) {
  const { t } = useI18n();
  return (
    <section className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_330px]">
      <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,255,255,0.88))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur lg:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-700">
            {t("analytics.liveData")}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-[0.18em] text-slate-500">
            {t("analytics.workspace")}
          </span>
        </div>
        <h1 className="mt-4 max-w-3xl font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-slate-950">
          {t("analytics.heroTitle")}
        </h1>
      </div>

      <div className="rounded-[34px] border border-white/65 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("analytics.insightPanel")}</p>
        <p className="mt-3 text-2xl font-black tracking-tight text-white">{t("analytics.insightTitle")}</p>
        <div className="mt-6 grid gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("analytics.feedbackEntries")}</p>
            <p className="mt-2 text-2xl font-black text-white">{totalComments}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("analytics.averageRating")}</p>
            <p className="mt-2 text-2xl font-black text-white">{averageRating.toFixed(1)} / 5</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AnalyticsHeader;
