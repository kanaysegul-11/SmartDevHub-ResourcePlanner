"use client";
import React from "react";
import { Avatar } from "../../ui/components/Avatar";
import { 
  FeatherChevronRight, 
  FeatherMessageSquare, 
  FeatherAlertTriangle, 
  FeatherTrash2 
} from "@subframe/core";
import { scanCodeSecurity } from "../../utils/SecurityScanner";
import { useDelete } from "@refinedev/core";
import { Button, Popconfirm } from "antd";

function SnippetCard({ snippet, onClick }) {
  const { mutate: deleteSnippet } = useDelete();

  const handleDelete = (e) => {
    // ÖNEMLİ: Butona tıklandığında kartın kendi onClick'inin çalışmasını engeller.
    e.stopPropagation(); 
    
    deleteSnippet({
      resource: "snippets",
      id: snippet.id,
      successNotification: {
        message: "Başarıyla Silindi",
        description: "Kod bloğu kütüphaneden kalıcı olarak kaldırıldı.",
        type: "success",
      },
    });
  };

  const risks = scanCodeSecurity(snippet.code || "");

  const highlightRisks = (code) => {
    if (!code) return "";
    if (!risks || risks.length === 0) return code;

    return code.split("\n").map((line, i) => {
      let highlightedLine = line;
      risks.forEach((risk) => {
        if (risk.patternString) {
          const regex = new RegExp(`(${risk.patternString})`, "gi");
          highlightedLine = highlightedLine.replace(
            regex,
            `<span style="color: #ff4d4f; font-weight: 900; background-color: rgba(255, 77, 79, 0.2); padding: 0 2px; border-radius: 2px;">$1</span>`
          );
        }
      });
      return <div key={i} dangerouslySetInnerHTML={{ __html: highlightedLine }} />;
    });
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-purple-400 hover:shadow-md min-h-[340px] h-auto cursor-pointer"
    >
      {/* SİLME BUTONU (Sağ Üst Köşe) */}
      <div className="absolute top-4 right-10 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Popconfirm
         title="Bu kodu silmek istediğinize emin misiniz?"
  onConfirm={handleDelete}
  onCancel={(e) => e.stopPropagation()}
  okText="Evet, Sil"
  cancelText="Vazgeç"
  // Butonun stilini burada zorluyoruz (Inline style ile garantiye alıyoruz)
  okButtonProps={{ 
    danger: true, 
    type: 'primary',
    style: { backgroundColor: '#ff4d4f', color: 'white', fontWeight: 'bold' } 
  }}
  cancelButtonProps={{
    style: { borderRadius: '6px' }
  }}
>
  <div 
    onClick={(e) => e.stopPropagation()} 
    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-200"
  >
    <FeatherTrash2 size={16} />
  </div>
        </Popconfirm>
      </div>

      {/* ÜST KISIM: DİL ETİKETİ */}
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-600">
          {snippet.language}
        </span>
        <FeatherChevronRight className="text-slate-300 group-hover:text-purple-600" size={16} />
      </div>

      {/* BAŞLIK VE AÇIKLAMA */}
      <div className="mb-2">
        <h3 className="mb-1 text-lg font-bold text-slate-800 line-clamp-1">
          {snippet.title}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-500">
          {snippet.description}
        </p>
      </div>

      {/* KOD ÖNİZLEME */}
      <div className="relative my-4 flex-grow rounded-xl bg-[#0d1117] p-4 border border-slate-800 overflow-hidden font-mono text-[11px] leading-relaxed text-blue-100">
        <pre>
          <code>{highlightRisks(snippet.code)}</code>
        </pre>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0d1117] to-transparent opacity-50" />
      </div>

      {/* RİSK UYARISI */}
      {risks.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-red-600 bg-red-50 w-fit px-3 py-1 rounded-full border border-red-100 animate-pulse">
            <FeatherAlertTriangle size={12} />
            <span>{risks.length} GÜVENLİK RİSKİ</span>
          </div>
        </div>
      )}

      {/* ALT KISIM */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-4">
        <div className="flex items-center gap-2">
          <Avatar size="x-small" variant="neutral">
            {snippet.author_details?.username ? snippet.author_details.username[0].toUpperCase() : "A"}
          </Avatar>
          <span className="text-xs font-medium text-slate-600">
            {snippet.author_details?.username || "Anonim"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <FeatherMessageSquare size={14} />
          <span>{snippet.comments?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}

export default SnippetCard;