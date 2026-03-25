"use client";
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FeatherActivity } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

function LanguageChart({ data }) {
  const { t } = useI18n();
  return (
    <div className="col-span-12 rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-8 shadow-[0_20px_50px_rgba(148,163,184,0.14)] transition-all hover:shadow-[0_24px_65px_rgba(148,163,184,0.18)] lg:col-span-7">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-3 text-xl font-bold text-slate-800">
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600"><FeatherActivity size={20} /></div>
            {t("analytics.languagePopularity")}
          </h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-[0.2em] text-slate-400">
          {data.length}
        </span>
      </div>
      {!data.length ? (
        <div className="flex h-80 items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 text-sm text-slate-500">
          {t("analytics.noLanguageData")}
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="value" fill="#9333ea" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default LanguageChart;
