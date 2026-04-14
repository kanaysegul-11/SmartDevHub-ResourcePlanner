import React from "react";
import {
  FeatherActivity,
  FeatherCalendar,
  FeatherDatabase,
  FeatherPlus,
  FeatherUpload,
  FeatherUserPlus,
} from "@subframe/core";

import { Badge } from "../../ui/components/Badge";
import { TopbarWithRightNav } from "../../ui/components/TopbarWithRightNav";

function MetricCard({
  label,
  value,
  icon,
  tone = "neutral",
  cardClassName = "",
  valueClassName = "",
}) {
  const toneClasses = {
    neutral: "text-slate-950",
    success: "text-emerald-700",
    warning: "text-amber-700",
  };

  return (
    <div
      className={`w-full rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_12px_36px_rgba(148,163,184,0.08)] md:flex-[1_1_11rem] ${cardClassName}`}
    >
      <div className="flex items-center gap-3 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.22em]">{label}</span>
      </div>
      <p
        className={`mt-3 whitespace-nowrap text-[clamp(2rem,1.4rem+1vw,3rem)] font-black leading-none tracking-tight tabular-nums ${toneClasses[tone] || toneClasses.neutral} ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function ActionButton({ onClick, icon, children, variant = "primary" }) {
  const variantClasses =
    variant === "secondary"
      ? "border border-white/20 bg-white/10 text-white hover:bg-white/15"
      : "bg-white text-slate-950 hover:bg-slate-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${variantClasses}`}
    >
      {icon}
      {children}
    </button>
  );
}

function SoftwareAssetsOverview({
  copy,
  isAdmin,
  stats,
  formatMoney,
  onCreateShared,
  onCreateAssigned,
  onOpenImport,
  onOpenRequest,
}) {
  return (
    <>
      <TopbarWithRightNav
        className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
        leftSlot={<Badge variant="neutral" icon={<FeatherDatabase />}>{copy.workspace}</Badge>}
        rightSlot={<Badge variant={isAdmin ? "success" : "neutral"}>{isAdmin ? copy.adminView : copy.userView}</Badge>}
      />

      <div className="flex w-full flex-col gap-6 px-6 md:px-8 xl:px-10">
        <section className={`grid grid-cols-1 gap-6 ${isAdmin ? "xl:grid-cols-[minmax(0,1.1fr)_360px]" : ""}`}>
          <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.86))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur lg:p-8">
            <Badge variant="neutral" icon={<FeatherActivity />}>{copy.workspace}</Badge>
            <h1 className="mt-4 font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-slate-950">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{copy.intro}</p>

            <div className="mt-7 flex flex-col gap-4 md:flex-row md:flex-wrap">
              <MetricCard
                label={copy.totalRecords}
                value={stats.total_records || 0}
                icon={<FeatherDatabase size={18} />}
                cardClassName="md:min-w-[11rem]"
              />
              {isAdmin ? (
                <>
                  <MetricCard
                    label={copy.monthlyCost}
                    value={formatMoney(stats.monthly_cost_total || 0)}
                    icon={<FeatherActivity size={18} />}
                    tone="success"
                    cardClassName="md:min-w-[14rem] lg:min-w-[15.5rem]"
                  />
                  <MetricCard
                    label={copy.annualCost}
                    value={formatMoney(stats.annual_cost_total || 0)}
                    icon={<FeatherCalendar size={18} />}
                    cardClassName="md:min-w-[14rem] lg:min-w-[15.5rem]"
                  />
                </>
              ) : null}
              <MetricCard
                label={copy.expiringSoon}
                value={stats.expiring_7_days || 0}
                icon={<FeatherCalendar size={18} />}
                tone="warning"
                cardClassName="md:min-w-[11rem]"
              />
              <MetricCard
                label={copy.utilization}
                value={`${Math.round(stats.utilization_rate || 0)}%`}
                icon={<FeatherUserPlus size={18} />}
                cardClassName="md:min-w-[11rem]"
              />
            </div>
          </div>

          <div className="rounded-[34px] border border-white/65 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {copy.detailTitle}
            </p>
            <p className="mt-3 text-2xl font-black tracking-tight">
              {isAdmin ? copy.actionSummaryAdmin : copy.actionSummaryUser}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {isAdmin ? (
                <>
                  <ActionButton onClick={onCreateShared} icon={<FeatherPlus size={16} />}>
                    {copy.addShared}
                  </ActionButton>
                  <ActionButton
                    onClick={onCreateAssigned}
                    icon={<FeatherUserPlus size={16} />}
                    variant="secondary"
                  >
                    {copy.addAssigned}
                  </ActionButton>
                  <ActionButton
                    onClick={onOpenImport}
                    icon={<FeatherUpload size={16} />}
                    variant="secondary"
                  >
                    {copy.importCsv}
                  </ActionButton>
                </>
              ) : (
                <ActionButton onClick={onOpenRequest} icon={<FeatherUserPlus size={16} />}>
                  {copy.requestLicense}
                </ActionButton>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default SoftwareAssetsOverview;
