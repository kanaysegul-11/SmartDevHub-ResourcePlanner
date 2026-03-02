import React from "react";
import { Button } from "../../ui/components/Button";
import { TextField } from "../../ui/components/TextField";

function TeamForm({
  show,
  formData,
  setFormData,
  onSubmit,
  isSubmitting = false,
}) {
  if (!show) return null;

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-300">
      <form
        onSubmit={onSubmit}
        className="mb-6 grid w-full grid-cols-1 gap-6 rounded-[2rem] border border-purple-100 bg-white p-8 shadow-2xl md:grid-cols-3"
      >
        <TextField label="Ã‡alÄ±ÅŸan Ä°smi" variant="filled" className="md:col-span-1">
          <TextField.Input
            value={formData.employee_name}
            onChange={(e) =>
              setFormData({ ...formData, employee_name: e.target.value })
            }
            placeholder="Ä°sim Soyisim"
            required
          />
        </TextField>

        <TextField label="Pozisyon" variant="filled" className="md:col-span-1">
          <TextField.Input
            value={formData.position}
            onChange={(e) =>
              setFormData({ ...formData, position: e.target.value })
            }
            placeholder="Ãœnvan"
          />
        </TextField>

        <div className="flex flex-col gap-2">
          <label className="px-1 text-xs font-black uppercase tracking-widest text-slate-400">
            Ã‡alÄ±ÅŸma Durumu
          </label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-700 outline-none transition-all focus:ring-2 ring-purple-500"
            value={formData.status_type}
            onChange={(e) =>
              setFormData({ ...formData, status_type: e.target.value })
            }
          >
            <option value="busy">ğŸš§ Bir Projede Ã‡alÄ±ÅŸÄ±yor (MeÅŸgul)</option>
            <option value="available">âœ… MÃ¼sait (Yeni Proje Bekliyor)</option>
          </select>
        </div>

        <TextField label="GÃ¶rev DetayÄ±" variant="filled" className="md:col-span-3">
          <TextField.Input
            value={formData.current_work}
            onChange={(e) =>
              setFormData({ ...formData, current_work: e.target.value })
            }
            placeholder="Hangi proje veya ne Ã¼zerinde Ã§alÄ±ÅŸÄ±yor?"
            required
          />
        </TextField>

        <Button
          type="submit"
          className="md:col-span-3 rounded-xl bg-purple-600 py-4 font-bold text-white shadow-xl shadow-purple-200 transition-transform hover:scale-[1.01]"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Kaydediliyor..." : "Bilgileri Sisteme Ä°ÅŸle"}
        </Button>
      </form>
    </div>
  );
}

export default TeamForm;
