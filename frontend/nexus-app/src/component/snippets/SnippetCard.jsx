"use client";
import React from "react";
import { Avatar } from "../../ui/components/Avatar";
import { FeatherChevronRight, FeatherMessageSquare } from "@subframe/core";

function SnippetCard({ snippet, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group flex h-[340px] cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-purple-400 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-600">
          {snippet.language}
        </span>
        <FeatherChevronRight className="text-slate-300 group-hover:text-purple-600" />
      </div>
      <div className="h-20 overflow-hidden">
        <h3 className="mb-1 line-clamp-1 text-lg font-bold text-slate-800">{snippet.title}</h3>
        <p className="line-clamp-2 text-sm text-slate-500">{snippet.description}</p>
      </div>
      <div className="relative my-3 flex-grow overflow-hidden rounded-xl bg-slate-900 p-4">
        <pre className="font-mono text-[11px] leading-tight text-blue-300 opacity-80">
          <code>{snippet.code}</code>
        </pre>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-40" />
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-3">
        <div className="flex items-center gap-2">
          <Avatar size="x-small" variant="neutral">
            {snippet.author_details?.username ? snippet.author_details.username[0].toUpperCase() : "A"}
          </Avatar>
          <span className="text-xs text-slate-600">{snippet.author_details?.username || "Anonim"}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <FeatherMessageSquare size={14} />
          <span>{snippet.comments?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}

export default SnippetCard;
