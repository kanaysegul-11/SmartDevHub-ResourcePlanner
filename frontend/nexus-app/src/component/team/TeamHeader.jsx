"use client";

import React from "react";
import {
  FeatherArrowUpRight,
  FeatherBriefcase,
  FeatherCoffee,
  FeatherMessageCircle,
  FeatherUsers,
} from "@subframe/core";
import { Avatar } from "../../ui/components/Avatar";
import { Badge } from "../../ui/components/Badge";
import { Button } from "../../ui/components/Button";
import { useI18n } from "../../I18nContext.jsx";

function TeamHeader({
  loading,
  stats,
  spotlightMembers = [],
  actionMember = null,
  onInspect,
  onMessageClick,
  onMemberDragStart,
  onMemberDragOver,
  onMemberDrop,
  onMemberDragEnd,
  draggedMemberId,
  dropTargetMemberId,
}) {
  const { t } = useI18n();
  const activeActionMember = actionMember || spotlightMembers[0] || null;

  if (loading) {
    return (
      <div className="mx-8 mt-8 flex h-64 items-center justify-center rounded-[32px] border border-white/60 bg-white/70 text-slate-500 shadow-[0_20px_50px_rgba(148,163,184,0.14)] backdrop-blur">
        {t("team.loading")}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 px-6 pt-6 md:px-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.86))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur lg:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_46%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_38%)]" />

        <div className="relative grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <Badge variant="neutral" icon={<FeatherUsers />}>
              {t("team.workspace")}
            </Badge>
            <h1 className="mt-4 font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-slate-950">
              {t("team.heroTitle")}
            </h1>

            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                <div className="flex items-center gap-3 text-sky-700">
                  <FeatherUsers size={18} />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("team.totalTeam")}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {stats.totalMembers}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                <div className="flex items-center gap-3 text-amber-700">
                  <FeatherBriefcase size={18} />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("team.activeProjects")}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {stats.busyMembers}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                <div className="flex items-center gap-3 text-emerald-700">
                  <FeatherCoffee size={18} />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("team.availableCapacity")}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {stats.availableMembers}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {t("team.takeAction")}
            </p>
            <p className="mt-3 text-2xl font-black tracking-tight">{t("team.spotlightTitle")}</p>
            <div className="mt-5 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("team.selectedPerson")}
              </p>
              <p className="mt-2 text-base font-black text-white">
                {activeActionMember?.employee_name || t("team.waiting")}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="neutral-secondary"
                className="h-12 justify-between rounded-2xl border-white/10 bg-white/10 px-4 text-white hover:bg-white/15"
                icon={<FeatherArrowUpRight />}
                onClick={() => activeActionMember && onInspect?.(activeActionMember)}
              >
                {t("team.reviewProfile")}
              </Button>
              <Button
                variant="neutral-secondary"
                className="h-12 justify-between rounded-2xl border-white/10 bg-white/10 px-4 text-white hover:bg-white/15"
                icon={<FeatherMessageCircle />}
                onClick={() => activeActionMember && onMessageClick?.(activeActionMember)}
              >
                {t("team.moveToChat")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.8))] p-5 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
              {t("team.allMembers")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t("team.allMembersBody")}
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("team.dragHelp")}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {spotlightMembers.map((member) => (
          <div
            key={member.id}
            draggable
            onDragStart={onMemberDragStart ? onMemberDragStart(member.id) : undefined}
            onDragOver={onMemberDragOver ? onMemberDragOver(member.id) : undefined}
            onDrop={onMemberDrop ? onMemberDrop(member.id) : undefined}
            onDragEnd={onMemberDragEnd}
            className={`rounded-[30px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.82))] p-5 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur transition duration-200 hover:-translate-y-1 cursor-grab active:cursor-grabbing ${
              String(draggedMemberId || "") === String(member.id) ? "scale-[0.985] opacity-55" : ""
            } ${
              String(dropTargetMemberId || "") === String(member.id)
                ? "ring-2 ring-sky-300 ring-offset-2 ring-offset-white"
                : ""
            }`}
          >
            <div className="inline-flex rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t("team.dragToReorder")}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <Avatar size="large" variant={member.status_type === "busy" ? "warning" : "success"}>
                {member.employee_name?.[0]?.toUpperCase() || "U"}
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-black tracking-tight text-slate-900">
                  {member.employee_name}
                </p>
                <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {member.position || t("team.noPosition")}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {member.profileNote || member.current_work || t("team.noFocus")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onInspect?.(member)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                <FeatherArrowUpRight size={16} />
                {t("team.reviewProfile")}
              </button>
              <button
                type="button"
                onClick={() => onMessageClick?.(member)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <FeatherMessageCircle size={16} />
                {t("team.moveToChat")}
              </button>
            </div>
          </div>
        ))}
        </div>
      </section>
    </div>
  );
}

export default TeamHeader;
