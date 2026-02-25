"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import  useUser  from "../UserContext"; // 1. Context'i import et
import { Avatar } from "../ui/components/Avatar";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";
import { 
  FeatherZap, FeatherLayout, FeatherTrendingUp, FeatherUsers, 
  FeatherLogOut, FeatherCode, FeatherSettings, FeatherUser, 
  FeatherLock, FeatherBell, FeatherChevronDown, FeatherPlus, FeatherCheck
} from "@subframe/core";

function Settings() {
  const navigate = useNavigate();
  
  // 2. Context'ten verileri ve fonksiyonları çek
  const { userData, refreshUserData } = useUser();

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // 3. Form state'lerini başlangıçta Context verisiyle doldur
  const [profileData, setProfileData] = useState({ 
    firstName: userData.firstName || "", 
    lastName: userData.lastName || "", 
    email: userData.email || "" 
  });

  const [passwordData, setPasswordData] = useState({ old: "", new: "", confirm: "" });

  // Sayfa açıldığında veya veriler güncellendiğinde inputları doldur
  useEffect(() => {
    setProfileData({
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      email: userData.email || ""
    });
    if (userData.avatar) {
      setSelectedImage(userData.avatar);
    }
  }, [userData]);

  const handleAvatarClick = () => fileInputRef.current.click();

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('profile_photo', file);

      try {
        const token = localStorage.getItem('token');
        await axios.patch('http://localhost:8000/api/update-profile/', formData, {
          headers: { 
            'Authorization': `Token ${token}`,
            'Content-Type': 'multipart/form-data' 
          }
        });
        // 4. Kritik nokta: Fotoğraf değişince her yeri güncelle
        await refreshUserData();
        setSuccessMsg("Profil fotoğrafı güncellendi!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (err) {
        console.error("Yükleme hatası:", err);
      }
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch('http://localhost:8000/api/update-profile/', {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      
      // 5. Bilgiler değişince global state'i (Sidebar dahil) tazele
      await refreshUserData();
      setSuccessMsg("Profil güncellendi!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert("Hata: Profil güncellenemedi.",err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      alert("Şifreler uyuşmuyor!");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/change-password/', {
        old_password: passwordData.old,
        new_password: passwordData.new
      }, {
        headers: { Authorization: `Token ${token}` }
      });
      setSuccessMsg("Şifre başarıyla değiştirildi!");
      setPasswordData({ old: "", new: "", confirm: "" });
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Eski şifre hatalı.");
    } finally {
      setLoading(false);
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
            <Button className="w-full justify-start rounded-lg bg-purple-50 text-purple-600 font-bold" variant="neutral-tertiary" icon={<FeatherSettings />} onClick={() => navigate('/settings')}>Settings</Button>
          </div>
        </div>

        {/* SIDEBAR PROFIL KISMI - ARTIK CONTEXT'E BAĞLI */}
        <div className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-red-50 group cursor-pointer transition-colors" onClick={() => {localStorage.clear(); navigate('/login');}}>
          <Avatar variant="brand" size="small">
            {userData.avatar ? (
                <img src={userData.avatar} className="w-full h-full object-cover rounded-full" />
            ) : (
                userData.username[0]?.toUpperCase()
            )}
          </Avatar>
          <div className="flex flex-col grow text-left">
            <span className="text-sm font-bold text-slate-700">{userData.username}</span>
            <span className="text-[10px] text-slate-400 font-bold group-hover:text-red-500 uppercase">Çıkış Yap</span>
          </div>
          <FeatherLogOut className="text-slate-300 group-hover:text-red-500" size={16} />
        </div>
      </div>

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-slate-50/50">
        <div className="flex w-full items-center gap-4 border-b bg-white px-8 py-5 sticky top-0 z-10 shadow-sm">
          <div className="grow">
            <h1 className="text-2xl font-black block text-slate-800 tracking-tight">Ayarlar</h1>
            <p className="text-sm text-slate-500 font-medium">Hesap tercihlerini ve güvenlik yapılandırmalarını buradan yönet.</p>
          </div>
          {successMsg && (
            <div className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-full border border-green-100 animate-in fade-in">
              <FeatherCheck size={16} /> <span className="text-sm font-bold">{successMsg}</span>
            </div>
          )}
        </div>

        <div className="flex w-full gap-8 px-8 py-10 max-w-6xl">
          <div className="w-72 flex flex-col gap-2 flex-none">
            {[
              { id: "profile", label: "Profil Bilgileri", icon: <FeatherUser size={18} /> },
              { id: "security", label: "Güvenlik", icon: <FeatherLock size={18} /> }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id ? "bg-white text-purple-600 shadow-md border border-purple-100" : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 p-12 shadow-sm min-h-[500px]">
            {activeTab === "profile" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-xl font-black mb-8 text-slate-800">Profil Ayarları</h3>
                <div className="flex items-center gap-8 mb-12 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  <Avatar 
                    variant="brand" 
                    className="w-24 h-24 text-3xl font-bold shadow-xl cursor-pointer overflow-hidden border-4 border-white"
                    onClick={handleAvatarClick}
                  >
                    {selectedImage ? (
                      <img src={selectedImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      userData.username[0]?.toUpperCase()
                    )}
                  </Avatar>
                  <div className="flex flex-col gap-3">
                    <span className="text-lg font-bold text-slate-800">{userData.username}</span>
                    <Button size="small" variant="neutral-secondary" onClick={handleAvatarClick}>Fotoğrafı Güncelle</Button>
                  </div>
                </div>
                
                <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <TextField label="Adınız" variant="filled">
                    <TextField.Input 
                      value={profileData.firstName} 
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})} 
                    />
                  </TextField>
                  <TextField label="Soyadınız" variant="filled">
                    <TextField.Input 
                      value={profileData.lastName} 
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})} 
                    />
                  </TextField>
                  <TextField label="E-posta" variant="filled" className="md:col-span-2">
                    <TextField.Input 
                      value={profileData.email} 
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})} 
                    />
                  </TextField>
                  <Button type="submit" className="mt-4 bg-purple-600 text-white px-12 py-4 rounded-xl font-bold" disabled={loading}>
                    {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </Button>
                </form>
              </div>
            )}
         {activeTab === "security" && (

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">

                <div>

                   <h3 className="text-xl font-black text-slate-800">Şifre Yönetimi</h3>

                   <p className="text-sm text-slate-400 font-medium">Hesap güvenliğiniz için düzenli olarak şifre değiştirin.</p>

                </div>

                <form onSubmit={handlePasswordChange} className="flex flex-col gap-6 max-w-md">

                   <TextField label="Mevcut Şifre" variant="filled">

                     <TextField.Input

                       type="password"

                       value={passwordData.old}

                       onChange={(e) => setPasswordData({...passwordData, old: e.target.value})}

                       required

                     />

                   </TextField>

                   <TextField label="Yeni Şifre" variant="filled">

                     <TextField.Input

                       type="password"

                       value={passwordData.new}

                       onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}

                       required

                     />

                   </TextField>

                   <TextField label="Yeni Şifre (Tekrar)" variant="filled">

                     <TextField.Input

                       type="password"

                       value={passwordData.confirm}

                       onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}

                       required

                     />

                   </TextField>

                   <Button type="submit" className="bg-slate-900 text-white py-4 rounded-xl font-bold mt-2" disabled={loading}>

                     {loading ? "İşleniyor..." : "Şifreyi Güncelle"}

                   </Button>

                </form>

              </div>

            )}

           

            {activeTab === "notifications" && (

              <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-in fade-in">

                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">

                  <FeatherBell size={32} />

                </div>

                <h3 className="text-lg font-bold text-slate-800">Çok Yakında</h3>

                <p className="text-sm text-slate-400 max-w-xs">E-posta ve tarayıcı bildirim tercihleri yakında bu panel üzerinden yönetilebilecek.</p>

              </div>

            )}

          </div>

        </div>

      </div>
          
    </div>
  );
}

export default Settings;