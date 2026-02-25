"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../component/layout/Sidebar";
import Navbar from "../component/dashboard/DashboardNavbar";
import DashboardSummary from "../component/dashboard/DashboardSummary";
import {
  FeatherCode,
  FeatherUsers,
  FeatherCheckCircle,
} from "@subframe/core";

function Dashboard() {
  const [stats, setStats] = useState({ totalSnippets: 0, activeTeam: 0, latestSnippet: null });
  const [teamActivities, setTeamActivities] = useState([]);

  // 1. Ekip aktivitelerini çek
  useEffect(() => {
    const fetchTeamActivities = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/api/status/', {
          headers: { Authorization: `Token ${token}` }
        });
        setTeamActivities(res.data);
      } catch (err) {
        console.error("Ekip aktiviteleri alınamadı:", err);
      }
    };
    fetchTeamActivities();
  }, []);

  // 2. İstatistikleri çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Token ${token}` } };
        const snippetRes = await axios.get('http://localhost:8000/api/snippets/', config);
        const teamRes = await axios.get('http://localhost:8000/api/status/', config);

        setStats({
          totalSnippets: snippetRes.data.length,
          activeTeam: teamRes.data.length,
          latestSnippet: snippetRes.data[0]
        });
      } catch (err) {
        console.error("Dashboard veri hatası:", err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex w-full items-start bg-slate-50 h-screen overflow-hidden text-slate-900">
      <Sidebar />

      {/* ANA İÇERİK */}
      <div className="flex grow flex-col items-start self-stretch overflow-y-auto px-10 py-10 gap-8">
        <Navbar />

        {/* ÖZET KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-xl transition-all">
            <div className="h-14 w-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
              <FeatherCode size={28} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-400 block uppercase tracking-tight">Toplam Snippet</span>
              <span className="text-3xl font-black text-slate-800">{stats.totalSnippets}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-xl transition-all">
            <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
              <FeatherUsers size={28} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-400 block uppercase tracking-tight">Aktif Ekip</span>
              <span className="text-3xl font-black text-slate-800">{stats.activeTeam}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-xl transition-all">
            <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 shadow-inner">
              <FeatherCheckCircle size={28} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-400 block uppercase tracking-tight">Sistem</span>
              <span className="text-xl font-black text-green-600 uppercase">Çevrimiçi</span>
            </div>
          </div>
        </div>

        <DashboardSummary stats={stats} teamActivities={teamActivities} />
      </div>
    </div>
  );
}

export default Dashboard;
