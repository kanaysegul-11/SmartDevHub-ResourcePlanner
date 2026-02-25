"use client";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/components/Button";
import { FeatherZap, FeatherCode, FeatherChevronLeft, FeatherSave } from "@subframe/core";

function CreateSnippet() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", code: "", language: "python" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/snippets/', formData, {
        headers: { Authorization: `Token ${token}` }
      });
      navigate('/snippets');
    } catch (err) { alert("Hata!",err); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden">
      <div className="w-64 border-r bg-white p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center"><FeatherZap className="text-white"/></div><span className="font-bold text-xl">Nexus</span></div>
        <Button className="w-full justify-start" variant="neutral-tertiary" icon={<FeatherChevronLeft />} onClick={() => navigate('/snippets')}>Geri Dön</Button>
      </div>
      <div className="flex-grow overflow-y-auto px-20 py-10">
        <h1 className="text-3xl font-black mb-8">Yeni Kod Ekle</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
          <input className="p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-purple-500" placeholder="Başlık" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
          <select className="p-4 border rounded-2xl outline-none" value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})}>
            <option value="python">Python</option><option value="javascript">JavaScript</option><option value="react/js">React/JS</option>
          </select>
          <textarea className="p-4 border rounded-2xl outline-none" placeholder="Açıklama" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
          <textarea className="p-6 bg-[#0d1117] text-blue-100 font-mono rounded-3xl outline-none min-h-[300px]" placeholder="// Kodunuz..." value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required />
          <Button type="submit" className="bg-purple-600 text-white py-4 rounded-2xl" disabled={loading}>{loading ? "Kaydediliyor..." : "Kütüphaneye Kaydet"}</Button>
        </form>
      </div>
    </div>
  );
}
export default CreateSnippet;