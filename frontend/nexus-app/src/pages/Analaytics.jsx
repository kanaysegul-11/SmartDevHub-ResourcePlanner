"use client";
import '../ui/theme.css'; 
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../ui/components/Avatar";
import { Button } from "../ui/components/Button";
import { IconButton } from "../ui/components/IconButton";
import { TextField } from "../ui/components/TextField"; 
import  useUser  from "../UserContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts'; 
import { 
  FeatherZap, FeatherLayout, FeatherTrendingUp, FeatherUsers, 
  FeatherLogOut, FeatherSearch, FeatherActivity , FeatherCode, 
  FeatherChevronDown, FeatherPlus // FeatherPlus EKLENDİ
} from "@subframe/core";

function Analytics() {
  const [snippets, setSnippets] = useState([]);
  const [isLibraryHovered, setIsLibraryHovered] = useState(false);
  const [isTeamHovered, setIsTeamHovered] = useState(false);
  const navigate = useNavigate();
 


const { userData } = useUser();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Token ${token}` } };

    axios.get('http://localhost:8000/api/snippets/', config)
      .then((res) => setSnippets(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Veriler alınamadı", err));
  }, []);

  // Grafik Verisi Hazırlama
  const languageData = snippets.reduce((acc, snippet) => {
    const lang = snippet.language || 'Unknown';
    const found = acc.find(item => item.name === lang);
    if (found) { found.value += 1; } 
    else { acc.push({ name: lang, value: 1 }); }
    return acc;
  }, []);

  const sentimentData = [
    { name: 'Memnun', value: 70, color: '#9333ea' },
    { name: 'Nötr', value: 20, color: '#3b82f6' },
    { name: 'Mutsuz', value: 10, color: '#ec4899' },
  ];

  return (
    <div className="flex w-full items-start bg-slate-50 h-screen overflow-hidden text-slate-900 font-sans">
      
      {/* SIDEBAR */}
      <div className="flex w-64 flex-none flex-col items-start justify-between self-stretch border-r border-solid border-neutral-200 bg-white px-4 py-6 shadow-lg z-20">
        <div className="flex w-full flex-col items-start gap-8">
          <div className="flex w-full items-center gap-3 px-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
              <FeatherZap className="text-white text-[20px]" />
            </div>
            <span className="text-xl font-bold tracking-tight">Nexus</span>
          </div>

          <div className="flex w-full flex-col items-start gap-1">
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherLayout />} onClick={() => navigate('/')}>Dashboard</Button> 
           
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

            {/* CODE LIBRARY HOVER MENÜ */}
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
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-500 hover:text-purple-600 transition-colors text-left"
                >
                  <FeatherPlus size={14} /> Create Snippet
                </button>
              </div>
            </div>

            <Button className="w-full justify-start rounded-lg bg-purple-50 text-purple-600 font-bold" variant="neutral-tertiary" icon={<FeatherTrendingUp />} onClick={() => navigate('/analytics')}>Analytics</Button>    
          </div>
        </div>

        <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-red-50 group cursor-pointer transition-colors" onClick={handleLogout}>
          <Avatar variant="brand" size="small">{userData.avatar[0]?.toUpperCase()}</Avatar>
          <div className="flex flex-col grow">
            <span className="text-sm font-bold text-slate-700">{userData.username}</span>
            <span className="text-[10px] text-slate-400 font-bold group-hover:text-red-500 uppercase">{userData.email}</span>
            <span className="text-[10px] text-slate-400 font-bold group-hover:text-red-500 uppercase">Çıkış Yap</span>
          </div>
          <FeatherLogOut className="text-slate-300 group-hover:text-red-500" size={16} />
        </div>
      </div>

      {/* ANA İÇERİK */}
      <div className="flex grow flex-col items-start self-stretch overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex w-full items-center gap-4 border-b bg-white px-8 py-5 sticky top-0 z-10 shadow-sm">
          <div className="grow">
            <span className="text-2xl font-black block text-slate-800 tracking-tight">Snippet Analytics</span>
            <span className="text-sm text-slate-500 font-medium">Kütüphanenizin performans verileri burada.</span>
          </div>
          <TextField 
            className="w-72" 
            placeholder="Analizlerde ara..." 
            icon={<FeatherSearch />}
          />
        </div>

        {/* GRAFİKLER */}
        <div className="flex w-full flex-col items-start gap-8 px-8 py-8">
          <div className="grid grid-cols-12 w-full gap-8">
            
            {/* DİL POPÜLERLİĞİ */}
            <div className="col-span-12 lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <h3 className="font-bold text-xl mb-8 flex items-center gap-3 text-slate-800">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><FeatherActivity size={20}/></div>
                Dil Popülerliği
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}} 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                    />
                    <Bar dataKey="value" fill="#9333ea" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* MEMNUNİYET ANALİZİ */}
            <div className="col-span-12 lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md flex flex-col items-center">
              <h3 className="font-bold text-xl mb-8 self-start text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg text-pink-600"><FeatherUsers size={20}/></div>
                Kullanıcı Memnuniyeti
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={sentimentData} 
                      innerRadius={70} 
                      outerRadius={90} 
                      paddingAngle={8} 
                      dataKey="value"
                      stroke="none"
                    >
                      {sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip 
                       contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8 w-full">
                 {sentimentData.map(s => (
                   <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100" key={s.name}>
                     <div className="w-3 h-3 rounded-full" style={{backgroundColor: s.color}}></div> 
                     <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">{s.name}</span>
                     <span className="text-lg font-black text-slate-800">%{s.value}</span>
                   </div>
                 ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;