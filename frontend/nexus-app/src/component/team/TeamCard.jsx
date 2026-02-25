import React from "react";
import { Avatar } from "../../ui/components/Avatar";
import { IconButton } from "../../ui/components/IconButton";
import { FeatherTrash2 } from "@subframe/core";

function TeamCard({ member, variant, onDelete }) {
  if (variant === "busy") {
    return (
      <div className="bg-white rounded-3xl border-b-4 border-amber-400 p-6 shadow-sm hover:shadow-xl transition-all relative group">
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton variant="neutral-tertiary" size="small" icon={<FeatherTrash2 className="text-red-400" />} onClick={() => onDelete(member.id)} />
        </div>
        <div className="flex items-center gap-4 mb-4">
          <Avatar variant="brand" size="large">{member.employee_name?.[0].toUpperCase()}</Avatar>
          <div>
            <h4 className="font-bold text-slate-800">{member.employee_name}</h4>
            <p className="text-xs font-bold text-slate-400 uppercase">{member.position}</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-sm font-semibold text-amber-900 leading-relaxed italic">"{member.current_work}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4 group hover:border-green-300 transition-colors">
      <Avatar variant="neutral" size="medium">{member.employee_name?.[0].toUpperCase()}</Avatar>
      <div className="grow">
        <h4 className="text-sm font-bold text-slate-800">{member.employee_name}</h4>
        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Müsait</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton variant="neutral-tertiary" size="small" icon={<FeatherTrash2 className="text-red-300" />} onClick={() => onDelete(member.id)} />
      </div>
    </div>
  );
}

export default TeamCard;
