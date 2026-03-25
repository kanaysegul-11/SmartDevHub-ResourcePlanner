import React from "react";
import { FeatherAlertTriangle, FeatherInfo, FeatherShieldCheck } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

const SecurityReportCard = ({ risks = [] }) => {
  const { t } = useI18n();

  return (
    <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.92))] p-6 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-slate-800">
            <FeatherShieldCheck size={18} className="text-sky-600" />
            {t("snippets.securityTitle")}
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            risks.length > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {risks.length > 0 ? `${risks.length} ${t("snippets.riskDetected")}` : t("snippets.systemSecure")}
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {risks.length > 0 ? (
          risks.map((risk, index) => (
            <div
              key={index}
              className="rounded-[24px] border border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.95),rgba(255,255,255,0.98))] p-5"
            >
              <div className="flex items-center gap-2">
                <FeatherAlertTriangle size={16} className="text-rose-600" />
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">
                  {t("snippets.finding")}:
                </span>
                <span className="text-sm font-bold text-rose-700">{risk.label}</span>
                <span className="ml-auto rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  {risk.level || t("snippets.critical")}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{risk.message}</p>
            </div>
          ))
        ) : (
          <div className="flex items-start gap-3 rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(255,255,255,0.98))] p-5 text-sm leading-7 text-emerald-800">
            <FeatherInfo size={18} className="mt-0.5 shrink-0" />
            <span>{t("snippets.safeMessage")}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityReportCard;
