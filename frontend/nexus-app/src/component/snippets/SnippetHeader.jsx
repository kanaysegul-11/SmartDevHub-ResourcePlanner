"use client";
import React from "react";
import { FeatherSearch } from "@subframe/core";

function SnippetHeader({ searchTerm, onSearchChange }) {
  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-4 border-b bg-white px-8 py-5">
      <div className="grow">
        <span className="block text-2xl font-bold text-slate-800">Kod Kütüphanesi</span>
        <span className="text-sm text-slate-500">Ekibin ortak bilgi havuzu.</span>
      </div>
      <div className="flex items-center gap-4">
        {/* TextField yerine standart ve şık bir input yapısı */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <FeatherSearch size={16} />
          </div>
          <input
            type="text"
            placeholder="Kod ara..."
            className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-all"
            value={searchTerm}
            onChange={onSearchChange} 
          />
        </div>
      </div>
    </div>
  );
}

export default SnippetHeader;