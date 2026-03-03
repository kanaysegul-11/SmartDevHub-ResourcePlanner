"use client";
import React from "react";
import { FeatherUsers } from "@subframe/core";
import { PieChart } from "../../ui/components/PieChart";

function SentimentChart({ data, isLoading = false }) {
  const pieColors = ["#22c55e", "#9333ea", "#ef4444"];
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="col-span-12 flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md lg:col-span-5">
      <h3 className="mb-8 flex self-start items-center gap-3 text-xl font-bold text-slate-800">
        <div className="rounded-lg bg-pink-100 p-2 text-pink-600">
          <FeatherUsers size={20} />
        </div>
        Kullanici Memnuniyeti
      </h3>

      <PieChart
        className="h-64 w-full"
        data={safeData}
        index="name"
        category="value"
        colors={pieColors}
        legend={null}
      />

      <div className="mt-8 grid w-full grid-cols-3 gap-4">
        {safeData.map((item) => (
          <div
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3"
            key={item.name}
          >
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs font-bold uppercase tracking-tighter text-slate-600">
              {item.name}
            </span>
            <span className="text-lg font-black text-slate-800">
              %{isLoading ? "..." : item.percentage ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SentimentChart;
