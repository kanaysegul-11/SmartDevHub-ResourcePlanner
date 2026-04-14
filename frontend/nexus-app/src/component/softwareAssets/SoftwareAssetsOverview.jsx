import React from "react";
import {
  FeatherActivity,
  FeatherCalendar,
  FeatherClock3,
  FeatherDatabase,
  FeatherPlus,
  FeatherShield,
  FeatherSparkles,
  FeatherTrendingUp,
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
    neutral: {
      icon: "border-slate-200 bg-slate-50 text-slate-700",
      value: "text-slate-950",
      glow: "from-slate-200/80 via-transparent to-transparent",
    },
    success: {
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
      value: "text-emerald-700",
      glow: "from-emerald-200/80 via-transparent to-transparent",
    },
    warning: {
      icon: "border-amber-200 bg-amber-50 text-amber-700",
      value: "text-amber-700",
      glow: "from-amber-200/80 via-transparent to-transparent",
    },
  };
  const currentTone = toneClasses[tone] || toneClasses.neutral;

  return (
    <div
      className={`relative overflow-hidden rounded-[26px] border border-white/80 bg-white/78 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.12)] backdrop-blur ${cardClassName}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${currentTone.glow} opacity-80`}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {label}
            </span>
            <p
              className={`whitespace-nowrap text-[clamp(2rem,1.4rem+1vw,3rem)] font-black leading-none tracking-tight tabular-nums ${currentTone.value} ${valueClassName}`}
            >
              {value}
            </p>
          </div>
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${currentTone.icon}`}
          >
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}

function InsightTile({ label, value, icon, tone = "light" }) {
  const toneClasses =
    tone === "dark"
      ? "border-white/10 bg-white/10 text-white"
      : "border-slate-200/80 bg-white/75 text-slate-900";

  return (
    <div
      className={`flex items-center gap-3 rounded-[22px] border px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.08)] ${toneClasses}`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          tone === "dark"
            ? "bg-white/10 text-white"
            : "bg-slate-950/[0.04] text-slate-700"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
            tone === "dark" ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        <p className="mt-1 text-lg font-black tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ onClick, icon, children, variant = "primary" }) {
  const variantClasses =
    variant === "secondary"
      ? "border border-white/12 bg-white/8 text-white hover:bg-white/14"
      : "bg-white text-slate-950 shadow-[0_14px_28px_rgba(255,255,255,0.12)] hover:bg-slate-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex w-full items-center justify-between gap-3 rounded-[20px] px-4 py-3 text-sm font-semibold transition ${variantClasses}`}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
      <FeatherTrendingUp size={15} className="opacity-70" />
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
  const heroSnapshotTitle = isAdmin
    ? `${copy.shared} / ${copy.assigned}`
    : copy.active;
  const heroSnapshotTiles = isAdmin
    ? [
        {
          label: copy.shared,
          value: stats.shared_records || 0,
          icon: <FeatherDatabase size={18} />,
        },
        {
          label: copy.assigned,
          value: stats.assigned_records || 0,
          icon: <FeatherUserPlus size={18} />,
        },
        {
          label: copy.active,
          value: stats.active_records || 0,
          icon: <FeatherTrendingUp size={18} />,
        },
      ]
    : [
        {
          label: copy.active,
          value: stats.active_records || 0,
          icon: <FeatherTrendingUp size={18} />,
        },
        {
          label: copy.expiringSoon,
          value: stats.expiring_7_days || 0,
          icon: <FeatherClock3 size={18} />,
        },
        {
          label: copy.utilization,
          value: `${Math.round(stats.utilization_rate || 0)}%`,
          icon: <FeatherUserPlus size={18} />,
        },
      ];

  return (
    <>
      <TopbarWithRightNav
        className="mx-6 mt-6 rounded-[30px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
        leftSlot={
          <Badge variant="neutral" icon={<FeatherDatabase />}>
            {copy.workspace}
          </Badge>
        }
        rightSlot={
          <div className="flex items-center gap-2">
            <Badge variant="neutral" icon={<FeatherSparkles />}>
              {copy.detailTitle}
            </Badge>
            <Badge variant={isAdmin ? "success" : "neutral"}>
              {isAdmin ? copy.adminView : copy.userView}
            </Badge>
          </div>
        }
      />

      <div className="flex w-full flex-col gap-6 px-6 md:px-8 xl:px-10">
        <section
          className={`grid grid-cols-1 gap-6 ${isAdmin ? "xl:grid-cols-[minmax(0,1.1fr)_390px]" : "xl:grid-cols-[minmax(0,1fr)_360px]"}`}
        >
          <div className="relative overflow-hidden rounded-[40px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.35),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(196,181,253,0.22),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,255,255,0.86))] p-7 shadow-[0_28px_80px_rgba(148,163,184,0.18)] backdrop-blur lg:p-8">
            <div className="pointer-events-none absolute -left-12 top-10 h-32 w-32 rounded-full bg-sky-200/30 blur-3xl" />
            <div className="pointer-events-none absolute bottom-4 right-6 h-28 w-28 rounded-full bg-indigo-200/25 blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="neutral" icon={<FeatherActivity />}>
                  {copy.workspace}
                </Badge>
                <Badge variant="neutral" icon={<FeatherShield />}>
                  {isAdmin ? copy.adminView : copy.userView}
                </Badge>
              </div>

              <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <h1 className="max-w-4xl font-['Newsreader'] text-[clamp(3rem,2.4rem+1.8vw,4.8rem)] font-medium leading-[0.95] tracking-tight text-slate-950">
                    {copy.title}
                  </h1>
                  <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
                    {copy.intro}
                  </p>
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5 shadow-[0_20px_44px_rgba(148,163,184,0.12)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {copy.filterMode}
                  </p>
                  <p className="mt-3 font-['Newsreader'] text-3xl font-medium leading-tight tracking-tight text-slate-950">
                    {heroSnapshotTitle}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3">
                    {heroSnapshotTiles.map((tile) => (
                      <InsightTile
                        key={tile.label}
                        label={tile.label}
                        value={tile.value}
                        icon={tile.icon}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`mt-7 grid grid-cols-1 gap-4 ${isAdmin ? "md:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-3"}`}
              >
                <MetricCard
                  label={copy.totalRecords}
                  value={stats.total_records || 0}
                  icon={<FeatherDatabase size={18} />}
                />
                {isAdmin ? (
                  <>
                    <MetricCard
                      label={copy.monthlyCost}
                      value={formatMoney(stats.monthly_cost_total || 0)}
                      icon={<FeatherActivity size={18} />}
                      tone="success"
                    />
                    <MetricCard
                      label={copy.annualCost}
                      value={formatMoney(stats.annual_cost_total || 0)}
                      icon={<FeatherCalendar size={18} />}
                    />
                  </>
                ) : null}
                <MetricCard
                  label={copy.expiringSoon}
                  value={stats.expiring_7_days || 0}
                  icon={<FeatherCalendar size={18} />}
                  tone="warning"
                />
                <MetricCard
                  label={copy.utilization}
                  value={`${Math.round(stats.utilization_rate || 0)}%`}
                  icon={<FeatherUserPlus size={18} />}
                />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[38px] border border-slate-900/90 bg-[linear-gradient(180deg,#020617,#0f172a_50%,#111827)] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.2),transparent_60%)]" />
            <div className="pointer-events-none absolute -right-8 bottom-4 h-32 w-32 rounded-full bg-sky-400/12 blur-3xl" />

            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {copy.detailTitle}
              </p>
              <p className="mt-3 text-[clamp(2rem,1.55rem+1vw,2.85rem)] font-black leading-tight tracking-tight">
                {isAdmin ? copy.actionSummaryAdmin : copy.actionSummaryUser}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <InsightTile
                  label={copy.totalRecords}
                  value={stats.total_records || 0}
                  icon={<FeatherDatabase size={18} />}
                  tone="dark"
                />
                <InsightTile
                  label={copy.expiringSoon}
                  value={stats.expiring_7_days || 0}
                  icon={<FeatherClock3 size={18} />}
                  tone="dark"
                />
              </div>

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
          </div>
        </section>
      </div>
    </>
  );
}

export default SoftwareAssetsOverview;
