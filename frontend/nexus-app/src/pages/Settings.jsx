"use client";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useUser } from "../UserContext.jsx";
import Sidebar from "../component/layout/Sidebar";
import SettingsHeader from "../component/settings/SettingsHeader";
import SettingsTabs from "../component/settings/SettingsTabs";
import AvatarUpload from "../component/settings/AvatarUpload";
import ProfileForm from "../component/settings/ProfileForm";
import PasswordForm from "../component/settings/PasswordForm";
import NotificationsPanel from "../component/settings/NotificationsPanel";

function Settings() {
  const { userData, refreshUserData, setUserData } = useUser();

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    firstName: userData?.firstName || "",
    lastName: userData?.lastName || "",
    email: userData?.email || "",
  });
  const [passwordData, setPasswordData] = useState({ old: "", new: "", confirm: "" });

  useEffect(() => {
    setProfileData({
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
    });

    if (userData?.avatar) {
      setSelectedImage(userData.avatar);
    }
  }, [userData]);

  const flashSuccess = (message) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const nextAvatar = reader.result;
      setSelectedImage(nextAvatar);
      setUserData({ avatar: nextAvatar });
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("profile_photo", file);

    try {
      const token = localStorage.getItem("token");
      await axios.patch("http://localhost:8000/api/update-profile/", formData, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      await refreshUserData();
      flashSuccess("Profil fotografi guncellendi!");
    } catch (err) {
      console.error("Yukleme hatasi:", err);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        "http://localhost:8000/api/update-profile/",
        {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          email: profileData.email,
        },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      await refreshUserData();
      flashSuccess("Profil guncellendi!");
    } catch (err) {
      alert("Hata: Profil guncellenemedi.",err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      alert("Sifreler uyusmuyor!");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:8000/api/change-password/",
        {
          old_password: passwordData.old,
          new_password: passwordData.new,
        },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      setPasswordData({ old: "", new: "", confirm: "" });
      flashSuccess("Sifre basariyla degistirildi!");
    } catch (err) {
      alert(err.response?.data?.error || "Eski sifre hatali.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeItem="settings"
        menuPreset="settings"
        logoutVariant="danger"
        logoClickable={true}
      />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-slate-50/50">
        <SettingsHeader successMsg={successMsg} />

        <div className="flex w-full max-w-6xl gap-8 px-8 py-10">
          <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="min-h-[500px] flex-1 rounded-[2.5rem] border border-slate-200 bg-white p-12 shadow-sm">
            {activeTab === "profile" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="mb-8 text-xl font-black text-slate-800">Profil Ayarlari</h3>
                <AvatarUpload
                  fileInputRef={fileInputRef}
                  onFileChange={handleFileChange}
                  onAvatarClick={handleAvatarClick}
                  selectedImage={selectedImage}
                  userData={userData}
                />
                <ProfileForm
                  profileData={profileData}
                  setProfileData={setProfileData}
                  onSubmit={handleProfileUpdate}
                  loading={loading}
                />
              </div>
            ) : null}

            {activeTab === "security" ? (
              <PasswordForm
                passwordData={passwordData}
                setPasswordData={setPasswordData}
                onSubmit={handlePasswordChange}
                loading={loading}
              />
            ) : null}

            {activeTab === "notifications" ? <NotificationsPanel /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;