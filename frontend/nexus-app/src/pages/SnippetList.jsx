"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "../component/layout/Sidebar";
import SnippetHeader from "../component/snippets/SnippetHeader";
import SnippetGrid from "../component/snippets/SnippetGrid";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { FeatherCode } from "@subframe/core";

function SnippetList() {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const fetchSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const storedToken = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8000/api/snippets/", {
        headers: { Authorization: `Token ${storedToken}` },
      });
      setSnippets(res.data);
    } catch (err) {
      console.error("Snippetler cekilemedi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.language.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar />

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

        {loading ? (
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
