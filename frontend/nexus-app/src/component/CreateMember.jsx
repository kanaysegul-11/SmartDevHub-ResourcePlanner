"use client";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";
import { FeatherChevronLeft, FeatherUserPlus, FeatherZap } from "@subframe/core";

function AddMember() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    employee_name: "", 
    position: "",
    current_work: "",
    status_type: "available"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/status/', formData, {
        headers: { Authorization: `Token ${token}` }
      });
      navigate('/team'); // Kayıttan sonra listeye dön
    } catch (err) {
      alert("Hata oluştu, lütfen tekrar deneyin.", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Üst Kısım */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
          <button onClick={() => navigate('/team')} className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <FeatherChevronLeft size={20} /> Geri Dön
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <FeatherUserPlus size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Yeni Ekip Üyesi</h1>
              <p className="text-white/70 text-sm">Şirket bünyesine yeni bir çalışma arkadaşı dahil edin.</p>
            </div>
          </div>
        </div>

        {/* Form Alanı */}
        <form onSubmit={handleSubmit} className="p-10 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField label="Çalışan Tam Adı" variant="filled">
              <TextField.Input 
                value={formData.employee_name} 
                onChange={(e) => setFormData({...formData, employee_name: e.target.value})} 
                placeholder="Örn: Caner Ünal" required 
              />
            </TextField>

            <TextField label="Pozisyon / Ünvan" variant="filled">
              <TextField.Input 
                value={formData.position} 
                onChange={(e) => setFormData({...formData, position: e.target.value})} 
                placeholder="Örn: Senior UI Designer" 
              />
            </TextField>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Başlangıç Durumu</label>
            <select 
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 ring-purple-500 transition-all"
              value={formData.status_type} 
              onChange={(e) => setFormData({...formData, status_type: e.target.value})}
            >
              <option value="available">✅ Müsait (Projeye Hazır)</option>
              <option value="busy">🚧 Meşgul (Aktif Projede)</option>
            </select>
          </div>

          <TextField label="Şu Anki Görevi / Projesi" variant="filled">
            <TextField.Input 
              value={formData.current_work} 
              onChange={(e) => setFormData({...formData, current_work: e.target.value})} 
              placeholder="Örn: Nexus Dashboard tasarımı üzerinde çalışıyor..." 
              required 
            />
          </TextField>

          <div className="flex gap-4 pt-4">
             <Button type="button" onClick={() => navigate('/team')} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">İptal</Button>
             <Button type="submit" className="flex-1 bg-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-purple-200 hover:scale-[1.02] transition-transform">
               Üyeyi Kaydet
             </Button>
          </div>
        </form>
      </div>
      
      {/* Alt Logo */}
      <div className="mt-8 flex items-center gap-2 opacity-20">
        <FeatherZap size={20} />
        <span className="font-bold tracking-tighter text-xl">NEXUS TEAM</span>
      </div>
    </div>
  );
}

export default AddMember;