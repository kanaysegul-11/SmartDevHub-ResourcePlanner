"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../ui/components/Avatar";
import { Badge } from "../ui/components/Badge";
import { Button } from "../ui/components/Button";
import { IconButton } from "../ui/components/IconButton";
import { TextField } from "../ui/components/TextField";
import { 
  FeatherZap, FeatherLayout, FeatherTrendingUp, FeatherUsers, 
  FeatherLogOut, FeatherTrash2, FeatherPlus, FeatherActivity, FeatherCode,
  FeatherMail, FeatherChevronDown, FeatherBriefcase, FeatherCoffee
} from "@subframe/core";

function Team() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLibraryHovered, setIsLibraryHovered] = useState(false);
  const [isTeamHovered, setIsTeamHovered] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    employee_name: "", 
    position: "",
    current_work: "",
    status_type: "available"
  });

  const username = localStorage.getItem('username') || 'Kullanici';
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Token ${token}` } };

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const storedToken = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/status/', {
        headers: { Authorization: `Token ${storedToken}` }
      });
      setTeamMembers(res.data);
    } catch (err) {
      console.error('Veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // GRUPLANDIRMA MANTIĞI: Meşgul olanlar (Proje başında) ve Müsait olanlar
  const activeProjectMembers = teamMembers.filter(m => m.status_type === 'busy');
  const availableMembers = teamMembers.filter(m => m.status_type === 'available');

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const storedToken = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/status/', formData, {
        headers: { Authorization: `Token ${storedToken}` }
      });
      setFormData({ employee_name: "", position: "", current_work: "", status_type: "available" });
      setShowForm(false);
      fetchTeamData(); 
    } catch (err) {
      alert("Ekleme başarısız!",err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu üyeyi silmek istediğine emin misin?")) {
      try {
        await axios.delete(`http://localhost:8000/api/status/${id}/`, config);
        fetchTeamData();
      } catch (err) {
        console.error("Silme hatası:", err);
      }
    }
  };

  return (
    <div className="flex w-full items-start bg-slate-50 h-screen overflow-hidden text-slate-900 font-sans">
      
      {/* SIDEBAR */}
      <div className="flex w-64 flex-none flex-col items-start justify-between self-stretch border-r border-solid border-neutral-200 bg-white px-4 py-6 shadow-lg z-20">
        <div className="flex w-full flex-col items-start gap-8">
          <div className="flex w-full items-center gap-3 px-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
              <FeatherZap className="text-white text-[20px]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Nexus</span>
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
            
            <div className="flex flex-col w-full gap-1" onMouseEnter={() => setIsLibraryHovered(true)} onMouseLeave={() => setIsLibraryHovered(false)}>
              <Button className={`w-full justify-start rounded-lg transition-all ${isLibraryHovered ? "bg-purple-50 text-purple-600" : ""}`} variant="neutral-tertiary" icon={<FeatherCode />} onClick={() => navigate('/snippets')}>
                <div className="flex items-center justify-between w-full">
                  <span>Code Library</span>
                  <FeatherChevronDown size={14} className={`transition-transform duration-300 ${isLibraryHovered ? "rotate-180" : ""}`} />
                </div>
              </Button>
              <div className={`overflow-hidden transition-all duration-300 flex flex-col gap-1 pl-9 ${isLibraryHovered ? "max-h-20 opacity-100 mb-2" : "max-h-0 opacity-0 pointer-events-none"}`}>
                <button onClick={() => navigate('/add-snippets')} className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-500 hover:text-purple-600 transition-colors text-left">
                  <FeatherPlus size={14} /> Create Snippet
                </button>
              </div>
            </div>

            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherTrendingUp />} onClick={() => navigate('/analytics')}>Analytics</Button>
          </div>
        </div>

        <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-red-50 group cursor-pointer transition-colors" onClick={() => {localStorage.clear(); navigate('/login');}}>
          <Avatar variant="brand" size="small">{username[0]?.toUpperCase()}</Avatar>
          <div className="flex flex-col grow">
            <span className="text-sm font-bold text-slate-700">{username}</span>
            <span className="text-[10px] text-slate-400 font-bold group-hover:text-red-500 uppercase">Çıkış Yap</span>
          </div>
          <FeatherLogOut className="text-slate-300 group-hover:text-red-500" size={16} />
        </div>
      </div>

      {/* ANA İÇERİK */}
      <div className="flex grow flex-col items-start self-stretch overflow-y-auto pb-20">
        
          
         
 
        {/* HEADER */}
        {loading ? (
           <div className="flex items-center justify-center h-64 text-purple-600 font-bold">
            Yükleniyor...
          </div>
        ) : (
        <div className="flex w-full items-center gap-4 border-b bg-white px-8 py-5 sticky top-0 z-10 shadow-sm">
          <div className="grow">
            <span className="text-2xl font-black block text-slate-800 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500">Ekip Yönetimi</span>
            <span className="text-sm text-slate-500 font-medium">Projelerdeki ve merkezdeki çalışanların anlık durumu.</span>
          </div>
        </div>
          )}
        <div className="flex w-full flex-col items-start gap-12 px-8 py-8">
          
          {/* FORM ALANI */}
          {showForm && (
            <div className="w-full animate-in fade-in zoom-in-95 duration-300">
              <form onSubmit={handleAddMember} className="w-full bg-white p-8 rounded-[2rem] border border-purple-100 shadow-2xl mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <TextField label="Çalışan İsmi" variant="filled" className="md:col-span-1">
                    <TextField.Input value={formData.employee_name} onChange={(e) => setFormData({...formData, employee_name: e.target.value})} placeholder="İsim Soyisim" required />
                  </TextField>
                  <TextField label="Pozisyon" variant="filled" className="md:col-span-1">
                    <TextField.Input value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} placeholder="Ünvan" />
                  </TextField>
                  <div className="md:col-span-1 flex flex-col gap-1">
                     <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Çalışma Durumu</label>
                     <select className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 ring-purple-400 outline-none" value={formData.status_type} onChange={(e) => setFormData({...formData, status_type: e.target.value})}>
                       <option value="busy">🚧 Bir Projede Çalışıyor (Meşgul)</option>
                       <option value="available">✅ Müsait (Yeni Proje Bekliyor)</option>
                     </select>
                  </div>
                  <TextField label="Görev Detayı" variant="filled" className="md:col-span-3">
                    <TextField.Input value={formData.current_work} onChange={(e) => setFormData({...formData, current_work: e.target.value})} placeholder="Hangi proje veya ne üzerinde çalışıyor?" required />
                  </TextField>
                  <Button type="submit" className="md:col-span-3 bg-purple-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-purple-200 hover:scale-[1.01] transition-transform">Bilgileri Sisteme İşle</Button>
              </form>
            </div>
          )}

          {/* 1. BÖLÜM: PROJE BAŞINDAKİLER */}
          <section className="w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><FeatherBriefcase size={20}/></div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Aktif Projede Olanlar <span className="text-slate-400 font-medium ml-2">({activeProjectMembers.length})</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProjectMembers.map((member) => (
                <div key={member.id} className="bg-white rounded-3xl border-b-4 border-amber-400 p-6 shadow-sm hover:shadow-xl transition-all relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton variant="neutral-tertiary" size="small" icon={<FeatherTrash2 className="text-red-400" />} onClick={() => handleDelete(member.id)} />
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar variant="brand" size="large">{member.employee_name?.[0].toUpperCase()}</Avatar>
                    <div>
                      <h4 className="font-bold text-slate-800">{member.employee_name}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase">{member.position}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-sm font-semibold text-amber-900 leading-relaxed italic">"{member.current_work}"</p>
                  </div>
                </div>
              ))}
              {activeProjectMembers.length === 0 && <p className="text-slate-400 text-sm font-medium italic">Şu an aktif projede kimse bulunmuyor.</p>}
            </div>
          </section>

          {/* 2. BÖLÜM: MÜSAİT OLANLAR (HAVUZDAKİLER) */}
          <section className="w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg"><FeatherCoffee size={20}/></div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Yeni Proje İçin Müsait <span className="text-slate-400 font-medium ml-2">({availableMembers.length})</span></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableMembers.map((member) => (
                <div key={member.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4 group hover:border-green-300 transition-colors">
                  <Avatar variant="neutral" size="medium">{member.employee_name?.[0].toUpperCase()}</Avatar>
                  <div className="grow">
                    <h4 className="text-sm font-bold text-slate-800">{member.employee_name}</h4>
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Müsait</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton variant="neutral-tertiary" size="small" icon={<FeatherTrash2 className="text-red-300" />} onClick={() => handleDelete(member.id)} />
                  </div>
                </div>
              ))}
              {availableMembers.length === 0 && <p className="text-slate-400 text-sm font-medium italic">Tüm ekip üyeleri şu an meşgul.</p>}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

export default Team;