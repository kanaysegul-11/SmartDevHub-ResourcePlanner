"use client";
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOne, useCreate, useInvalidate } from "@refinedev/core";
import { FeatherClock3, FeatherShield, FeatherUser } from "@subframe/core";
import Sidebar from "../component/layout/Sidebar";
import SnippetDetailHeader from "../component/snippets/SnippetDetailHeader";
import SnippetComments from "../component/snippets/SnippetComments";
import {
  renderHighlightedCodeLines,
  scanCodeSecurity,
} from "../utils/SecurityScanner";
import SecurityReportCard from "../component/security/SecurityReportCard";
import { useI18n } from "../I18nContext.jsx";

function SnippetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const [newComment, setNewComment] = useState("");
  const invalidate = useInvalidate();
  const snippetQuery = useOne({ resource: "snippets", id });
  const snippet = snippetQuery.data?.data;
  const risks = snippet?.code ? scanCodeSecurity(snippet.code) : [];

  const renderHighlightedCode = (codeText) => {
    return renderHighlightedCodeLines(
      codeText,
      risks,
      "rounded-[4px] bg-red-950/35 px-1 font-extrabold text-red-300 underline"
    );
  };

  const { mutate: createComment, isLoading: isSubmitting } = useCreate();
  const handleAddComment = (event) => {
    event.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    createComment(
      { resource: "comments", values: { snippet: id, text: newComment, experience_rating: 5 } },
      {
        onSuccess: () => {
          setNewComment("");
          invalidate({ resource: "snippets", id, invalidates: ["detail"] });
        },
      }
    );
  };

  const formatDate = (value) => {
    if (!value) return t("snippets.noTimeInfo");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("snippets.noTimeInfo");
    return new Intl.DateTimeFormat(language || "en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const metaCards = !snippet
    ? []
    : [
        {
          key: "author",
          label: t("snippets.detailAuthor"),
          value: snippet.author_details?.username || t("snippets.currentUserFallback"),
          icon: <FeatherUser size={18} />,
        },
        {
          key: "date",
          label: t("snippets.detailCreated"),
          value: formatDate(snippet.created_at),
          icon: <FeatherClock3 size={18} />,
        },
        {
          key: "risk",
          label: t("snippets.detailRiskLabel"),
          value: risks.length ? String(risks.length) : t("snippets.systemSecure"),
          icon: <FeatherShield size={18} />,
        },
      ];

  if (snippetQuery?.isLoading) {
    return (
      <div className="p-20 text-center font-bold italic text-sky-600 animate-pulse">
        {t("snippets.detailLoading")}
      </div>
    );
  }

  if (snippetQuery?.isError || !snippet) {
    return (
      <div className="flex flex-col items-center gap-4 p-20 text-center">
        <p className="font-bold text-slate-500">{t("snippets.detailNotFound")}</p>
        <button onClick={() => navigate("/snippets")} className="text-sm text-blue-500 underline">
          {t("snippets.backToList")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent">
      <Sidebar activeItem="snippets" logoutVariant="danger" logoClickable={true} showTeamSubmenu={true} />

      <div className="relative flex grow flex-col overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />

        <div className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-6 py-6 md:px-8 xl:px-10">
          <SnippetDetailHeader
            title={snippet.title}
            description={snippet.description}
            language={snippet.language}
            commentCount={snippet.comments?.length || 0}
            riskCount={risks.length}
            onBack={() => navigate("/snippets")}
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {metaCards.map((item) => (
              <div
                key={item.key}
                className="rounded-[26px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-5 shadow-[0_18px_40px_rgba(148,163,184,0.14)]"
              >
                <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700">{item.icon}</div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{item.value}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.08fr)_360px]">
            <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.95))] shadow-[0_24px_70px_rgba(148,163,184,0.16)]">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t("snippets.detailCodeSurface")}
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{snippet.title}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  {snippet.language}
                </span>
              </div>

              <div className="relative overflow-hidden px-6 py-6 font-mono text-sm leading-8 text-slate-950">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_32%)]" />
                <pre className="relative overflow-x-auto whitespace-pre-wrap break-words">
                  <code>{renderHighlightedCode(snippet.code)}</code>
                </pre>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.95))] p-6 text-slate-950 shadow-[0_24px_70px_rgba(148,163,184,0.16)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("snippets.detailReviewRail")}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                {t("snippets.detailReviewTitle")}
              </h2>

              <div className="mt-6 space-y-3">
                <div className="rounded-[22px] border border-slate-200/80 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("snippets.detailDescription")}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {snippet.description || t("snippets.noDescription")}
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-200/80 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("snippets.detailCommentCount")}
                  </p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{snippet.comments?.length || 0}</p>
                </div>

                <div className="rounded-[22px] border border-slate-200/80 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("snippets.detailRiskState")}
                  </p>
                  <p className="mt-3 text-2xl font-black text-slate-950">
                    {risks.length ? `${risks.length} ${t("snippets.riskDetected")}` : t("snippets.systemSecure")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <SecurityReportCard risks={risks} />
          <SnippetComments
            comments={snippet.comments || []}
            newComment={newComment}
            onCommentChange={setNewComment}
            onSubmit={handleAddComment}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}

export default SnippetDetail;
