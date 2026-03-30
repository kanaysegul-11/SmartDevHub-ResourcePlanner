"use client";
import React, { useEffect, useRef, useState } from "react";
import { FeatherSettings } from "@subframe/core";
import Sidebar from "../component/layout/Sidebar";
import SettingsHeader from "../component/settings/SettingsHeader";
import SettingsTabs from "../component/settings/SettingsTabs";
import AvatarUpload from "../component/settings/AvatarUpload";
import ProfileForm from "../component/settings/ProfileForm";
import PasswordForm from "../component/settings/PasswordForm";
import NotificationsPanel from "../component/settings/NotificationsPanel";
import LanguagePreferences from "../component/settings/LanguagePreferences";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { apiClient } from "../refine/axios";
import { useUser } from "../UserContext.jsx";
import { useI18n } from "../I18nContext.jsx";

function Settings() {
  const { userData, refreshUserData, setUserData } = useUser();
  const { t, language, setLanguage } = useI18n();

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(
    userData?.language || language || "en"
  );
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    firstName: userData?.firstName || "",
    lastName: userData?.lastName || "",
    email: userData?.email || "",
  });
  const [passwordData, setPasswordData] = useState({
    old: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    setProfileData({
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
    });
    setSelectedLanguage(userData?.language || language || "en");

    if (userData?.avatar) {
      setSelectedImage(userData.avatar);
    }
  }, [language, userData]);

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
      await apiClient.patch("/update-profile/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      await refreshUserData();
      flashSuccess(t("settings.avatarUpdated"));
    } catch (error) {
      console.error("Avatar upload error:", error);
    }
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await apiClient.patch("/update-profile/", {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
      });

      await refreshUserData();
      flashSuccess(t("settings.profileUpdated"));
    } catch {
      alert(t("settings.profileError"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      alert(t("settings.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/change-password/", {
        old_password: passwordData.old,
        new_password: passwordData.new,
      });
      setPasswordData({ old: "", new: "", confirm: "" });
      flashSuccess(t("settings.passwordUpdated"));
    } catch (error) {
      alert(error.response?.data?.error || t("settings.passwordError"));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSave = async () => {
    setLoading(true);
    try {
      await apiClient.patch("/update-profile/", {
        language: selectedLanguage,
      });
      setLanguage(selectedLanguage);
      setUserData({ language: selectedLanguage });
      await refreshUserData();
      flashSuccess(t("settings.languageSaved"));
    } catch (error) {
      console.error("Language update error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeItem="settings"
        showTeamSubmenu={true}
        logoClickable={true}
      />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background">
        <TopbarWithRightNav
          className="border-b border-solid border-neutral-border bg-white px-8 py-3"
          leftSlot={
            <Badge variant="neutral" icon={<FeatherSettings />}>
              {t("settings.workspace")}
            </Badge>
          }
          rightSlot={<Badge variant="success">{t("settings.secure")}</Badge>}
        />

        <SettingsHeader successMsg={successMsg} />

        <div className="flex w-full max-w-6xl gap-8 px-8 py-10">
          <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="min-h-[500px] flex-1 rounded-[2.5rem] border border-slate-200 bg-white p-12 shadow-sm">
            {activeTab === "profile" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="mb-8 text-xl font-black text-slate-800">
                  {t("settings.profileTitle")}
                </h3>
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

            {activeTab === "language" ? (
              <LanguagePreferences
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
                onSave={handleLanguageSave}
                loading={loading}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
