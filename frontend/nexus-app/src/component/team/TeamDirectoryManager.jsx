import React, { useEffect, useMemo, useState } from "react";

import { TextField } from "../../ui/components/TextField";

const emptyForm = {
  employee_name: "",
  position: "",
  current_work: "",
  status_type: "available",
};

function TeamDirectoryManager({
  members,
  isSubmitting = false,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((left, right) =>
        (left.employee_name || "").localeCompare(right.employee_name || "", "tr")
      ),
    [members]
  );

  const selectedMember = useMemo(
    () => sortedMembers.find((member) => member.id === selectedId) || null,
    [sortedMembers, selectedId]
  );

  useEffect(() => {
    if (!sortedMembers.length) {
      setSelectedId(null);
      setFormData(emptyForm);
      return;
    }

    if (!selectedMember) {
      setSelectedId(sortedMembers[0].id);
      return;
    }

    setFormData({
      employee_name: selectedMember.employee_name || "",
      position: selectedMember.position || "",
      current_work: selectedMember.current_work || "",
      status_type: selectedMember.status_type || "available",
    });
  }, [selectedMember, sortedMembers]);

  const startCreateMode = () => {
    setSelectedId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (selectedMember) {
      onUpdate?.(selectedMember.id, formData);
      return;
    }

    onCreate?.(formData);
  };

  const handleDelete = () => {
    if (!selectedMember) {
      return;
    }

    onDelete?.(selectedMember.id);
  };

  return (
    <aside className="sticky top-6 flex w-full max-w-md flex-col gap-5 self-start rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-900">
            Ekip Dizini
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Uye sec, profil bilgisini guncelle veya kaydi sil.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreateMode}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-slate-700"
        >
          Yeni Uye
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Ekip Uyeleri
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {sortedMembers.length} kisi
          </span>
        </div>
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
          {sortedMembers.map((member) => {
            const active = member.id === selectedId;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedId(member.id)}
                className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors ${
                  active
                    ? "border-purple-300 bg-white shadow-sm"
                    : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-800">
                    {member.employee_name}
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {member.position || "Pozisyon yok"}
                  </div>
                </div>
                <span
                  className={`ml-3 h-2.5 w-2.5 rounded-full ${
                    member.status_type === "busy" ? "bg-amber-400" : "bg-emerald-500"
                  }`}
                />
              </button>
            );
          })}
          {!sortedMembers.length ? (
            <div className="rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-400">
              Henuz ekip uyesi yok.
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              {selectedMember ? "Profil Duzenle" : "Yeni Uye"}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {selectedMember
                ? "Secili uye icin isim, gorev ve durum bilgilerini guncelle."
                : "Yeni ekip uyesi olustur."}
            </p>
          </div>
          {selectedMember ? (
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              #{selectedMember.id}
            </span>
          ) : null}
        </div>

        <TextField label="Ad Soyad" variant="filled">
          <TextField.Input
            value={formData.employee_name}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                employee_name: event.target.value,
              }))
            }
            placeholder="Ornek: Elif Kaya"
            required
          />
        </TextField>

        <TextField label="Pozisyon" variant="filled">
          <TextField.Input
            value={formData.position}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                position: event.target.value,
              }))
            }
            placeholder="Ornek: Frontend Developer"
          />
        </TextField>

        <div className="flex flex-col gap-2">
          <label className="px-1 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Calisma Durumu
          </label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-purple-400 focus:bg-white"
            value={formData.status_type}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                status_type: event.target.value,
              }))
            }
          >
            <option value="available">Musait</option>
            <option value="busy">Devam Ediyor</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="px-1 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Gorev / Profil Notu
          </label>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-purple-400 focus:bg-white"
            value={formData.current_work}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                current_work: event.target.value,
              }))
            }
            placeholder="Su an ne uzerinde calisiyor?"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Kaydediliyor..."
              : selectedMember
                ? "Degisiklikleri Kaydet"
                : "Uyeyi Ekle"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!selectedMember || isSubmitting}
            className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Uyeyi Sil
          </button>
        </div>
      </form>
    </aside>
  );
}

export default TeamDirectoryManager;
