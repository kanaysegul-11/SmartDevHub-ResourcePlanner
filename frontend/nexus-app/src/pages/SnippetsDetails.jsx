"use client";
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOne, useCreate, useInvalidate } from "@refinedev/core";
import Sidebar from "../component/layout/Sidebar";
import SnippetDetailHeader from "../component/snippets/SnippetDetailHeader";
import SnippetCodePanel from "../component/snippets/SnippetCodePanel";
import SnippetComments from "../component/snippets/SnippetComments";

function SnippetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState("");

  const { result: snippet, query: snippetQuery } = useOne({
    resource: "snippets",
    id,
  });

  const { mutate: createComment, isLoading: isSubmitting } = useCreate();
  const invalidate = useInvalidate();

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    createComment(
      {
        resource: "comments",
        values: { snippet: id, text: newComment, experience_rating: 5 },
      },
      {
        onSuccess: () => {
          setNewComment("");
          invalidate({
            resource: "snippets",
            id,
            invalidates: ["detail"],
          });
        },
        onError: (err) => {
          alert("Hata!", err);
        },
      }
    );
  };

  if (snippetQuery?.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-purple-600">
        Yukleniyor...
      </div>
    );
  }

  if (!snippet) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-slate-500">
        Snippet bulunamadı.
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc]">
      <Sidebar activeItem="snippets" logoutVariant="danger" logoClickable={true} />

      <div className="flex grow overflow-hidden">
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-10 py-8">
          <SnippetDetailHeader
            title={snippet.title}
            onBack={() => navigate("/snippets")}
          />
          <SnippetCodePanel language={snippet.language} code={snippet.code} />
        </div>

        <SnippetComments
          comments={snippet.comments || []}
          newComment={newComment}
          onCommentChange={setNewComment}
          onSubmit={handleAddComment}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}

export default SnippetDetail;
