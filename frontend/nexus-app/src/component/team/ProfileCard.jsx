"use client";

import React from "react";
import { FeatherArrowUpRight, FeatherMessageCircle, FeatherUser } from "@subframe/core";
import { Avatar } from "../../ui/components/Avatar";
import { Badge } from "../../ui/components/Badge";
import { useI18n } from "../../I18nContext.jsx";

function ProfileCard({
  member,
  isOpen,
  onClose,
  onMessageClick,
  isMessageDisabled = false,
  showCloseButton = true,
}) {
  const { language, t } = useI18n();

  if (!isOpen || !member) return null;
  const projectCount = Number(member.projectCount || 0);
  const canOpenMessaging =
    typeof onMessageClick === "function" && !isMessageDisabled;
  const projectName = member.currentProjectName || "";
  const clientName = member.currentProjectClient || "";

  const memberStatus =
    member.effectiveStatus || member.effective_status || member.status_type || "available";

  const statusVariant =
    memberStatus === "busy" ? "warning" : memberStatus === "available" ? "success" : "neutral";

  const statusLabel =
    memberStatus === "busy"
      ? t("team.busy")
      : memberStatus === "available"
        ? t("team.reachable")
        : t("team.unknown");

  const formatDate = (value) => {
    if (!value) return t("team.unknown");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("team.unknown");
    return new Intl.DateTimeFormat(language || "en", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[34px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] shadow-[0_32px_90px_rgba(15,23,42,0.26)]">
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_46%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_40%)]" />

        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 rounded-full border border-slate-200 bg-white/85 p-2 text-slate-600 transition hover:bg-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}

        <div className="relative p-7 lg:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[30px] bg-slate-950 p-7 text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <Badge variant="neutral" icon={<FeatherUser />}>{t("team.profileCard")}</Badge>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>

              <div className="mt-8 flex items-center gap-5">
                <Avatar variant="brand" size="x-large" className="border-4 border-white/20 shadow-lg">
                  {member.employee_name?.[0]?.toUpperCase() || "U"}
                </Avatar>
                <div className="min-w-0">
                  <h2 className="break-words text-3xl font-black tracking-tight text-white">
                    {member.employee_name || t("team.notSpecified")}
                  </h2>
                  <p className="mt-2 break-words text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                    {member.position || t("team.notSpecified")}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[26px] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {t("team.currentTask")}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {member.profileNote || member.current_work || t("team.notSpecified")}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {t("team.projectCount")}
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-white">
                      {projectCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {t("projects.delivery")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-200">
                      {member.currentProjectEndDate ? formatDate(member.currentProjectEndDate) : t("projects.notSet")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {t("team.lastUpdate")}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{formatDate(member.last_updated)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-[30px] border border-slate-200/80 bg-white/75 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {t("team.profileActions")}
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  {canOpenMessaging ? (
                    <>
                      <button
                        type="button"
                        className="inline-flex h-12 w-full items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                        onClick={() => onMessageClick(member)}
                      >
                        <span className="inline-flex items-center gap-2 text-white">
                          <FeatherMessageCircle size={16} />
                          {t("team.openMessaging")}
                        </span>
                        <FeatherArrowUpRight size={16} className="text-white" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => onMessageClick(member)}
                      >
                        <span>{t("team.goToTeamChat")}</span>
                        <FeatherArrowUpRight size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/90 px-4 py-5 text-sm text-slate-500">
                      {isMessageDisabled ? t("team.cannotMessageSelf") : ""}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200/80 bg-white/75 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {t("team.profileCard")}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {t("team.projectCount")}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{projectCount}</p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {t("projects.delivery")}
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-700">
                      {member.currentProjectEndDate
                        ? formatDate(member.currentProjectEndDate)
                        : t("projects.notSet")}
                    </p>
                  </div>
                </div>

                {projectName || clientName ? (
                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                    {projectName ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {t("projects.projectName")}
                        </p>
                        <p className="mt-2 break-words text-sm font-bold text-slate-900">
                          {projectName}
                        </p>
                      </div>
                    ) : null}
                    {clientName ? (
                      <div className={projectName ? "mt-4" : ""}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {t("projects.clientDepartment")}
                        </p>
                        <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-700">
                          {clientName}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("team.lastUpdate")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatDate(member.last_updated)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;
