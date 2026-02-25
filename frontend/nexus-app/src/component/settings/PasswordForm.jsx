"use client";
import React from "react";
import { Button } from "../../ui/components/Button";
import { TextField } from "../../ui/components/TextField";

function PasswordForm({ passwordData, setPasswordData, onSubmit, loading }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">
      <div>
        <h3 className="text-xl font-black text-slate-800">Sifre Yonetimi</h3>
        <p className="text-sm font-medium text-slate-400">
          Hesap guvenliginiz icin duzenli olarak sifre degistirin.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-6">
        <TextField label="Mevcut Sifre" variant="filled">
          <TextField.Input
            type="password"
            value={passwordData.old}
            onChange={(e) => setPasswordData({ ...passwordData, old: e.target.value })}
            required
          />
        </TextField>
        <TextField label="Yeni Sifre" variant="filled">
          <TextField.Input
            type="password"
            value={passwordData.new}
            onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
            required
          />
        </TextField>
        <TextField label="Yeni Sifre (Tekrar)" variant="filled">
          <TextField.Input
            type="password"
            value={passwordData.confirm}
            onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
            required
          />
        </TextField>
        <Button
          type="submit"
          className="mt-2 rounded-xl bg-slate-900 py-4 font-bold text-white"
          disabled={loading}
        >
          {loading ? "Isleniyor..." : "Sifreyi Guncelle"}
        </Button>
      </form>
    </div>
  );
}

export default PasswordForm;
