import React from "react";
import TeamCard from "./TeamCard";

function TeamList({ title, count, icon, members, variant, onDelete, emptyMessage }) {
  const isBusy = variant === "busy";
  const gridClass = isBusy
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";

  return (
    <section className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className={isBusy ? "p-2 bg-amber-100 text-amber-600 rounded-lg" : "p-2 bg-green-100 text-green-600 rounded-lg"}>
          {icon}
        </div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          {title} <span className="text-slate-400 font-medium ml-2">({count})</span>
        </h2>
      </div>

      <div className={gridClass}>
        {members.map((member) => (
          <TeamCard key={member.id} member={member} variant={variant} onDelete={onDelete} />
        ))}
        {members.length === 0 && <p className="text-slate-400 text-sm font-medium italic">{emptyMessage}</p>}
      </div>
    </section>
  );
}

export default TeamList;
