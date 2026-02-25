"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../ui/components/Avatar";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";
import { useUser } from "../UserContext.jsx";
import { 
  FeatherZap, FeatherLayout, FeatherTrendingUp, FeatherUsers, 
  FeatherLogOut, FeatherSearch, FeatherCode, FeatherPlus, 
  FeatherChevronRight, FeatherMessageSquare, FeatherChevronDown 
} from "@subframe/core";

function SnippetList() {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [isLibraryHovered, setIsLibraryHovered] = useState(false);
 const { userData } = useUser();

  const fetchSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const storedToken = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/snippets/', {
        headers: { Authorization: `Token ${storedToken}` }
      });
      setSnippets(res.data);
    } catch (err) {
      console.error("Snippetler çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  const filteredSnippets = snippets.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.language.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex w-full items-start bg-slate-50 h-screen overflow-hidden text-slate-900">
      
      {/* SIDEBAR */}
      <div className="flex w-64 flex-none flex-col items-start justify-between self-stretch border-r border-solid border-neutral-200 bg-white px-4 py-6 shadow-lg">
        <div className="flex w-full flex-col items-start gap-8">
          <div className="flex w-full items-center gap-3 px-2">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
              <FeatherZap className="text-white text-[20px]" />
            </div>
            <span className="text-xl font-bold">Nexus</span>
          </div>
          <div className="flex w-full flex-col items-start gap-1">
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherLayout />} onClick={() => navigate('/')}>Dashboard</Button>
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherUsers />} onClick={() => navigate('/team')}>Team</Button>
            {/* HOVER MENÜ: CODE LIBRARY */}
            <div 
              className="flex flex-col w-full gap-1"
              onMouseEnter={() => setIsLibraryHovered(true)}
              onMouseLeave={() => setIsLibraryHovered(false)}
            >
              <Button 
               className={`w-full justify-start rounded-lg transition-colors ${isLibraryHovered || window.location.pathname.includes('snippets') ? "bg-purple-50 text-purple-600" : ""}`}
                variant="neutral-tertiary" 
                icon={<FeatherCode />}
                onClick={() => navigate('/snippets')}
              >
                <div className="flex items-center justify-between w-full">
                  <span>Code Library</span>
                  <FeatherChevronDown size={14} className={`transition-transform duration-300 ${isLibraryHovered ? "rotate-180" : ""}`} />
                </div>
              </Button>

              {/* ALT BUTON: CREATE SNIPPET */}
              <div className={`overflow-hidden transition-all duration-300 flex flex-col gap-1 pl-9 ${isLibraryHovered ? "max-h-20 opacity-100 mb-2" : "max-h-0 opacity-0 pointer-events-none"}`}>
                <button 
                  onClick={() => navigate('/add-snippets')}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-500 hover:text-purple-600 transition-colors"
                >
                  <FeatherPlus size={14} /> Create Snippet
                </button>
              </div>
            </div>
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherTrendingUp />} onClick={() => navigate('/analytics')}>Analytics</Button>
          </div>
        </div>
        <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-purple-50 cursor-pointer" onClick={() => {localStorage.clear(); navigate('/login');}}>
          <Avatar variant="brand" size="small">{userData.avatar ? <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" /> : (userData.username?.[0]?.toUpperCase() || "U")}</Avatar>
          <div className="flex flex-col grow">
            <span className="text-sm font-bold">{userData.username || "Kullanici"}</span>
            <span className="text-xs text-slate-400">Çıkış Yap</span>
          </div>
          <FeatherLogOut className="text-slate-400" size={16} />
        </div>
      </div>

      {/* ANA İÇERİK ALANI */}
      <div className="flex grow flex-col items-start self-stretch overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-purple-600 font-bold">
            Yükleniyor...
          </div>
        ) : (
        <div className="flex w-full items-center gap-4 border-b bg-white px-8 py-5 sticky top-0 z-10">
          <div className="grow">
            <span className="text-2xl font-bold block text-slate-800">Kod Kütüphanesi</span>
            <span className="text-sm text-slate-500">Ekibin ortak bilgi havuzu.</span>
          </div>
          <div className="flex items-center gap-4">
            <TextField 
              placeholder="Kod ara..." 
              className="w-64"
              icon={<FeatherSearch />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button className="bg-purple-600 text-white" icon={<FeatherPlus />} onClick={() => navigate('/add-snippet')}>Yeni Ekle</Button>
          </div>
        </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full gap-6 px-8 py-8">
          {filteredSnippets.map((snippet) => (
            <div 
              key={snippet.id}
              onClick={() => navigate(`/snippets/${snippet.id}`)}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-purple-400 transition-all cursor-pointer flex flex-col h-[340px] group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                  {snippet.language}
                </span>
                <FeatherChevronRight className="text-slate-300 group-hover:text-purple-600" />
              </div>

              <div className="h-20 overflow-hidden">
                <h3 className="font-bold text-lg text-slate-800 mb-1 line-clamp-1">{snippet.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{snippet.description}</p>
              </div>
           

              {/* Kod Önizleme Kutusu - Taşma engellendi */}
              <div className="bg-slate-900 rounded-xl p-4 my-3 overflow-hidden flex-grow relative">
                <pre className="text-[11px] text-blue-300 font-mono opacity-80 leading-tight">
                  <code>{snippet.code}</code>
                </pre>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-40" />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
                <div className="flex items-center gap-2">
                  <Avatar size="x-small" variant="neutral">
                    {snippet.author_details?.username ? snippet.author_details.username[0].toUpperCase() : "A"}
                  </Avatar>
                  <span className="text-xs text-slate-600">{snippet.author_details?.username || "Anonim"}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <FeatherMessageSquare size={14} />
                  <span>{snippet.comments?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SnippetList;