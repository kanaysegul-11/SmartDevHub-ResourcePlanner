"use client";
import '../ui/theme.css'; 
import "../App";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Avatar } from "../ui/components/Avatar";
import { Badge } from "../ui/components/Badge";
import { Button } from "../ui/components/Button";
import { IconButton } from "../ui/components/IconButton";
import { TextField } from "../ui/components/TextField";
import { FeatherZap, FeatherLayout, FeatherTrendingUp, FeatherUsers, 
         FeatherFileText, FeatherLogOut, FeatherSearch , FeatherCopy, FeatherCheck} from "@subframe/core";

function Dashboard() {
  const [snippets, setSnippets] = useState([]);
  const [status, setStatus] = useState([]);
  const username = localStorage.getItem('username') || 'Kullanici';
  
const [copiedId, setCopiedId] = useState(null);

const handleCopy = (text, id) => {
  navigator.clipboard.writeText(text);
  setCopiedId(id); // Hangi kartın kopyalandığını tut
  setTimeout(() => setCopiedId(null), 2000); // 2 saniye sonra simgeyi eski haline döndür
};
  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:8000/api/logout/', {}, {
        headers: { 'Authorization': `Token ${token}` }
      });
    } catch (err) {
      console.log("Oturum kapatma hatasi veya zaten kapali.", err);
    }
    localStorage.clear();
    window.location.href = '/login';
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Token ${token}` } };

    axios.get('http://localhost:8000/api/snippets/', config)
      .then((res) => setSnippets(res.data))
      .catch(err => console.error("Veri cekilemedi", err));

    axios.get('http://localhost:8000/api/status/', config)
      .then((res) => setStatus(res.data))
      .catch((err) => console.error('Durum cekilemedi', err));
  }, []);

  return (
    <div className="flex w-full items-start bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 h-screen overflow-hidden text-slate-900">
      
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
            <Button className="w-full justify-start rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white" icon={<FeatherLayout />} onClick={() => window.location.href = '/'}>Dashboard</Button>
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherTrendingUp />} onClick={() => window.location.href = '/analytics'}>Analytics</Button>
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherUsers />}onClick={() => window.location.href = '/team'}>Team</Button>
             <Button className="w-full justify-start rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white" icon={<FeatherCode />} onClick={() => window.location.href = '/snippet'}>Code Library</Button>
          </div>
        </div>

        {/* PROFIL VE LOGOUT */}
        <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-purple-50">
          <Avatar variant="brand" size="small">{username ? username[0].toUpperCase() : 'U'}</Avatar>
          <div className="flex flex-col grow">
            <span className="text-sm font-bold">{username}</span>
            <span className="text-xs text-slate-500 italic">Aktif Oturum</span>
          </div>
          <IconButton variant="neutral-tertiary" size="small" icon={<FeatherLogOut />} onClick={handleLogout} />
        </div>
      </div>

      {/* ANA ICERIK */}
      <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch overflow-y-auto">
        <div className="flex w-full items-center gap-4 border-b bg-white px-8 py-5 sticky top-0 z-10">
          <div className="grow">
            <span className="text-2xl font-bold block text-slate-800">Smart Dev Hub Overview</span>
            <span className="text-sm text-slate-500">Hos geldin! Iste bugün neler oluyor:</span>
          </div>
          <TextField className="w-64" variant="filled" label="" icon={<FeatherSearch />}><TextField.Input placeholder="Kod ara..." /></TextField>
        </div>

        <div className="flex w-full flex-col items-start gap-8 px-8 py-8">
          {/* OZET KARTLARI */}
          <div className="flex w-full flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] flex flex-col gap-4 rounded-xl px-6 py-6 bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg">
              <span className="opacity-80">Toplam Snippet</span>
              <span className="text-4xl font-bold">{snippets.length}</span>
            </div>
            <div className="flex-1 min-w-[200px] flex flex-col gap-4 rounded-xl px-6 py-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg">
              <span className="opacity-80">Aktif Gelistirici</span>
              <span className="text-4xl font-bold">{status.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-12 w-full gap-8">
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><FeatherFileText /> Kod Kütüphanesi</h2>
              {snippets.map(s => (
  <div key={s.id} className="bg-white p-6 rounded-xl border shadow-sm group">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-bold text-lg">{s.title}</h3>
      <div className="flex items-center gap-2">
        <Badge variant="brand">{s.language}</Badge>
        {/* Kopyala Butonu */}
        <IconButton
          variant="neutral-tertiary"
          size="small"
          icon={copiedId === s.id ? <FeatherCheck className="text-green-600" /> : <FeatherCopy />}
          onClick={() => handleCopy(s.code, s.id)}
        />
      </div>
    </div>
    <div className="relative">
      <pre className="bg-slate-900 text-blue-300 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-slate-800">
        <code>{s.code}</code>
      </pre>
    </div>
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