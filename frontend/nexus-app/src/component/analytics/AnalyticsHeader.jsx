"use client";
import React from "react";
import { TextField } from "../../ui/components/TextField";
import { FeatherSearch } from "@subframe/core";

function AnalyticsHeader({ searchTerm = "", onSearchChange }) {
  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-4 border-b bg-white px-8 py-5 shadow-sm">
      <div className="grow">
        <span className="block text-2xl font-black tracking-tight text-slate-800">Snippet Analytics</span>
        <span className="text-sm font-medium text-slate-500">Kütüphanenizin performans verileri burada.</span>
      </div>
      <TextField
        className="w-72"
        placeholder="Analizlerde ara..."
        icon={<FeatherSearch />}
        value={searchTerm}
        onChange={onSearchChange}
      />
    </div>
  );
}

export default AnalyticsHeader;
