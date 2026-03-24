"use client";
import React from "react";
import { Button } from "../../ui/components/Button";
import { TextField } from "../../ui/components/TextField";
import { useI18n } from "../../I18nContext.jsx";

function ProfileForm({ profileData, setProfileData, onSubmit, loading }) {
  const { t } = useI18n();

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <TextField label={t("auth.firstName")} variant="filled">
        <TextField.Input
          value={profileData.firstName}
          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
        />
      </TextField>
      <TextField label={t("auth.lastName")} variant="filled">
        <TextField.Input
          value={profileData.lastName}
          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
        />
      </TextField>
      <TextField label={t("auth.email")} variant="filled" className="md:col-span-2">
        <TextField.Input
          value={profileData.email}
          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
        />
      </TextField>
      <Button
        type="submit"
        className="mt-4 rounded-xl bg-sky-600 px-12 py-4 font-bold text-white"
        disabled={loading}
      >
        {loading ? t("settings.processing") : t("settings.updateProfile")}
      </Button>
    </form>
  );
}

export default ProfileForm;

