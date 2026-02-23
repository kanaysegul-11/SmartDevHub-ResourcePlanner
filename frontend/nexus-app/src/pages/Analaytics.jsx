"use client";
import '../ui/theme.css'; 
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Avatar } from "../ui/components/Avatar";
import { Button } from "../ui/components/Button";
import { IconButton } from "../ui/components/IconButton";
import { TextField } from "../ui/components/TextField";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts'; // Grafik kütüphanesi
import { 
  FeatherZap, FeatherLayout, FeatherTrendingUp, FeatherUsers, 
  FeatherLogOut, FeatherSearch, FeatherActivity 
} from "@subframe/core";

function Analytics() {
  const [snippets, setSnippets] = useState([]);
  const username = localStorage.getItem('username') || 'Kullanici';

  // Oturum kapatma fonksiyonu (Dashboard ile aynı)
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Token ${token}` } };

    axios.get('http://localhost:8000/api/snippets/', config)
      .then((res) => setSnippets(res.data))
      .catch(err => console.error("Veriler alınamadı", err));
  }, []);

  // Grafik Verisi Hazırlama (Snippet dillerine göre dağılım)
  const languageData = snippets.reduce((acc, snippet) => {
    const lang = snippet.language || 'Unknown';
    const found = acc.find(item => item.name === lang);
    if (found) { found.value += 1; } 
    else { acc.push({ name: lang, value: 1 }); }
    return acc;
  }, []);

  // Duygu/Memnuniyet Analizi (Örnek Statik Veri)
  const sentimentData = [
    { name: 'Memnun', value: 70, color: '#9333ea' }, // Purple
    { name: 'Nötr', value: 20, color: '#3b82f6' },   // Blue
    { name: 'Mutsuz', value: 10, color: '#ec4899' },  // Pink
  ];

  return (
    <div className="flex w-full items-start bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 h-screen overflow-hidden text-slate-900">
      
      {/* SIDEBAR (Dashboard ile birebir aynı) */}
      <div className="flex w-64 flex-none flex-col items-start justify-between self-stretch border-r border-solid border-neutral-200 bg-white px-4 py-6 shadow-lg">
        <div className="flex w-full flex-col items-start gap-8">
          <div className="flex w-full items-center gap-3 px-2">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
              <FeatherZap className="text-white text-[20px]" />
            </div>
            <span className="text-xl font-bold">Nexus</span>
          </div>
          <div className="flex w-full flex-col items-start gap-1">
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherLayout />} onClick={() => window.location.href = '/'}>Dashboard</Button>
            <Button className="w-full justify-start rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white" icon={<FeatherTrendingUp />} onClick={() => window.location.href = '/analytics'}>Analytics</Button>
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherUsers />}>Team</Button>
             <Button className="w-full justify-start rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white" icon={<FeatherCode />} onClick={() => window.location.href = '/snippet'}>Code Library</Button>
          </div>
        </div>

        <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-purple-50">
          <Avatar variant="brand" size="small">{username[0].toUpperCase()}</Avatar>
          <div className="flex flex-col grow">
            <span className="text-sm font-bold">{username}</span>
            <span className="text-xs text-slate-500 italic">Analiz Modu</span>
          </div>
          <IconButton variant="neutral-tertiary" size="small" icon={<FeatherLogOut />} onClick={handleLogout} />
        </div>
      </div>

      {/* ANA ICERIK ALANI */}
      <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch overflow-y-auto">
        
        {/* HEADER (Dashboard ile birebir aynı) */}
        <div className="flex w-full items-center gap-4 border-b bg-white px-8 py-5 sticky top-0 z-10">
          <div className="grow">
            <span className="text-2xl font-bold block text-slate-800">Snippet Analytics</span>
            <span className="text-sm text-slate-500">Kütüphanenizin performans verileri burada.</span>
          </div>
          <TextField className="w-64" variant="filled" label="" icon={<FeatherSearch />}><TextField.Input placeholder="Analizlerde ara..." /></TextField>
        </div>

        {/* ANALIZ ICERIGI (Burayı Dashboard'dan farklılaştırdık) */}
        <div className="flex w-full flex-col items-start gap-8 px-8 py-8">
          
          <div className="grid grid-cols-12 w-full gap-6">
            
            {/* SOL TARAF: DİL DAĞILIMI BARI */}
            <div className="col-span-12 lg:col-span-7 bg-white p-6 rounded-2xl border shadow-sm">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><FeatherActivity /> Dil Popülerliği</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#9333ea" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SAG TARAF: MEMNUNIYET PIE */}
            <div className="col-span-12 lg:col-span-5 bg-white p-6 rounded-2xl border shadow-sm flex flex-col items-center">
              <h3 className="font-bold text-lg mb-6 self-start">Kullanıcı Memnuniyeti</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sentimentData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2">
                 {sentimentData.map(s => (
                   <div className="flex items-center gap-1 text-xs font-medium" key={s.name}>
                     <div className="w-3 h-3 rounded-full" style={{backgroundColor: s.color}}></div> {s.name}
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