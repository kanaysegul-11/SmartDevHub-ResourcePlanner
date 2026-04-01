"use client";
import React from "react";
import { Avatar } from "../../ui/components/Avatar";
import {
  FeatherAlertTriangle,
  FeatherChevronRight,
  FeatherEdit2,
  FeatherMessageSquare,
  FeatherTrash2,
} from "@subframe/core";
import {
  renderHighlightedCodeLines,
  scanCodeSecurity,
} from "../../utils/SecurityScanner";
import { useDelete } from "@refinedev/core";
import { Popconfirm } from "antd";
import { useI18n } from "../../I18nContext.jsx";
import { useUser } from "../../UserContext.jsx";
import { getSessionValue } from "../../refine/sessionStorage.js";

function SnippetCard({ snippet, onClick, onEdit }) {
  const { mutate: deleteSnippet } = useDelete();
  const { t } = useI18n();
  const { userData } = useUser();
  const risks = scanCodeSecurity(snippet.code || "");
  const currentUserId = String(userData?.id || getSessionValue("user_id") || "").trim();
  const currentUsername = String(
    userData?.username || getSessionValue("username") || ""
  )
    .trim()
    .toLowerCase();
  const canManageSnippet =
    Boolean(userData?.isAdmin) ||
    String(snippet.author_details?.id || "").trim() === currentUserId ||
    String(snippet.author_details?.username || "").trim().toLowerCase() === currentUsername;

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteSnippet({
      resource: "snippets",
      id: snippet.id,
      successNotification: {
        message: t("snippets.deletedTitle"),
        description: t("snippets.deletedBody"),
        type: "success",
      },
    });
  };

  const handleEdit = (event) => {
    event.stopPropagation();
    onEdit?.(snippet);
  };

  const highlightRisks = (code) => {
    return renderHighlightedCodeLines(
      code,
      risks,
      "rounded-[2px] bg-red-500/20 px-[2px] font-black text-red-300"
    );
  };

  return (
    <div onClick={onClick} className="group relative flex min-h-[340px] h-auto cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-purple-400 hover:shadow-md">
      {canManageSnippet ? (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleEdit}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-sky-700 shadow-sm transition-all hover:bg-sky-600 hover:text-white"
            aria-label={t("snippets.editSnippet")}
          >
            <FeatherEdit2 size={16} />
          </button>
          <Popconfirm title={t("snippets.deleteConfirm")} onConfirm={handleDelete} onCancel={(e) => e.stopPropagation()} okText={t("snippets.deleteYes")} cancelText={t("snippets.deleteCancel")} okButtonProps={{ danger: true, type: "primary", style: { backgroundColor: "#ff4d4f", color: "white", fontWeight: "bold" } }}>
            <div onClick={(e) => e.stopPropagation()} className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-100 text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white">
              <FeatherTrash2 size={16} />
            </div>
          </Popconfirm>
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-600">{snippet.language}</span>
        <FeatherChevronRight className="text-slate-300 group-hover:text-purple-600" size={16} />
      </div>
      <div className="mb-2">
        <h3 className="mb-1 line-clamp-1 text-lg font-bold text-slate-800">{snippet.title}</h3>
        <p className="line-clamp-2 text-sm text-slate-500">{snippet.description}</p>
      </div>
      <div className="relative my-4 flex-grow overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117] p-4 font-mono text-[11px] leading-relaxed text-blue-100">
        <pre><code>{highlightRisks(snippet.code)}</code></pre>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0d1117] to-transparent opacity-50" />
      </div>
      {risks.length > 0 && (
        <div className="mb-4">
          <div className="flex w-fit items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black text-red-600 animate-pulse">
            <FeatherAlertTriangle size={12} />
            <span>{risks.length} {t("snippets.securityRiskCount")}</span>
          </div>
        </div>
      )}
      <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-4">
        <div className="flex items-center gap-2">
          <Avatar size="x-small" variant="neutral">{snippet.author_details?.username ? snippet.author_details.username[0].toUpperCase() : "A"}</Avatar>
          <span className="text-xs font-medium text-slate-600">{snippet.author_details?.username || t("snippets.anonymous")}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400"><FeatherMessageSquare size={14} /><span>{snippet.comments?.length || 0}</span></div>
      </div>
    </div>
  );
}

export default SnippetCard;
