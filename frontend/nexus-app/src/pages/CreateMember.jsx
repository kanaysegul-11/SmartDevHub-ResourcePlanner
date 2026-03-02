"use client";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "@refinedev/core";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";
import {
  FeatherChevronLeft,
  FeatherUserPlus,
  FeatherZap,
} from "@subframe/core";

function AddMember() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    employee_name: "",
    position: "",
    current_work: "",
    status_type: "available",
  });

  const { onFinish, formLoading } = useForm({
    resource: "status",
    action: "create",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onFinish(formData);
      navigate("/team");
    } catch (err) {
      alert("Hata oluÅŸtu, lÃ¼tfen tekrar deneyin.", err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
          <button
            onClick={() => navigate("/team")}
            className="mb-6 flex items-center gap-2 text-white/80 transition-colors hover:text-white"
          >
            <FeatherChevronLeft size={20} /> Geri Dön
          </button>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-md">
              <FeatherUserPlus size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Yeni Ekip Üyesi Ekle
              </h1>
              <p className="text-sm text-white/70">
                Şirket bünyesine yeni bir ekip üyesi ekleyin ve mevcut durumunu yönetin.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 p-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <TextField label="Çalışan Tam Adı" variant="filled">
              <TextField.Input
                value={formData.employee_name}
                onChange={(e) =>
                  setFormData({ ...formData, employee_name: e.target.value })
                }
                placeholder="Örnek: Caner Ünal"
                required
              />
            </TextField>

            <TextField label="Pozisyon / Ünvan" variant="filled">
              <TextField.Input
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                placeholder="Örnek: Senior UI Designer"
              />
            </TextField>
          </div>

          <div className="flex flex-col gap-2">
            <label className="px-1 text-xs font-black uppercase tracking-widest text-slate-400">
              Başlangıç Durumu
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-700 outline-none transition-all focus:ring-2 ring-purple-500"
              value={formData.status_type}
              onChange={(e) =>
                setFormData({ ...formData, status_type: e.target.value })
              }
            >
              <option value="available">
                ✅ Müsait (Projeye Hazır)
              </option>
              <option value="busy">🚧 Meşgul (Aktif Projede)</option>
            </select>
          </div>

          <TextField label="Şu Anki Görevi / Projesi" variant="filled">
            <TextField.Input
              value={formData.current_work}
              onChange={(e) =>
                setFormData({ ...formData, current_work: e.target.value })
              }
              placeholder="Örnek: Nexus Dashboard tasarımı üzerinde çalışılıyor..."
              required
            />
          </TextField>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              onClick={() => navigate("/team")}
              className="flex-1 rounded-2xl bg-slate-100 py-4 font-bold text-slate-600"
            >
              Ä°ptal
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-2xl bg-purple-600 py-4 font-bold text-white shadow-lg shadow-purple-200 transition-transform hover:scale-[1.02]"
              disabled={formLoading}
            >
              {formLoading ? "Kaydediliyor..." : "Üyeyi Kaydet"}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 flex items-center gap-2 opacity-20">
        <FeatherZap size={20} />
        <span className="text-xl font-bold tracking-tighter">NEXUS TEAM</span>
      </div>
    </div>
  );
}

export default AddMember;
