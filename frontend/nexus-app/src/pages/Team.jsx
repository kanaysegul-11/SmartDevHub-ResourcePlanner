"use client";
import React, { useState, useEffect } from "react"; // useEffect eklendi
import axios from "axios";
import { Avatar } from "../ui/components/Avatar";
import { Badge } from "../ui/components/Badge";
import { Button } from "../ui/components/Button";
import { IconButton } from "../ui/components/IconButton";
import { TextField } from "../ui/components/TextField";
import { 
  FeatherZap, FeatherLayout, FeatherTrendingUp, FeatherUsers, 
  FeatherLogOut, FeatherSearch, FeatherMail, FeatherTrash2, FeatherPlus, FeatherActivity,
  FeatherCode
} from "@subframe/core";

function Team() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_name: "", 
    position: "",
    current_work: "",
    status_type: "available"
  });

  const username = localStorage.getItem('username') || 'Kullanici';
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Token ${token}` } };

useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);
  // 1. VERİ ÇEKME FONKSİYONU
  
const fetchTeamData = React.useCallback(async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get('http://localhost:8000/api/status/', {
      headers: { Authorization: `Token ${token}` }
    });
    setTeamMembers(res.data);
  } catch (err) {
    console.error('Veri çekme hatası:', err);
  } finally {
    setLoading(false);
  }
}, []);
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/status/', formData, {
        headers: { Authorization: `Token ${token}` }
      });
      setFormData({ employee_name: "", position: "", current_work: "", status_type: "available" });
      setShowForm(false);
      fetchTeamData(); // Hata vermez!
    } catch (err) {
      alert("Ekleme başarısız!",err);
    }
  };
  const handleDelete = async (id) => {
    if (window.confirm("Bu üye durumunu silmek istediğine emin misin?")) {
      try {
        await axios.delete(`http://localhost:8000/api/status/${id}/`, config);
        fetchTeamData();
      } catch (err) {
        console.error("Silme hatası:", err);
      }
    }
  };

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
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherLayout />} onClick={() => window.location.href = '/'}>Dashboard</Button>
            <Button className="w-full justify-start rounded-lg" variant="neutral-tertiary" icon={<FeatherTrendingUp />} onClick={() => window.location.href = '/analytics'}>Analytics</Button>
            <Button className="w-full justify-start rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white" icon={<FeatherUsers />} onClick={() => window.location.href = '/team'}>Team</Button>
            <Button className="w-full justify-start rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white" icon={<FeatherCode />} onClick={() => window.location.href = '/snippet'}>Code Library</Button>
          </div>
        </div>
        <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-purple-50 cursor-pointer" onClick={() => {localStorage.clear(); window.location.href='/login';}}>
          <Avatar variant="brand" size="small">{username[0].toUpperCase()}</Avatar>
          <div className="flex flex-col grow">
            <span className="text-sm font-bold">{username}</span>
            <span className="text-xs text-slate-400">Çıkış Yap</span>
          </div>
          <FeatherLogOut className="text-slate-400" size={16} />
        </div>
      </div>

      {/* ANA İÇERİK */}
      <div className="flex grow flex-col items-start self-stretch overflow-y-auto">
        <div className="flex w-full items-center gap-4 border-b bg-white px-8 py-5 sticky top-0 z-10">
          <div className="grow">
            <span className="text-2xl font-bold block text-slate-800">Ekip Üyeleri</span>
            <span className="text-sm text-slate-500">Anlık olarak ekip üyelerinin durumları.</span>
          </div>
          <Button 
            className="bg-indigo-600 text-white" 
            icon={showForm ? null : <FeatherPlus />} 
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Vazgeç" : "Yeni Üye Durumu"}
          </Button>
        </div>

        <div className="flex w-full flex-col items-start gap-6 px-8 py-8">
          
          {showForm && (
            <form onSubmit={handleAddMember} className="w-full bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-xl mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
               <TextField label="Çalışan İsmi" variant="filled" className="md:col-span-1">
                 <TextField.Input value={formData.employee_name} onChange={(e) => setFormData({...formData, employee_name: e.target.value})} placeholder="Örn: Ahmet Yılmaz" required />
               </TextField>
               <TextField label="Pozisyon" variant="filled" className="md:col-span-1">
                 <TextField.Input value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} placeholder="Örn: Frontend Developer" />
               </TextField>
               <div className="md:col-span-1 flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">Durum Tipi</label>
                  <select className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm" value={formData.status_type} onChange={(e) => setFormData({...formData, status_type: e.target.value})}>
                    <option value="available">Müsait</option>
                    <option value="busy">Meşgul</option>
                  </select>
               </div>
               <TextField label="Şu An Ne Yapıyor?" variant="filled" className="md:col-span-3">
                 <TextField.Input value={formData.current_work} onChange={(e) => setFormData({...formData, current_work: e.target.value})} placeholder="Örn: Nexus Projesi üzerinde çalışıyor..." required />
               </TextField>
               <Button type="submit" className="md:col-span-3 bg-indigo-600 text-white">Durumu Yayınla</Button>
            </form>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-indigo-600 font-medium">
              <FeatherActivity className="animate-spin" /> Yükleniyor...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full gap-6">
              {teamMembers.map((member) => (
                <div key={member.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton variant="neutral-tertiary" size="small" icon={<FeatherTrash2 className="text-red-500" />} onClick={() => handleDelete(member.id)} />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    {/* Backend verisine göre isim önceliği: employee_name yoksa user_details.username */}
                    <Avatar variant="brand" size="large">
                      {(member.employee_name || member.user_details?.username || "U")[0].toUpperCase()}
                    </Avatar>
                    <div className="flex flex-col">
                   <span className="font-bold text-lg text-slate-800">
  {member.employee_name || member.user_details?.username || "İsimsiz Çalışan"}
</span>
                      <div className="flex items-center gap-2">
                         <span className="text-xs text-slate-500">{member.position || "Ekip Üyesi"}</span>
                         <Badge variant={member.status_type === 'busy' ? 'warning' : 'success'}>
                            {member.status_type === 'busy' ? 'Meşgul' : 'Müsait'}
                         </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Görev</span>
                    <p className="text-sm text-slate-700 font-medium">{member.current_work}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400">
                      Son Güncelleme: {member.last_updated ? new Date(member.last_updated).toLocaleTimeString() : "Şimdi"}
                    </span>
                    <IconButton variant="neutral-secondary" size="small" icon={<FeatherMail />} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Team;