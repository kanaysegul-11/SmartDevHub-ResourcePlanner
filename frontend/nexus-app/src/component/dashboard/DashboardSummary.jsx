"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FeatherActivity,
  FeatherArrowUpRight,
  FeatherClock,
  FeatherCode,
  FeatherMessageCircle,
  FeatherStar,
  FeatherTrendingUp,
  FeatherUsers,
} from "@subframe/core";
import { Avatar } from "../../ui/components/Avatar";
import { Badge } from "../../ui/components/Badge";
import { Button } from "../../ui/components/Button";
import { useI18n } from "../../I18nContext.jsx";

function DashboardPanel({ children, className = "" }) {
  return (
    <div
      className={`rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, accentClass }) {
  const { t } = useI18n();

  return (
    <DashboardPanel className="p-6 lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] ${accentClass}`}>
          {icon}
        </div>
        <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {t("dashboard.liveBadge")}
        </span>
      </div>
      <p className="mt-7 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
    </DashboardPanel>
  );
}

function formatRelativeDate(value, language, t) {
  if (!value) {
    return t("dashboard.noTimeInfo");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("dashboard.updatedUnknown");
  }

  return new Intl.DateTimeFormat(language || "en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getActivityConfig(type, t) {
  if (type === "project") {
    return {
      icon: <FeatherTrendingUp size={16} />,
      label: t("sidebar.projects"),
      tone: "bg-violet-100 text-violet-700",
    };
  }

  if (type === "comment") {
    return {
      icon: <FeatherMessageCircle size={16} />,
      label: t("dashboard.activityFeedback"),
      tone: "bg-amber-100 text-amber-700",
    };
  }

  if (type === "team") {
    return {
      icon: <FeatherUsers size={16} />,
      label: t("dashboard.activityTeam"),
      tone: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    icon: <FeatherCode size={16} />,
    label: t("dashboard.activityCode"),
    tone: "bg-sky-100 text-sky-700",
  };
}

function DashboardSummary({ stats, teamActivities = [], onMemberClick }) {
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const latestSnippet = stats?.latestSnippet;
  const workloadRatio = stats?.totalMembers
    ? Math.round((stats.busyMembers / stats.totalMembers) * 100)
    : 0;
  const topLanguages = stats?.languageSpread?.slice(0, 4) ?? [];
  const capacityMembers = [...teamActivities]
    .filter((member) => Number(member.projectCount || 0) > 0)
    .sort((left, right) => {
      const projectDifference = Number(right.projectCount || 0) - Number(left.projectCount || 0);
      if (projectDifference !== 0) {
        return projectDifference;
      }

      const leftBusy = (left.effective_status || left.status_type) === "busy" ? 1 : 0;
      const rightBusy = (right.effective_status || right.status_type) === "busy" ? 1 : 0;
      if (rightBusy !== leftBusy) {
        return rightBusy - leftBusy;
      }

      return String(left.employee_name || left.user_details?.username || "").localeCompare(
        String(right.employee_name || right.user_details?.username || ""),
        "tr"
      );
    })
    .slice(0, 4);
  const recentActivity = stats?.recentActivity ?? [];
  const reviewQueue = stats?.reviewQueue ?? [];

  return (
    <div className="flex w-full flex-col gap-10 xl:gap-12">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        <StatCard
          icon={<FeatherCode size={22} />}
          label={t("dashboard.totalSnippets")}
          value={stats?.totalSnippets || 0}
          accentClass="bg-sky-100 text-sky-700"
        />
        <StatCard
          icon={<FeatherStar size={22} />}
          label={t("dashboard.averageRating")}
          value={stats?.averageRating ? `${stats.averageRating}/5` : "-"}
          accentClass="bg-amber-100 text-amber-700"
        />
        <StatCard
          icon={<FeatherUsers size={22} />}
          label={t("dashboard.busyRatio")}
          value={`%${workloadRatio}`}
          accentClass="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          icon={<FeatherTrendingUp size={22} />}
          label={t("dashboard.dailyTempo")}
          value={
            workloadRatio >= 70
              ? t("dashboard.dailyTempoHigh")
              : workloadRatio >= 40
                ? t("dashboard.dailyTempoBalanced")
                : t("dashboard.dailyTempoRelaxed")
          }
          accentClass="bg-violet-100 text-violet-700"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.92fr)] xl:gap-8">
        <DashboardPanel className="relative overflow-hidden p-7 lg:p-8 xl:p-9">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_46%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_38%)]" />

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-5 border-b border-slate-200/70 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <Badge variant="neutral" icon={<FeatherActivity />}>
                  {t("dashboard.operationFocus")}
                </Badge>
                <h2 className="mt-4 font-['Newsreader'] text-3xl font-medium leading-tight tracking-tight text-slate-950 md:text-4xl">
                  {t("dashboard.operationTitle")}
                </h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="brand-secondary"
                  className="rounded-2xl bg-slate-900 px-4 text-white hover:bg-slate-800"
                  icon={<FeatherArrowUpRight />}
                  onClick={() => navigate("/snippets")}
                >
                  {t("dashboard.openLibrary")}
                </Button>
                <Button
                  variant="neutral-secondary"
                  className="rounded-2xl border-slate-200 bg-white/80 px-4"
                  icon={<FeatherUsers />}
                  onClick={() => navigate("/team")}
                >
                  {t("dashboard.goTeamPlan")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <div className="overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] lg:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                      {t("dashboard.latestSnippet")}
                    </p>
                    <p className="mt-3 text-2xl font-black tracking-tight text-white">
                      {latestSnippet?.title || t("dashboard.noDataYet")}
                    </p>
                  </div>
                  <Badge variant="neutral">
                    {latestSnippet?.language || t("dashboard.noDataYet")}
                  </Badge>
                </div>

                {latestSnippet ? (
                  <>
                    <p className="mt-5 text-sm leading-7 text-slate-300">
                      {latestSnippet.description || t("dashboard.emptyDescription")}
                    </p>

                    <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-4">
                      <pre className="overflow-hidden whitespace-pre-wrap break-words text-xs leading-6 text-cyan-200">
                        <code>{`${latestSnippet.code?.slice(0, 200) || ""}${latestSnippet.code?.length > 200 ? "..." : ""}`}</code>
                      </pre>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {formatRelativeDate(latestSnippet.created_at, language, t)}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/snippets/${latestSnippet.id}`)}
                        className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/12"
                      >
                        {t("dashboard.openDetail")}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 rounded-[26px] border border-dashed border-white/15 p-6 text-sm text-slate-400">
                    {t("dashboard.emptyCodeArea")}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-[30px] border border-slate-200/80 bg-white/72 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {t("dashboard.capacitySignal")}
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                        {t("dashboard.capacityTitle")}
                      </h3>
                    </div>
                    <Badge
                      variant={
                        workloadRatio >= 70
                          ? "warning"
                          : stats?.availableMembers
                            ? "success"
                            : "neutral"
                      }
                    >
                      {workloadRatio >= 70
                        ? t("dashboard.highLoad")
                        : stats?.availableMembers
                          ? t("dashboard.roomAvailable")
                          : t("dashboard.monitor")}
                    </Badge>
                  </div>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#34d399_0%,#fbbf24_52%,#fb7185_100%)]"
                      style={{ width: `${Math.max(workloadRatio, 8)}%` }}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {capacityMembers.length > 0 ? (
                      capacityMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => onMemberClick && onMemberClick(member)}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                        >
                          <span>{member.employee_name || member.user_details?.username}</span>
                          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-black text-amber-700">
                            {member.projectCount || 0}
                          </span>
                        </button>
                      ))
                    ) : (
                      <span className="text-sm font-medium text-slate-400">
                        {t("dashboard.noCriticalPeople")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200/80 bg-white/72 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {t("dashboard.languageCoverage")}
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                        {t("dashboard.languageCoverageTitle")}
                      </h3>
                    </div>
                    <Button
                      variant="neutral-tertiary"
                      size="small"
                      className="rounded-2xl"
                      icon={<FeatherArrowUpRight />}
                      onClick={() => navigate("/analytics")}
                    >
                      Analytics
                    </Button>
                  </div>

                  <div className="mt-6 flex flex-col gap-4">
                    {topLanguages.length > 0 ? (
                      topLanguages.map((item) => {
                        const width = stats?.totalSnippets
                          ? Math.max(Math.round((item.total / stats.totalSnippets) * 100), 12)
                          : 12;

                        return (
                          <div key={item.name} className="space-y-2.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold capitalize text-slate-700">
                                {item.name}
                              </span>
                              <span className="text-slate-400">
                                {item.total} {t("dashboard.records")}
                              </span>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-900"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-400">{t("dashboard.noDistribution")}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel className="p-7 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant="neutral" icon={<FeatherClock />}>
                {t("dashboard.recentActivity")}
              </Badge>
              <h3 className="mt-4 font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                {t("dashboard.recentActivityTitle")}
              </h3>
            </div>
            <Button
              variant="neutral-tertiary"
              size="small"
              className="rounded-2xl"
              icon={<FeatherArrowUpRight />}
              onClick={() => navigate("/analytics")}
            >
              {t("dashboard.seeMore")}
            </Button>
          </div>

          <div className="mt-8 flex flex-col gap-5">
            {recentActivity.map((item, index) => {
              const config = getActivityConfig(item.type, t);
              return (
                <div key={item.id} className="relative flex gap-4">
                  {index !== recentActivity.length - 1 ? (
                    <div className="absolute left-6 top-14 h-[calc(100%-8px)] w-px bg-slate-200" />
                  ) : null}
                  <div
                    className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${config.tone}`}
                  >
                    {config.icon}
                  </div>
                  <div className="min-w-0 flex-1 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="line-clamp-2 break-words text-sm font-bold text-slate-900">{item.title}</p>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm leading-6 text-slate-500">{item.meta}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                      {formatRelativeDate(item.timestamp, language, t)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] xl:gap-8">
        <DashboardPanel className="p-7 lg:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="neutral" icon={<FeatherMessageCircle />}>
                {t("dashboard.reviewQueue")}
              </Badge>
              <h3 className="mt-4 font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                {t("dashboard.reviewQueueTitle")}
              </h3>
            </div>
            <Button
              variant="neutral-tertiary"
              size="small"
              className="rounded-2xl"
              icon={<FeatherArrowUpRight />}
              onClick={() => navigate("/snippets")}
            >
              {t("dashboard.goLibrary")}
            </Button>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {reviewQueue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/snippets/${item.id}`)}
                className="rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-5 text-left transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[0_16px_36px_rgba(148,163,184,0.14)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black tracking-tight text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-500">
                      {item.description || t("dashboard.noDescription")}
                    </p>
                  </div>
                  <Badge variant="neutral">{item.language || t("dashboard.activityCode")}</Badge>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-500">
                    {item.commentCount === 0
                      ? t("dashboard.noCommentsYet")
                      : `${item.commentCount} ${t("dashboard.commentsSuffix")}`}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {item.averageRating
                      ? `${item.averageRating.toFixed(1)} / 5`
                      : t("dashboard.ratingPending")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel className="p-7 lg:p-8">
          <Badge variant="neutral" icon={<FeatherUsers />}>
            {t("dashboard.quickAccess")}
          </Badge>
          <h3 className="mt-4 font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
            {t("dashboard.quickAccessTitle")}
          </h3>
          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => navigate("/team")}
              className="rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-5 text-left transition hover:border-slate-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t("sidebar.team")}
              </p>
              <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                {t("dashboard.quickTeamTitle")}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/analytics")}
              className="rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-5 text-left transition hover:border-slate-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t("sidebar.analytics")}
              </p>
              <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                {t("dashboard.quickAnalyticsTitle")}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/snippets")}
              className="rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-5 text-left transition hover:border-slate-300 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t("sidebar.codeLibrary")}
              </p>
              <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                {t("dashboard.quickLibraryTitle")}
              </p>
            </button>
          </div>

          <div className="mt-8 rounded-[28px] border border-dashed border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-700">{t("dashboard.quickProfiles")}</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {teamActivities.slice(0, 5).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onMemberClick && onMemberClick(member)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Avatar size="small" variant="brand">
                    {(member.employee_name || "U")[0].toUpperCase()}
                  </Avatar>
                  <span>{member.employee_name}</span>
                </button>
              ))}
            </div>
          </div>
        </DashboardPanel>
      </section>
    </div>
  );
}

export default DashboardSummary;
