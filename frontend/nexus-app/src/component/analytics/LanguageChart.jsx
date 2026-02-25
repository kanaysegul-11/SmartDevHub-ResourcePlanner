"use client";
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FeatherActivity } from "@subframe/core";

function LanguageChart({ data }) {
  return (
    <div className="col-span-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md lg:col-span-7">
      <h3 className="mb-8 flex items-center gap-3 text-xl font-bold text-slate-800">
        <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
          <FeatherActivity size={20} />
        </div>
        Dil Populerligi
      </h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
            />
            <Bar dataKey="value" fill="#9333ea" radius={[6, 6, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default LanguageChart;
