"use client";
import React from "react";
import { FeatherChevronLeft, FeatherCode, FeatherMessageCircle, FeatherShield } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

function SnippetDetailHeader({ title, description, language, commentCount = 0, riskCount = 0, onBack }) {
  const { t } = useI18n();

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
      <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,255,255,0.88))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur lg:p-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
        >
          <FeatherChevronLeft size={16} />
          {t("snippets.back")}
        </button>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-sky-700">
            {t("snippets.workspace")}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-[0.18em] text-slate-500">
            {language || t("snippets.currentUserFallback")}
          </span>
        </div>

        <h1 className="mt-4 max-w-3xl font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          {description || t("snippets.noDescription")}
        </p>
      </div>

      <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-6 text-slate-950 shadow-[0_24px_70px_rgba(148,163,184,0.16)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          {t("snippets.detailSideLabel")}
        </p>
        <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
          {t("snippets.detailSideTitle")}
        </p>

        <div className="mt-6 grid gap-3">
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-4">
            <div className="flex items-center gap-3 text-sky-300">
              <FeatherCode size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("snippets.detailLanguage")}
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">{language || "-"}</p>
          </div>

          <div className="rounded-[22px] border border-slate-200/80 bg-white p-4">
            <div className="flex items-center gap-3 text-amber-300">
              <FeatherMessageCircle size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("snippets.comments")}
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">{commentCount}</p>
          </div>

          <div className="rounded-[22px] border border-slate-200/80 bg-white p-4">
            <div className="flex items-center gap-3 text-rose-300">
              <FeatherShield size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("snippets.detailRiskLabel")}
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">{riskCount}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SnippetDetailHeader;
