import React from "react";
import TeamCard from "./TeamCard";
import { useI18n } from "../../I18nContext.jsx";

function TeamList({
  title,
  count,
  icon,
  members,
  variant,
  onDelete,
  onInspect,
  onMessageClick,
  canManage,
  emptyMessage,
}) {
  const { t } = useI18n();
  const isBusy = variant === "busy";

  return (
    <section className="w-full rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
      <div className="mb-7 flex items-center gap-4">
        <div
          className={
            isBusy
              ? "rounded-[20px] bg-amber-100 p-3 text-amber-700"
              : "rounded-[20px] bg-emerald-100 p-3 text-emerald-700"
          }
        >
          {icon}
        </div>
        <div>
          <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {count} {t("team.memberCount")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {members.map((member) => (
          <TeamCard
            key={member.id}
            member={member}
            variant={variant}
            onDelete={onDelete}
            onInspect={onInspect}
            onMessageClick={onMessageClick}
            canManage={canManage}
          />
        ))}
        {members.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/75 px-5 py-10 text-center text-sm font-medium italic text-slate-400">
            {emptyMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default TeamList;

