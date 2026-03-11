import React from "react";
import { FeatherAlertTriangle, FeatherInfo, FeatherShieldCheck } from "@subframe/core";

const SecurityReportCard = ({ risks = [] }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <FeatherShieldCheck size={20} className="text-blue-500" />
          NEXUS GÜVENLİK ANALİZİ
        </h3>
        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
          risks.length > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-green-50 text-green-600'
        }`}>
          {risks.length > 0 ? `${risks.length} TEHLİKE TESPİT EDİLDİ` : 'SİSTEM GÜVENLİ'}
        </span>
      </div>

      <div className="space-y-4">
        {risks.length > 0 ? (
          risks.map((risk, index) => (
            <div 
              key={index} 
              className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 border-l-4 border-red-500 hover:bg-red-50/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FeatherAlertTriangle size={16} className="text-red-500" />
                <span className="text-xs font-black text-slate-700 uppercase">
                   BULGU: <span className="text-red-600 underline">{risk.label}</span>
                </span>
                <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                  {risk.level || "KRİTİK"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium italic leading-relaxed">
                "{risk.message}"
              </p>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 text-green-700 text-xs font-bold">
            <FeatherInfo size={18} />
            Sistem tarandı: Herhangi bir siber risk tespit edilmedi. Kod temiz görünüyor.
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityReportCard;