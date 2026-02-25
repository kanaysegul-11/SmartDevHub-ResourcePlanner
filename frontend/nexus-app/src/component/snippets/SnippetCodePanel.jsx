"use client";
import React from "react";

function SnippetCodePanel({ language, code }) {
  return (
    <div className="flex min-h-[500px] flex-col overflow-hidden rounded-3xl bg-[#0d1117] shadow-2xl">
      <div className="flex justify-between border-b border-slate-800 bg-[#161b22] px-6 py-3">
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <span className="font-mono text-xs text-slate-500">{language}</span>
      </div>
      <div className="overflow-x-auto p-8">
        <pre className="font-mono leading-relaxed text-[#c9d1d9]">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export default SnippetCodePanel;
