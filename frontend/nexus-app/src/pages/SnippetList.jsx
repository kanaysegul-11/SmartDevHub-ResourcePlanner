"use client";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useList } from "@refinedev/core";
import Sidebar from "../component/layout/Sidebar";
import SnippetHeader from "../component/snippets/SnippetHeader";
import SnippetGrid from "../component/snippets/SnippetGrid";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { FeatherCode, FeatherSearch } from "@subframe/core";

function SnippetList() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const snippetsQuery = useList({
    resource: "snippets",
  });
  
  const snippets = snippetsQuery.data?.data ?? [];

  // MÜKERRER TEMİZLİĞİ + ARAMA FİLTRESİ
  const filteredSnippets = useMemo(() => {
    // 1. Adım: Önce kod içeriğine göre benzersiz olanları al
   const uniqueItems = [];
    const seenCodes = new Set();

    snippets.forEach((item) => {
      const normalizedCode = item.code?.trim();
      if (!seenCodes.has(normalizedCode)) {
        seenCodes.add(normalizedCode);
        uniqueItems.push(item);
      }
    });

   // 2. Arama kriterlerini genişletiyoruz
    const lowerSearch = searchTerm.toLowerCase().trim();
    if (!lowerSearch) return uniqueItems;

    return uniqueItems.filter((s) => {
      return (
        s.title?.toLowerCase().includes(lowerSearch) ||       // Başlıkta ara
        s.language?.toLowerCase().includes(lowerSearch) ||    // Dilde ara
        s.description?.toLowerCase().includes(lowerSearch) || // Açıklamada ara
        s.code?.toLowerCase().includes(lowerSearch)           // <--- KODUN İÇİNDE ARA!
      );
    });
  }, [snippets, searchTerm]);

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar
        activeItem="analytics"
        showTeamSubmenu={true}
        logoClickable={true}
      />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">
        <TopbarWithRightNav
          className="border-b border-solid border-neutral-border bg-white px-8 py-3"
          leftSlot={
            <Badge variant="neutral" icon={<FeatherCode />}>
              Snippet Workspace
            </Badge>
          }
          rightSlot={
            <Badge variant={filteredSnippets.length === 0 && searchTerm ? "error" : "success"}>
              {filteredSnippets.length} Sonuç Bulundu
            </Badge>
          }
        />

        {snippetsQuery.isLoading || snippetsQuery.isFetching ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
             <p className="text-purple-600 font-bold italic">Veriler Analiz Ediliyor...</p>
          </div>
        ) : (
          <>
            {/* Header'a state'leri doğru bağlıyoruz */}
            <SnippetHeader
              searchTerm={searchTerm}
              onSearchChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Arama sonucu boşsa kullanıcıya bilgi verelim */}
            {filteredSnippets.length === 0 && searchTerm ? (
              <div className="flex w-full flex-col items-center justify-center py-20 text-slate-400">
                <FeatherSearch size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">"{searchTerm}" için sonuç bulunamadı.</p>
                <button 
                  onClick={() => setSearchTerm("")}
                  className="mt-2 text-purple-600 hover:underline"
                >
                  Aramayı Temizle
                </button>
              </div>
            ) : (
              <SnippetGrid
                snippets={filteredSnippets}
                onSnippetClick={(snippet) => navigate(`/snippets/${snippet.id}`)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SnippetList;
