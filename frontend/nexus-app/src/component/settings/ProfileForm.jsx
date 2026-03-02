"use client";
import React from "react";
import { Button } from "../../ui/components/Button";
import { TextField } from "../../ui/components/TextField";

function ProfileForm({ profileData, setProfileData, onSubmit, loading }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <TextField label="Adınız" variant="filled">
        <TextField.Input
          value={profileData.firstName}
          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
        />
      </TextField>
      <TextField label="Soyadınız" variant="filled">
        <TextField.Input
          value={profileData.lastName}
          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
        />
      </TextField>
      <TextField label="E-posta" variant="filled" className="md:col-span-2">
        <TextField.Input
          value={profileData.email}
          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
        />
      </TextField>
      <Button
        type="submit"
        className="mt-4 rounded-xl bg-purple-600 px-12 py-4 font-bold text-white"
        disabled={loading}
      >
        {loading ? "İşleniyor..." : "Profili Güncelle"}
      </Button>
    </form>
  );
}

export default ProfileForm;
