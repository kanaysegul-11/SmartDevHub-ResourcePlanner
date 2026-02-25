"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../component/layout/Sidebar";
import SnippetDetailHeader from "../component/snippets/SnippetDetailHeader";
import SnippetCodePanel from "../component/snippets/SnippetCodePanel";
import SnippetComments from "../component/snippets/SnippetComments";

function SnippetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [snippet, setSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:8000/api/snippets/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      setSnippet(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:8000/api/comments/",
        { snippet: id, text: newComment, experience_rating: 5 },
        { headers: { Authorization: `Token ${token}` } }
      );
      setNewComment("");
      fetchDetail();
    } catch (err) {
      alert("Hata!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-purple-600">
        Yukleniyor...
      </div>
    );
  }

  if (!snippet) {
    return (
      <div className="flex h-screen items-center justify-center font-bold text-slate-500">
        Snippet bulunamadi.
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc]">
      <Sidebar activeItem="snippets" logoutVariant="danger" logoClickable={true} />

      <div className="flex grow overflow-hidden">
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-10 py-8">
          <SnippetDetailHeader title={snippet.title} onBack={() => navigate("/snippets")} />
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