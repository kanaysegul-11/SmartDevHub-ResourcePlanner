"use client";
import React from "react";
import { Avatar } from "../../ui/components/Avatar";
import { Button } from "../../ui/components/Button";

function AvatarUpload({
  fileInputRef,
  onFileChange,
  onAvatarClick,
  selectedImage,
  userData,
}) {
  return (
    <div className="mb-12 flex items-center gap-8 rounded-3xl border border-slate-100 bg-slate-50 p-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
        accept="image/*"
      />
      <Avatar
        variant="brand"
        className="h-24 w-24 cursor-pointer overflow-hidden border-4 border-white text-3xl font-bold shadow-xl"
        onClick={onAvatarClick}
      >
        {selectedImage ? (
          <img src={selectedImage} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          userData?.username?.[0]?.toUpperCase() || "U"
        )}
      </Avatar>
      <div className="flex flex-col gap-3">
        <span className="text-lg font-bold text-slate-800">{userData?.username || "Kullanici"}</span>
        <Button size="small" variant="neutral-secondary" onClick={onAvatarClick}>
          Fotografi Guncelle
        </Button>
      </div>
    </div>
  );
}

export default AvatarUpload;
