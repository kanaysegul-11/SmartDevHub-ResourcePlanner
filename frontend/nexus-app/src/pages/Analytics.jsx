"use client";
import "../ui/theme.css";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../component/layout/Sidebar";
import AnalyticsHeader from "../component/analytics/AnalyticsHeader";
import LanguageChart from "../component/analytics/LanguageChart";
import SentimentChart from "../component/analytics/SentimentChart";

function Analytics() {
  const [snippets, setSnippets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Token ${token}` } };

    axios
      .get("http://localhost:8000/api/snippets/", config)
      .then((res) => setSnippets(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Veriler alinamadi", err));
  }, []);

  const filteredSnippets = snippets.filter((snippet) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (snippet.title || "").toLowerCase().includes(q) ||
      (snippet.language || "").toLowerCase().includes(q) ||
      (snippet.description || "").toLowerCase().includes(q)
    );
  });

  const languageData = filteredSnippets.reduce((acc, snippet) => {
    const lang = snippet.language || "Unknown";
    const found = acc.find((item) => item.name === lang);
    if (found) {
      found.value += 1;
    } else {
      acc.push({ name: lang, value: 1 });
    }
    return acc;
  }, []);

  const sentimentData = [
    { name: "Memnun", value: 70, color: "#9333ea" },
    { name: "Notr", value: 20, color: "#3b82f6" },
    { name: "Mutsuz", value: 10, color: "#ec4899" },
  ];

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeItem="analytics"
        showTeamSubmenu={true}
        logoClickable={true}
      />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto">
        <AnalyticsHeader
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex w-full flex-col items-start gap-8 px-8 py-8">
          <div className="grid w-full grid-cols-12 gap-8">
            <LanguageChart data={languageData} />
            <SentimentChart data={sentimentData} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;