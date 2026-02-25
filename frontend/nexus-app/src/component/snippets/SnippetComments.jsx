"use client";
import React from "react";
import { Avatar } from "../../ui/components/Avatar";
import { Button } from "../../ui/components/Button";
import { FeatherMessageCircle } from "@subframe/core";

function SnippetComments({
  comments = [],
  newComment,
  onCommentChange,
  onSubmit,
  isSubmitting,
}) {
  return (
    <div className="flex w-[400px] flex-col border-l bg-white shadow-2xl">
      <div className="flex items-center gap-2 border-b bg-slate-50 p-6 font-bold text-slate-800">
        <FeatherMessageCircle size={18} className="text-purple-600" />
        Yorumlar ({comments.length || 0})
      </div>
      <div className="flex flex-grow flex-col gap-4 overflow-y-auto p-6">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Avatar size="x-small">
                {comment.author_details?.username?.[0]?.toUpperCase() || "A"}
              </Avatar>
              <span className="text-xs font-bold text-slate-700">
                {comment.author_details?.username || "Anonim"}
              </span>
            </div>
            <p className="text-sm text-slate-600">{comment.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t bg-white p-6">
        <textarea
          className="w-full resize-none rounded-2xl border bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Yorum yap..."
          rows="3"
          value={newComment}
          onChange={(e) => onCommentChange(e.target.value)}
        />
        <Button
          type="submit"
          className="w-full rounded-xl bg-purple-600 py-3 text-white"
          disabled={isSubmitting}
        >
          Gonder
        </Button>
      </form>
    </div>
  );
}

export default SnippetComments;
