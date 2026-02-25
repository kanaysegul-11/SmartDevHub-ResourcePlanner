"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../ui/components/Avatar";
import { Button } from "../ui/components/Button";
import  useUser  from "../UserContext.jsx"; // 1. Context'i import et
import { 
  FeatherZap, FeatherLayout, FeatherTrendingUp, FeatherUsers, 
  FeatherLogOut, FeatherCode, FeatherActivity, FeatherArrowUpRight,
  FeatherClock, FeatherCheckCircle, FeatherPlus, FeatherChevronDown,
  FeatherSettings// FeatherChevronDown EKLENDİ
} from "@subframe/core";

function Dashboard() {
  const [stats, setStats] = useState({ totalSnippets: 0, activeTeam: 0, latestSnippet: null });
  const [teamActivities, setTeamActivities] = useState([]);
  const [isLibraryHovered, setIsLibraryHovered] = useState(false); // Hover durumu 
  const [isTeamHovered, setIsTeamHovered] = useState(false); // Hover durumu
  const navigate = useNavigate();
  const userData = useUser(); // 2. Context'ten kullanıcı verilerini al

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

  const isActive = (path) => window.location.pathname === path;

  return (
    <div className="flex w-full items-start bg-slate-50 h-screen overflow-hidden text-slate-900">
      
      {/* SIDEBAR (Diğer sayfalarla eşitlendi) */}
      <div className="flex w-64 flex-none flex-col items-start justify-between self-stretch border-r border-solid border-neutral-200 bg-white px-4 py-6 shadow-lg z-20">
        <div className="flex w-full flex-col items-start gap-8">
          <div className="flex w-full items-center gap-3 px-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
              <FeatherZap className="text-white text-[20px]" />
            </div>
            <span className="text-xl font-bold">Nexus</span>
          </div>

          <div className="flex w-full flex-col items-start gap-1">
            <Button 
              className={`w-full justify-start rounded-lg ${isActive('/') ? "bg-purple-50 text-purple-600 font-bold" : ""}`} 
              variant="neutral-tertiary"
              icon={<FeatherLayout />} 
              onClick={() => navigate('/')}
            > Dashboard </Button> 

            <div 
              className="flex flex-col w-full gap-1"
              onMouseEnter={() => setIsTeamHovered(true)} // Yeni bir state: const [isTeamHovered, setIsTeamHovered] = useState(false);
              onMouseLeave={() => setIsTeamHovered(false)}
            >
              <Button 
                className={`w-full justify-start rounded-lg transition-all ${isTeamHovered || window.location.pathname === '/team' ? "bg-purple-50 text-purple-600 font-bold" : ""}`}
                variant="neutral-tertiary" 
                icon={<FeatherUsers />}
                onClick={() => navigate('/team')}
              >
                <div className="flex items-center justify-between w-full">
                  <span>Team</span>
                  <FeatherChevronDown size={14} className={`transition-transform duration-300 ${isTeamHovered ? "rotate-180" : ""}`} />
                </div>
              </Button>
            
              {/* ALT BUTON: CREATE MEMBER */}
              <div className={`overflow-hidden transition-all duration-300 flex flex-col gap-1 pl-9 ${isTeamHovered ? "max-h-20 opacity-100 mb-2" : "max-h-0 opacity-0 pointer-events-none"}`}>
                <button 
                  onClick={() => navigate('/add-member')}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-500 hover:text-purple-600 transition-colors text-left"
                >
                  <FeatherPlus size={14} /> Create Member
                </button>
              </div>
            </div>

            {/* DİNAMİK CODE LIBRARY MENÜSÜ */}
            <div 
              className="flex flex-col w-full gap-1"
              onMouseEnter={() => setIsLibraryHovered(true)}
              onMouseLeave={() => setIsLibraryHovered(false)}
            >
              <Button 
                className={`w-full justify-start rounded-lg transition-all ${isLibraryHovered ? "bg-purple-50 text-purple-600" : ""}`}
                variant="neutral-tertiary" 
                icon={<FeatherCode />}
                onClick={() => navigate('/snippets')}
              >
                <div className="flex items-center justify-between w-full">
                  <span>Code Library</span>
                  <FeatherChevronDown size={14} className={`transition-transform duration-300 ${isLibraryHovered ? "rotate-180" : ""}`} />
                </div>
              </Button>

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

            <Button 
  className={`w-full justify-start rounded-lg ${window.location.pathname === '/settings' ? "bg-purple-50 text-purple-600 font-bold" : ""}`} 
  variant="neutral-tertiary" 
  icon={<FeatherSettings />} // Import etmeyi unutma: FeatherSettings
  onClick={() => navigate('/settings')}
>
  Settings
</Button>
          </div>
        </div>

        <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-red-50 group cursor-pointer transition-colors" onClick={() => {localStorage.clear(); navigate('/login');}}>
          <Avatar variant="brand" size="small">{userData.avatar[0]?.toUpperCase()}</Avatar>
          <div className="flex flex-col grow">
            <span className="text-sm font-bold text-slate-700">{userData.username}</span>
            <span className="text-[10px] text-slate-400 font-bold group-hover:text-red-500 uppercase">{userData.email}</span>
          </div>
          <FeatherLogOut className="text-slate-300 group-hover:text-red-500" size={16} />
        </div>
      </div>

      {/* ANA İÇERİK */}
      <div className="flex grow flex-col items-start self-stretch overflow-y-auto px-10 py-10 gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Merhaba, {userData.username}! 👋</h1>
          <p className="text-slate-500 font-medium text-lg">İşte projenin bugünlük özeti.</p>
        </div>

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

        {/* ALT PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-8 py-5 border-b flex items-center justify-between bg-slate-50/50">
              <span className="font-bold text-slate-700 flex items-center gap-2"><FeatherClock size={18} className="text-purple-600"/> Son Eklenen Kod</span>
              <Button variant="neutral-tertiary" size="small" icon={<FeatherArrowUpRight />} onClick={() => navigate('/snippets')}>Tümünü Gör</Button>
            </div>
            <div className="p-8">
              {stats.latestSnippet ? (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-xl text-slate-800">{stats.latestSnippet.title}</h3>
                    <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-3 py-1 rounded-full uppercase tracking-widest">{stats.latestSnippet.language}</span>
                  </div>
                  <p className="text-slate-500 leading-relaxed line-clamp-2">{stats.latestSnippet.description}</p>
                  <div className="bg-slate-900 rounded-2xl p-5 text-[11px] text-blue-300 font-mono opacity-90 border border-slate-800 shadow-2xl">
                    <pre><code>{stats.latestSnippet.code.substring(0, 150)}...</code></pre>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-10 italic">Henüz kod eklenmemiş.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-8 py-5 border-b flex items-center justify-between bg-slate-50/50">
              <span className="font-bold text-slate-700 flex items-center gap-2">
                <FeatherActivity size={18} className="text-pink-600"/> Ekip Durumu
              </span>
              <Button variant="neutral-tertiary" size="small" icon={<FeatherArrowUpRight />} onClick={() => navigate('/team')}>Tümünü Gör</Button>
            </div>
            
            <div className="p-8 flex flex-col gap-6">
              {teamActivities.slice(0, 4).map((member) => (
                <div key={member.id} className="flex items-center gap-4 group">
                  <Avatar size="small" variant={member.status_type === 'busy' ? 'neutral' : 'brand'}>
                    {(member.employee_name || "U")[0].toUpperCase()}
                  </Avatar>
                  <div className="grow">
                    <span className="text-sm font-bold block text-slate-800 group-hover:text-purple-600 transition-colors">
                      {member.employee_name}
                    </span>
                    <span className="text-xs text-slate-400 font-medium line-clamp-1">
                      {member.current_work}
                    </span>
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full shadow-sm animate-pulse ${
                    member.status_type === 'busy' ? 'bg-orange-400' : 'bg-green-500'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;