"use client";
import React, { useEffect, useState } from "react";
import { useDelete, useUpdate } from "@refinedev/core";
import {
  FeatherEdit2,
  FeatherMessageCircle,
  FeatherStar,
  FeatherTrash2,
} from "@subframe/core";
import { notification } from "antd";
import { Avatar } from "../../ui/components/Avatar";
import { Button } from "../../ui/components/Button";
import { useI18n } from "../../I18nContext.jsx";
import { useUser } from "../../UserContext.jsx";
import ConfirmDialog from "../common/ConfirmDialog.jsx";

const RATING_OPTIONS = [1, 2, 3, 4, 5];

function RatingSelector({
  value = 0,
  onChange,
  disabled = false,
  label,
  helperText,
  error = false,
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <span
          className={`inline-flex min-w-[64px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
            value
              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
          }`}
        >
          {value ? `${value} / 5` : "- / 5"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {RATING_OPTIONS.map((rating) => {
          const isActive = value >= rating;

          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              disabled={disabled}
              aria-label={`${rating} / 5`}
              aria-pressed={value === rating}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-700"
              }`}
            >
              <FeatherStar
                size={14}
                fill="currentColor"
                className={isActive ? "text-amber-500" : "text-slate-300"}
              />
              {rating}
            </button>
          );
        })}
      </div>

      <p className={`mt-2 text-xs leading-6 ${error ? "text-red-600" : "text-slate-500"}`}>
        {helperText}
      </p>
    </div>
  );
}

function SnippetComments({
  comments = [],
  newComment,
  newRating,
  onCommentChange,
  onRatingChange,
  onSubmit,
  isSubmitting,
  onCommentsChanged,
}) {
  const { t } = useI18n();
  const { userData } = useUser();
  const { mutate: updateComment, isLoading: isUpdatingComment } = useUpdate();
  const { mutate: deleteComment, isLoading: isDeletingComment } = useDelete();
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editingRating, setEditingRating] = useState(0);
  const [pendingCommentId, setPendingCommentId] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);

  const currentUserId = String(userData?.id || "").trim();
  const currentUsername = String(userData?.username || "").trim().toLowerCase();

  useEffect(() => {
    if (editingCommentId && !comments.some((comment) => comment.id === editingCommentId)) {
      const resetEditingState = window.setTimeout(() => {
        setEditingCommentId(null);
        setEditingText("");
        setEditingRating(0);
      }, 0);
      return () => window.clearTimeout(resetEditingState);
    }
    return undefined;
  }, [comments, editingCommentId]);

  const canManageComment = (comment) => {
    if (userData?.isAdmin) {
      return true;
    }

    const authorId = String(comment.author_details?.id || comment.author || "").trim();
    const authorUsername = String(comment.author_details?.username || "")
      .trim()
      .toLowerCase();

    if (currentUserId && authorId && currentUserId === authorId) {
      return true;
    }

    return Boolean(currentUsername && authorUsername && currentUsername === authorUsername);
  };

  const handleStartEditing = (comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text || "");
    setEditingRating(Number(comment.experience_rating) || 0);
  };

  const handleCancelEditing = () => {
    setEditingCommentId(null);
    setEditingText("");
    setEditingRating(0);
  };

  const handleSaveComment = (commentId) => {
    const nextText = editingText.trim();
    if (!nextText || !editingRating || isUpdatingComment) return;

    setPendingCommentId(commentId);
    updateComment(
      {
        resource: "comments",
        id: commentId,
        values: { text: nextText, experience_rating: editingRating },
      },
      {
        onSuccess: () => {
          notification.success({
            message: t("snippets.commentUpdatedTitle"),
            description: t("snippets.commentUpdatedBody"),
            placement: "topRight",
          });
          handleCancelEditing();
          setPendingCommentId(null);
          onCommentsChanged?.();
        },
        onError: (error) => {
          const serverMessage =
            error?.response?.data?.experience_rating?.[0] ||
            error?.response?.data?.text?.[0] ||
            error?.response?.data?.detail ||
            t("snippets.commentUpdateErrorBody");
          notification.error({
            message: t("snippets.commentUpdateErrorTitle"),
            description: serverMessage,
            placement: "topRight",
            duration: 5,
          });
          setPendingCommentId(null);
        },
      }
    );
  };

  const handleDeleteComment = () => {
    if (!commentToDelete || isDeletingComment) return;

    setPendingCommentId(commentToDelete.id);
    deleteComment(
      { resource: "comments", id: commentToDelete.id },
      {
        onSuccess: () => {
          notification.success({
            message: t("snippets.commentDeletedTitle"),
            description: t("snippets.commentDeletedBody"),
            placement: "topRight",
          });
          if (editingCommentId === commentToDelete.id) {
            handleCancelEditing();
          }
          setCommentToDelete(null);
          setPendingCommentId(null);
          onCommentsChanged?.();
        },
        onError: (error) => {
          const serverMessage =
            error?.response?.data?.detail || t("snippets.commentDeleteErrorBody");
          notification.error({
            message: t("snippets.commentDeleteErrorTitle"),
            description: serverMessage,
            placement: "topRight",
            duration: 5,
          });
          setPendingCommentId(null);
        },
      }
    );
  };

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
            comments.map((comment) => {
              const isEditing = editingCommentId === comment.id;
              const isProcessing =
                pendingCommentId === comment.id && (isUpdatingComment || isDeletingComment);

              return (
                <div key={comment.id} className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar size="medium">
                        {comment.author_details?.username?.[0]?.toUpperCase() || "A"}
                      </Avatar>
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
                      {comment.experience_rating ?? "-"} / 5
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-3">
                      <textarea
                        className="min-h-[120px] w-full resize-none rounded-[18px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        placeholder={t("snippets.commentPlaceholder")}
                        disabled={isProcessing}
                      />
                      <RatingSelector
                        value={editingRating}
                        onChange={setEditingRating}
                        disabled={isProcessing}
                        label={t("snippets.commentRatingLabel")}
                        helperText={
                          !editingRating && editingText.trim()
                            ? t("snippets.commentRatingRequiredInline")
                            : t("snippets.commentRatingHint")
                        }
                        error={!editingRating && Boolean(editingText.trim())}
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEditing}
                          disabled={isProcessing}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {t("app.cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveComment(comment.id)}
                          disabled={isProcessing || !editingText.trim() || !editingRating}
                          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {t("snippets.saveComment")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-slate-600">{comment.text}</p>
                  )}

                  {canManageComment(comment) ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isEditing ? null : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditing(comment)}
                            disabled={isProcessing || isDeletingComment}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:opacity-60"
                          >
                            <FeatherEdit2 size={12} />
                            {t("snippets.editComment")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCommentToDelete(comment)}
                            disabled={isProcessing || isUpdatingComment}
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            <FeatherTrash2 size={12} />
                            {t("snippets.deleteComment")}
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-6">
              <p className="text-sm leading-7 text-slate-500">{t("snippets.noCommentsBody")}</p>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 text-slate-950 shadow-[0_20px_50px_rgba(148,163,184,0.14)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("snippets.commentComposer")}
          </p>
          <h4 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {t("snippets.commentComposerTitle")}
          </h4>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {t("snippets.commentComposerBody")}
          </p>

          <RatingSelector
            value={Number(newRating) || 0}
            onChange={onRatingChange}
            disabled={isSubmitting}
            label={t("snippets.commentRatingLabel")}
            helperText={
              !newRating && newComment.trim()
                ? t("snippets.commentRatingRequiredInline")
                : t("snippets.commentRatingHint")
            }
            error={!newRating && Boolean(newComment.trim())}
          />

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
            disabled={isSubmitting || !newComment.trim() || !newRating}
          >
            {t("snippets.send")}
          </Button>
        </form>
      </div>

      <ConfirmDialog
        open={Boolean(commentToDelete)}
        title={t("snippets.deleteComment")}
        description={t("snippets.commentDeleteConfirm")}
        confirmLabel={t("snippets.deleteComment")}
        cancelLabel={t("app.cancel")}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        isProcessing={isDeletingComment}
      />
    </div>
  );
}

export default SnippetComments;
