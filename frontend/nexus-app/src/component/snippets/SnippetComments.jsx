"use client";
import React from "react";
import { Avatar } from "../../ui/components/Avatar";
import { Button } from "../../ui/components/Button";
import { FeatherMessageCircle, FeatherStar } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

function SnippetComments({ comments = [], newComment, onCommentChange, onSubmit, isSubmitting }) {
  const { t } = useI18n();

  return (
    <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.92))] p-6 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-slate-800">
            <FeatherMessageCircle size={18} className="text-sky-600" />
            {t("snippets.comments")} ({comments.length || 0})
          </h3>
        </div>
        <div className="rounded-[20px] border border-slate-200/80 bg-white/90 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {t("snippets.commentPanelLabel")}
          </p>
          <p className="mt-2 text-lg font-black text-slate-900">{comments.length}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {comments.length ? (
            comments.map((comment) => (
              <div key={comment.id} className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar size="medium">{comment.author_details?.username?.[0]?.toUpperCase() || "A"}</Avatar>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {comment.author_details?.username || t("snippets.anonymous")}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {t("snippets.commentEntry")}
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    <FeatherStar size={12} />
                    {comment.experience_rating || 5} / 5
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{comment.text}</p>
              </div>
            ))
          ) : (
            <div className="h-44 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80" />
          )}
        </div>

        <form onSubmit={onSubmit} className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 text-slate-950 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("snippets.commentComposer")}
          </p>
          <h4 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {t("snippets.commentComposerTitle")}
          </h4>

          <textarea
            className="mt-5 min-h-[180px] w-full resize-none rounded-[22px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
            placeholder={t("snippets.commentPlaceholder")}
            rows="6"
            value={newComment}
            onChange={(event) => onCommentChange(event.target.value)}
          />

          <Button
            type="submit"
            className="mt-5 w-full rounded-[18px] bg-slate-950 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            disabled={isSubmitting}
          >
            {t("snippets.send")}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default SnippetComments;
