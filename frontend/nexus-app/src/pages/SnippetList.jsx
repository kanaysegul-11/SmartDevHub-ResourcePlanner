"use client";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList } from "@refinedev/core";
import Sidebar from "../component/layout/Sidebar";
import SnippetHeader from "../component/snippets/SnippetHeader";
import SnippetGrid from "../component/snippets/SnippetGrid";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { FeatherCode } from "@subframe/core";

function SnippetList() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const { result: snippetsResult, query: snippetsQuery } = useList({
    resource: "snippets",
  });
  const snippets = snippetsResult?.data ?? [];

  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.language.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          rightSlot={<Badge variant="success">Hazır</Badge>}
        />

        {snippetsQuery?.isLoading ? (
          <div className="flex h-64 items-center justify-center text-purple-600 font-bold">
            Yükleniyor...
          </div>
        ) : (
          <SnippetHeader
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
          />
        )}

        <SnippetGrid
          snippets={filteredSnippets}
          onSnippetClick={(snippet) => navigate(`/snippets/${snippet.id}`)}
        />
      </div>
    </div>
  );
}

export default SnippetList;
