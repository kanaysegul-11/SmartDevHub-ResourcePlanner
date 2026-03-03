"use client";
import React from "react";
import { FeatherChevronLeft } from "@subframe/core";

function SnippetDetailHeader({ title, onBack }) {
  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-purple-600"
      >
        <FeatherChevronLeft size={16} /> Geri Dön
      </button>
      <h1 className="text-4xl font-black tracking-tight text-slate-800">{title}</h1>
    </>
  );
}

export default SnippetDetailHeader;
