"use client";
import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { FeatherStar, FeatherTrendingUp, FeatherTrendingDown, FeatherCode } from "@subframe/core";

function LanguageLeaderboard() {
  // 1. Backend'den tüm snippet verilerini çekiyoruz
  const { data: snippetsData, isLoading } = useList({ 
    resource: "snippets",
    config: { hasPagination: false } 
  });

  // 2. Dilleri gruplayıp başarı oranlarını (average rating) hesaplıyoruz
  const leaderboard = useMemo(() => {
    const rawData = snippetsData?.data || [];
    const stats = {};

    rawData.forEach((s) => {
      const lang = s.language || "Unknown";
      if (!stats[lang]) stats[lang] = { total: 0, count: 0 };
      stats[lang].total += s.experience_rating || 0;
      stats[lang].count += 1;
    });

    return Object.keys(stats)
      .map((name) => ({
        name: name,
        avg: (stats[name].total / stats[name].count).toFixed(1),
        count: stats[name].count
      }))
      .sort((a, b) => b.avg - a.avg) // Puana göre azalan sıralama
      .slice(0, 5); // İlk 5 dili göster
  }, [snippetsData]);

  if (isLoading) return <div className="animate-pulse h-40 bg-slate-100 rounded-3xl" />;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
          <FeatherStar className="text-amber-500" size={16} fill="currentColor" /> 
          Dil Başarı Sıralaması
        </h3>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border">TOP 5</span>
      </div>

      <div className="flex flex-col gap-4">
        {leaderboard.map((item, index) => (
          <div key={item.name} className="flex items-center gap-4 group">
            {/* Sıra No ve İkon */}
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-sm
              ${index === 0 ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "bg-slate-50 text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors"}`}>
              {index + 1}
            </div>

            {/* Bilgi Alanı */}
            <div className="grow">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-slate-700">{item.name}</span>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                   ★ {item.avg}
                </span>
              </div>
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${index === 0 ? "bg-purple-600" : "bg-purple-400 opacity-60"}`}
                  style={{ width: `${(item.avg / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Küçük Bilgi */}
            <div className="flex flex-col items-end gap-1">
              {item.avg >= 4.0 ? (
                <FeatherTrendingUp size={14} className="text-green-500" />
              ) : (
                <FeatherTrendingDown size={14} className="text-slate-300" />
              )}
              <span className="text-[9px] font-bold text-slate-400 italic">{item.count} Kod</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LanguageLeaderboard;