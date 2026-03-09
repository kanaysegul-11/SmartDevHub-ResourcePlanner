﻿"use client";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../../ui/components/Avatar";
import { Button } from "../../ui/components/Button";
import { FeatherActivity, FeatherArrowUpRight, FeatherClock, FeatherStar } from "@subframe/core";

function DashboardSummary({ stats, teamActivities = [], onMemberClick }) {
  const navigate = useNavigate();
  const latestSnippet = stats?.latestSnippet;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-8">
      {/* SON KOD KUTUSU */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md">
        <div className="px-8 py-5 border-b flex items-center justify-between bg-slate-50/50">
          <span className="font-bold text-slate-700 flex items-center gap-2">
            <FeatherClock size={18} className="text-purple-600" /> Son Eklenen Kod
          </span>
          <Button variant="neutral-tertiary" size="small" icon={<FeatherArrowUpRight />} onClick={() => navigate('/snippets')}>
            Tümünü Gör
          </Button>
        </div>
        <div className="p-8">
          {latestSnippet ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-xl text-slate-800">{latestSnippet.title}</h3>
                <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-3 py-1 rounded-full uppercase tracking-widest">{latestSnippet.language}</span>
              </div>
              <p className="text-slate-500 leading-relaxed line-clamp-2">{latestSnippet.description}</p>
              {latestSnippet.experience_rating >= 4.5 && (
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-100 w-fit px-2 py-1 rounded">
                  <FeatherStar size={12} fill="currentColor" /> TOP RATED
                </div>
              )}
              <div className="bg-slate-900 rounded-2xl p-5 text-[11px] text-blue-300 font-mono border border-slate-800 shadow-inner">
                <pre><code>{latestSnippet.code?.substring(0, 150)}...</code></pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 italic font-medium">Henüz kod verisi bulunamadı.</div>
          )}
        </div>
      </div>

      {/* EKİP DURUMU KUTUSU */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md">
        <div className="px-8 py-5 border-b flex items-center justify-between bg-slate-50/50">
          <span className="font-bold text-slate-700 flex items-center gap-2">
            <FeatherActivity size={18} className="text-pink-600" /> Ekip Durumu
          </span>
          {teamActivities.filter(m => m.status_type === 'busy').length > 2 && (
            <span className="text-[10px] font-bold text-orange-500 animate-pulse bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">YÜKSEK İŞ YÜKÜ</span>
          )}
        </div>
        <div className="p-8 flex flex-col gap-6">
          {teamActivities.length > 0 ? (
            teamActivities.slice(0, 4).map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                onClick={() => onMemberClick && onMemberClick(member)}
              >
                <Avatar size="small" variant={member.status_type === 'busy' ? 'neutral' : 'brand'}>
                  {(member.employee_name || "U")[0].toUpperCase()}
                </Avatar>
                <div className="grow">
                  <span className="text-sm font-bold block text-slate-800 group-hover:text-purple-600 transition-colors">{member.employee_name}</span>
                  <span className="text-xs text-slate-400 font-medium line-clamp-1">{member.current_work}</span>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full shadow-sm ${member.status_type === 'busy' ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`}></div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 italic font-medium">Ekip bilgisi alınamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardSummary;