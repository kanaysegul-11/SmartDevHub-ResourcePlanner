import {FeatherClok , FetaherUser, FeatherCode} from "@subframe/core";

export default function ActivityLog({activities = []}) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-2">
        <FeatherClock size={16} /> SİSTEM AKTİVİTE GÜNLÜĞÜ
      </h3>
      <div className="flex flex-col gap-4">
        {activities.map((act, i) => (
          <div key={i} className="flex gap-4 relative">
            {i !== activities.length - 1 && <div className="absolute left-4 top-8 w-0.5 h-6 bg-slate-100"></div>}
            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <FeatherUser size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-700 font-bold">
                {act.user} <span className="font-normal text-slate-400">tarafından</span> {act.action}
              </span>
              <span className="text-[10px] text-slate-400 font-mono uppercase">{act.time} — {act.target}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
    