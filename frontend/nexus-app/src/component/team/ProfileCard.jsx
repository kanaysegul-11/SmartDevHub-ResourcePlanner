"use client";

import React from "react";
import { FeatherArrowUpRight, FeatherClock, FeatherMessageCircle, FeatherUser } from "@subframe/core";
import { Avatar } from "../../ui/components/Avatar";
import { Badge } from "../../ui/components/Badge";
import { Button } from "../../ui/components/Button";
import { useI18n } from "../../I18nContext.jsx";

function ProfileCard({ member, isOpen, onClose, onMessageClick, showCloseButton = true }) {
  const { language, t } = useI18n();

  if (!isOpen || !member) return null;

  const statusVariant =
    member.status_type === "busy" ? "warning" : member.status_type === "available" ? "success" : "neutral";

  const statusLabel =
    member.status_type === "busy"
      ? t("team.busy")
      : member.status_type === "available"
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
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-white">
                    {member.employee_name || t("team.notSpecified")}
                  </h2>
                  <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                    {member.position || t("team.notSpecified")}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[26px] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {t("team.currentTask")}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {member.current_work || t("team.notSpecified")}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {t("team.lastUpdate")}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{formatDate(member.last_updated)}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {t("team.nextStep")}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{t("team.nextStepBody")}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-[30px] border border-slate-200/80 bg-white/75 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {t("team.profileActions")}
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <Button
                    variant="brand-secondary"
                    className="h-12 justify-between rounded-2xl bg-slate-950 px-4 text-white hover:bg-slate-800"
                    icon={<FeatherMessageCircle />}
                    onClick={() => onMessageClick?.(member)}
                  >
                    {t("team.openMessaging")}
                  </Button>
                  <Button
                    variant="neutral-secondary"
                    className="h-12 justify-between rounded-2xl border-slate-200 bg-white px-4"
                    icon={<FeatherArrowUpRight />}
                    onClick={() => onMessageClick?.(member)}
                  >
                    {t("team.goToTeamChat")}
                  </Button>
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200/80 bg-white/75 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-sky-100 text-sky-700">
                    <FeatherClock size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{t("team.actionFocused")}</p>
                    <p className="text-sm leading-7 text-slate-500">{t("team.actionFocusedBody")}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-dashed border-slate-200 bg-slate-50/75 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {t("team.whyImportant")}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t("team.whyImportantBody")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;

