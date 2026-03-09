"use client";
import React, { useEffect, useMemo, useState } from "react";
import { dataProvider } from "../refine/dataProvider.js";
import Sidebar from "../component/layout/Sidebar";
import Navbar from "../component/dashboard/DashboardNavbar";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import DashboardSummary from "../component/dashboard/DashboardSummary";
import SentimentChart from "../component/analytics/SentimentChart";
import ProfileCard from "../component/team/ProfileCard";

function Dashboard() {
  // 1. Doğrudan dataProvider kullan
  const [snippetsResult, setSnippetsResult] = useState(null);
  const [teamResult, setTeamResult] = useState(null);
  const [sLoading, setSLoading] = useState(true);
  const [tLoading, setTLoading] = useState(true);

  // Profil kartı için state
  const [selectedMember, setSelectedMember] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Debug log'lar
  console.log("[Dashboard] snippetsResult:", snippetsResult);
  console.log("[Dashboard] teamResult:", teamResult);
  console.log("[Dashboard] sLoading:", sLoading, "tLoading:", tLoading);

  // Veri çekme
  useEffect(() => {
    const fetchData = async () => {
      try {
        setSLoading(true);
        const snippets = await dataProvider.getList({ resource: "snippets" });
        setSnippetsResult(snippets);
        console.log("[Dashboard] Snippets fetched:", snippets);
      } catch (error) {
        console.error("[Dashboard] Snippets error:", error);
      } finally {
        setSLoading(false);
      }
    };

    const fetchTeam = async () => {
      try {
        setTLoading(true);
        const team = await dataProvider.getList({ resource: "status" });
        setTeamResult(team);
        console.log("[Dashboard] Team fetched:", team);
      } catch (error) {
        console.error("[Dashboard] Team error:", error);
      } finally {
        setTLoading(false);
      }
    };

    fetchData();
    fetchTeam();
  }, []);

  // Network test - Manuel API çağrısı
  useEffect(() => {
    const testApi = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/snippets/');
        console.log('[Dashboard] Manual API test:', response.status, response.statusText);
      } catch (error) {
        console.error('[Dashboard] Manual API error:', error);
      }
    };
    testApi();
  }, []);

  // 2. Verileri doğrudan hesapla - useEffect olmadan
  const stats = useMemo(() => {
    const rawSnippets = snippetsResult?.data || snippetsResult;
    if (rawSnippets && Array.isArray(rawSnippets)) {
      return {
        totalSnippets: snippetsResult?.total || rawSnippets.length,
        latestSnippet: rawSnippets[0] || null
      };
    }
    return { totalSnippets: 0, latestSnippet: null };
  }, [snippetsResult]);

  const teamActivities = useMemo(() => {
    const rawTeam = teamResult?.data || teamResult;
    if (rawTeam && Array.isArray(rawTeam)) {
      return rawTeam;
    }
    return [];
  }, [teamResult]);

  // Yükleme ekranı kontrolü
  const isInitialLoading = sLoading || tLoading;

  // Profil kartını aç/kapat
  const openProfile = (member) => {
    setSelectedMember(member);
    setIsProfileOpen(true);
  };

  const closeProfile = () => {
    setSelectedMember(null);
    setIsProfileOpen(false);
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar activeItem="dashboard" />
      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">


        <div className="flex w-full flex-col gap-8 px-8 py-8">
          <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-black text-slate-900">Merhaba, nexus! 👋</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Sistem verileri ve ekip durumu aktif.</p>
          </header>

          {isInitialLoading ? (
            <div className="w-full py-20 text-center flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
              <p className="font-bold text-slate-400">Veriler senkronize ediliyor...</p>
            </div>
          ) : (
            <>
              <DashboardSummary
                stats={stats}
                teamActivities={teamActivities}
                onMemberClick={openProfile}
              />
            </>
          )}
        </div>
      </div>

      {/* Profil Kartı */}
      <ProfileCard
        member={selectedMember}
        isOpen={isProfileOpen}
        onClose={closeProfile}
      />
    </div>
  );
}

export default Dashboard;

