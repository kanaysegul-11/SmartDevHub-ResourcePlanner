"use client";
import React from "react";
import { FeatherUsers } from "@subframe/core";
import { PieChart } from "../../ui/components/PieChart";
import { useI18n } from "../../I18nContext.jsx";

function SentimentChart({ data, isLoading = false }) {
  const { t } = useI18n();
  const pieColors = ["#22c55e", "#9333ea", "#ef4444"];
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="col-span-12 flex flex-col items-center rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-8 shadow-[0_20px_50px_rgba(148,163,184,0.14)] transition-all hover:shadow-[0_24px_65px_rgba(148,163,184,0.18)] lg:col-span-5">
      <div className="mb-8 self-start">
        <h3 className="flex items-center gap-3 text-xl font-bold text-slate-800">
          <div className="rounded-lg bg-pink-100 p-2 text-pink-600"><FeatherUsers size={20} /></div>
          {t("analytics.sentiment")}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-500">{t("analytics.sentimentBody")}</p>
      </div>
      {isLoading ? (
        <div className="flex h-64 w-full items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 text-sm text-slate-500">
          {t("analytics.loadingState")}
        </div>
      ) : (
        <PieChart className="h-64 w-full" data={safeData} index="name" category="value" colors={pieColors} legend={null} />
      )}
      <div className="mt-8 grid w-full grid-cols-3 gap-4">
        {safeData.map((item) => (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3" key={item.name}>
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs font-bold uppercase tracking-tighter text-slate-600">{item.name}</span>
            <span className="text-lg font-black text-slate-800">%{isLoading ? "..." : item.percentage ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SentimentChart;
