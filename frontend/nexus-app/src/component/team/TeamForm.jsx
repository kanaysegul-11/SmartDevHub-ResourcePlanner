import React from "react";
import { Button } from "../../ui/components/Button";
import { TextField } from "../../ui/components/TextField";

function TeamForm({ show, formData, setFormData, onSubmit }) {
  if (!show) return null;

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit} className="w-full bg-white p-8 rounded-[2rem] border border-purple-100 shadow-2xl mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
    <TextField label="Çalışan İsmi" variant="filled" className="md:col-span-1">
  <TextField.Input
    value={formData.employee_name}
    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
    placeholder="İsim Soyisim"
    required
  />
</TextField>

<TextField label="Pozisyon" variant="filled" className="md:col-span-1">
  <TextField.Input
    value={formData.position}
    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
    placeholder="Ünvan"
  />
</TextField>

<label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
  Çalışma Durumu
</label>
<option value="busy">🚧 Bir Projede Çalışıyor (Meşgul)</option>
<option value="available">✅ Müsait (Yeni Proje Bekliyor)</option>

<TextField label="Görev Detayı" variant="filled" className="md:col-span-3">
  <TextField.Input
    value={formData.current_work}
    onChange={(e) => setFormData({ ...formData, current_work: e.target.value })}
    placeholder="Hangi proje veya ne üzerinde çalışıyor?"
    required
  />
</TextField>
        <Button type="submit" className="md:col-span-3 bg-purple-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-purple-200 hover:scale-[1.01] transition-transform">Bilgileri Sisteme İşle</Button>
      </form>
    </div>
  );
}

export default TeamForm;
