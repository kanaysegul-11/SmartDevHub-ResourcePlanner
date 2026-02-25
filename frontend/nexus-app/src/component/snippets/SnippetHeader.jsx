"use client";
import React from "react";
import { TextField } from "../../ui/components/TextField";
import { FeatherSearch } from "@subframe/core";

function SnippetHeader({ searchTerm, onSearchChange }) {
  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-4 border-b bg-white px-8 py-5">
      <div className="grow">
        <span className="block text-2xl font-bold text-slate-800">Kod Kütüphanesi</span>
        <span className="text-sm text-slate-500">Ekibin ortak bilgi havuzu.</span>
      </div>
      <div className="flex items-center gap-4">
        <TextField
          placeholder="Kod ara..."
          className="w-64"
          icon={<FeatherSearch />}
          value={searchTerm}
          onChange={onSearchChange}
        />
      </div>
    </div>
  );
}

export default SnippetHeader;
