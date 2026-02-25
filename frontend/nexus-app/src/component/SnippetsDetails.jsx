"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar } from "../ui/components/Avatar";
import { Button } from "../ui/components/Button";
import { 
  FeatherZap, FeatherLayout, FeatherCode, FeatherChevronLeft, 
  FeatherMessageCircle, FeatherLogOut, FeatherActivity, FeatherTrendingUp, FeatherUsers
} from "@subframe/core";

function SnippetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [snippet, setSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  const fetchDetail = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:8000/api/snippets/${id}/`, {
        headers: { Authorization: `Token ${token}` }
      });
      setSnippet(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:8000/api/comments/`, {
        snippet: id, text: newComment, experience_rating: 5
      }, { headers: { Authorization: `Token ${token}` } });
      setNewComment("");
      fetchDetail();
    } catch (err) { alert("Hata!",err); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-purple-600">Yükleniyor...</div>;

  return (
    <div className="flex w-full h-screen bg-[#f8fafc] overflow-hidden">
      {/* SIDEBAR (Listeyle Aynı Tasarım) */}
      <div className="w-64 border-r bg-white flex flex-col px-4 py-6 shadow-lg z-20">
         <div className="flex items-center gap-3 px-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-md"><FeatherZap className="text-white" /></div>
            <span className="text-xl font-bold">Nexus</span>
         </div>
         <nav className="flex flex-col gap-1 w-full">
            <Button className="w-full justify-start" variant="neutral-tertiary" icon={<FeatherLayout />} onClick={() => navigate('/')}>Dashboard</Button>
            <Button className="w-full justify-start bg-purple-50 text-purple-600 font-bold" variant="neutral-tertiary" icon={<FeatherCode />} onClick={() => navigate('/snippets')}>Code Library</Button>
            <Button className="w-full justify-start" variant="neutral-tertiary" icon={<FeatherTrendingUp />} onClick={() => navigate('/analytics')}>Analytics</Button>
         </nav>
      </div>

      <div className="flex grow overflow-hidden">
        {/* SOL: KOD PANELİ */}
        <div className="flex-grow overflow-y-auto px-10 py-8 flex flex-col gap-6">
          <button onClick={() => navigate('/snippets')} className="flex items-center gap-2 text-slate-400 hover:text-purple-600 font-bold text-sm">
            <FeatherChevronLeft size={16} /> Geri Dön
          </button>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">{snippet.title}</h1>
          <div className="bg-[#0d1117] rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
            <div className="bg-[#161b22] px-6 py-3 border-b border-slate-800 flex justify-between">
              <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <span className="text-xs text-slate-500 font-mono">{snippet.language}</span>
            </div>
            <div className="p-8 overflow-x-auto"><pre className="text-[#c9d1d9] font-mono leading-relaxed"><code>{snippet.code}</code></pre></div>
          </div>
        </div>

        {/* SAĞ: YORUM PANELİ (SABİT) */}
        <div className="w-[400px] border-l bg-white flex flex-col shadow-2xl">
          <div className="p-6 border-b font-bold text-slate-800 flex items-center gap-2 bg-slate-50">
            <FeatherMessageCircle size={18} className="text-purple-600" /> Yorumlar ({snippet.comments?.length || 0})
          </div>
          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
            {snippet.comments?.map(c => (
              <div key={c.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar size="x-small">{c.author_details?.username?.[0].toUpperCase() || "A"}</Avatar>
                  <span className="text-xs font-bold text-slate-700">{c.author_details?.username || "Anonim"}</span>
                </div>
                <p className="text-sm text-slate-600">{c.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="p-6 border-t bg-white flex flex-col gap-3">
            <textarea 
              className="w-full p-4 bg-slate-50 border rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              placeholder="Yorum yap..." rows="3" value={newComment} onChange={e => setNewComment(e.target.value)}
            />
            <Button type="submit" className="w-full bg-purple-600 text-white rounded-xl py-3" disabled={isSubmitting}>Gönder</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
export default SnippetDetail;