"use client";
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOne, useCreate, useInvalidate } from "@refinedev/core";

// Import yollarını tekrar kontrol et, hata verirse klasör yapına göre ../ sayısını artır/azalt
import Sidebar from "../component/layout/Sidebar";
import SnippetDetailHeader from "../component/snippets/SnippetDetailHeader";
import SnippetComments from "../component/snippets/SnippetComments";
import { scanCodeSecurity } from "../utils/SecurityScanner"; 
import SecurityReportCard from "../component/security/SecurityReportCard";

function SnippetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState("");
  const invalidate = useInvalidate();

  // 1. VERİ ÇEKME: Refine genelde veriyi 'data' içinde 'data' olarak döner
 const snippetQuery = useOne({ resource: "snippets", id });
 const snippet = snippetQuery.data?.data;

  // Refine veri yapısı: queryResult.data (API yanıtı) -> .data (Snippet objesi)

  // 2. RİSK ANALİZİ: snippet varsa çalıştır
  const risks = snippet?.code ? scanCodeSecurity(snippet.code) : [];
  // 3. VURGULAMA FONKSİYONU
  const renderHighlightedCode = (codeText) => {
    if (!codeText) return "";
    if (!risks || risks.length === 0) return codeText;

    return codeText.split("\n").map((line, i) => {
      let highlightedLine = line;
      risks.forEach((risk) => {
        if (risk.patternString) {
          const regex = new RegExp(`(${risk.patternString})`, "gi");
          highlightedLine = highlightedLine.replace(
            regex,
            `<span style="color: #ff4d4f; font-weight: 900; text-decoration: underline; background-color: rgba(255, 77, 79, 0.2); padding: 0 4px; border-radius: 4px;">$1</span>`
          );
        }
      });
      return (
        <div key={i} dangerouslySetInnerHTML={{ __html: highlightedLine }} />
      );
    });
  };

  const { mutate: createComment, isLoading: isSubmitting } = useCreate();

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
          invalidate({ resource: "snippets", id, invalidates: ["detail"] });
        },
      }
    );
  };

  // DURUM KONTROLLERİ
  if (snippetQuery?.isLoading) return <div className="p-20 text-center font-bold text-purple-600 italic animate-pulse">Analiz Başlatılıyor...</div>;
  
  if (snippetQuery?.isError || !snippet) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <p className="text-slate-500 font-bold">Snippet bulunamadı veya ID geçersiz.</p>
      <button onClick={() => navigate("/snippets")} className="text-blue-500 underline text-sm">Listeye Dön</button>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc]">
      <Sidebar activeItem="snippets" logoutVariant="danger" logoClickable={true}  showTeamSubmenu={true} />

      <div className="grow overflow-hidden flex flex-col">
        <div className="flex-grow overflow-y-auto px-10 py-8">
          <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            <SnippetDetailHeader title={snippet.title} onBack={() => navigate("/snippets")} />
            
            {/* AKILLI KOD PANELİ */}
            <div className="relative rounded-2xl bg-[#0d1117] p-8 font-mono text-sm leading-relaxed text-blue-100 border border-slate-800 shadow-2xl overflow-hidden">
              <div className="absolute top-4 right-6 text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-800/50 px-2 py-1 rounded">
                {snippet.language}
              </div>
              <pre className="overflow-x-auto">
                <code>{renderHighlightedCode(snippet.code)}</code>
              </pre>
            </div>
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
    </div>
  );
}

export default SnippetDetail;
