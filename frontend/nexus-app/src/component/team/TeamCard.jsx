import React from "react";
import { FeatherArrowUpRight, FeatherMessageCircle, FeatherTrash2 } from "@subframe/core";
import { Avatar } from "../../ui/components/Avatar";
import { IconButton } from "../../ui/components/IconButton";
import { useI18n } from "../../I18nContext.jsx";

function TeamCard({
  member,
  variant,
  onDelete,
  onInspect,
  onMessageClick,
  canManage = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDropTarget = false,
  messageLabel,
}) {
  const isBusy = variant === "busy";
  const { language, t } = useI18n();
  const projectCount = Number(member.projectCount || 0);

  const formatDate = (value) => {
    if (!value) return t("projects.notSet");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("projects.notSet");
    return new Intl.DateTimeFormat(language || "en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  return (
    <div
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative overflow-hidden rounded-[30px] border p-5 shadow-[0_18px_40px_rgba(148,163,184,0.14)] transition duration-200 hover:-translate-y-1 ${
        isBusy
          ? "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,255,255,0.96))]"
          : "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(240,253,244,0.9),rgba(255,255,255,0.96))]"
      } ${onDragStart ? "cursor-grab active:cursor-grabbing" : ""} ${
        isDragging ? "scale-[0.985] opacity-55" : ""
      } ${isDropTarget ? "ring-2 ring-sky-300 ring-offset-2 ring-offset-white" : ""}`}
    >
      {onDragStart ? (
        <div className="mb-4 inline-flex rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {t("team.dragToReorder")}
        </div>
      ) : null}

      {canManage ? (
        <div className="absolute right-4 top-4">
          <IconButton
            variant="neutral-secondary"
            size="small"
            className="rounded-full border-slate-200 bg-white/85"
            icon={<FeatherTrash2 className="text-red-500" />}
            onClick={() => onDelete(member.id)}
          />
        </div>
      ) : null}

      <div className="flex items-start gap-4 pr-10">
        <Avatar variant={isBusy ? "warning" : "success"} size="large" className="shadow-sm">
          {member.employee_name?.[0]?.toUpperCase() || "U"}
        </Avatar>
        <div className="min-w-0">
          <h4 className="truncate text-lg font-black tracking-tight text-slate-900">
            {member.employee_name}
          </h4>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {member.position || t("team.noPosition")}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/70 bg-white/75 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          {t("team.currentTask")}
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {member.profileNote || member.current_work || t("team.noFocus")}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t("team.projectCount")}
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              {projectCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t("projects.delivery")}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {formatDate(member.currentProjectEndDate)}
            </p>
          </div>
        </div>
      </div>

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
          {messageLabel || t("team.message")}
        </button>
      </div>
    </div>
  );
}

export default TeamCard;
