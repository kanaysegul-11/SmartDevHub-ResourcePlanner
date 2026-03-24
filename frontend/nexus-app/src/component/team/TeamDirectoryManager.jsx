import React, { useEffect, useMemo, useState } from "react";
import { TextField } from "../../ui/components/TextField";
import { useI18n } from "../../I18nContext.jsx";

const emptyForm = {
  employee_name: "",
  position: "",
  current_work: "",
  status_type: "available",
};

function TeamDirectoryManager({ members, isSubmitting = false, onCreate, onUpdate, onDelete, onSelectMember }) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const sortedMembers = useMemo(
    () => [...members].sort((left, right) => (left.employee_name || "").localeCompare(right.employee_name || "", "tr")),
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

  useEffect(() => {
    onSelectMember?.(selectedMember || null);
  }, [onSelectMember, selectedMember]);

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

  return (
    <aside className="flex w-full flex-col gap-5 self-start rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-5 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-900">{t("team.directory")}</h3>
          <p className="mt-1 text-sm text-slate-500">{t("team.directoryBody")}</p>
        </div>
        <button
          type="button"
          onClick={startCreateMode}
          className="rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-slate-700"
        >
          {t("team.newMember")}
        </button>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50/75 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{t("team.members")}</span>
          <span className="text-xs font-semibold text-slate-500">{sortedMembers.length}</span>
        </div>
        <div className="grid max-h-[280px] grid-cols-1 gap-2 overflow-y-auto pr-1">
          {sortedMembers.map((member) => {
            const active = member.id === selectedId;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedId(member.id)}
                className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors ${
                  active
                    ? "border-sky-200 bg-white shadow-sm"
                    : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-800">{member.employee_name}</div>
                  <div className="truncate text-xs text-slate-400">
                    {member.position || t("team.noPosition")}
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
              {t("team.noMembersYet")}
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              {selectedMember ? t("team.editProfile") : t("team.newMember")}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {selectedMember ? t("team.directoryBody") : t("team.newMemberMode")}
            </p>
          </div>
          {selectedMember ? (
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              #{selectedMember.id}
            </span>
          ) : null}
        </div>

        <TextField label={t("team.fullName")} variant="filled">
          <TextField.Input
            value={formData.employee_name}
            onChange={(event) => setFormData((current) => ({ ...current, employee_name: event.target.value }))}
            placeholder={t("team.exampleName")}
            required
          />
        </TextField>

        <TextField label={t("team.position")} variant="filled">
          <TextField.Input
            value={formData.position}
            onChange={(event) => setFormData((current) => ({ ...current, position: event.target.value }))}
            placeholder={t("team.examplePosition")}
          />
        </TextField>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="px-1 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              {t("team.workStatus")}
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-sky-400 focus:bg-white"
              value={formData.status_type}
              onChange={(event) => setFormData((current) => ({ ...current, status_type: event.target.value }))}
            >
              <option value="available">{t("team.available")}</option>
              <option value="busy">{t("team.busy")}</option>
            </select>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/75 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {t("team.selectedProfile")}
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {selectedMember?.employee_name || t("team.newMemberMode")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedMember?.position || t("team.profileHint")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="px-1 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            {t("team.taskNote")}
          </label>
          <textarea
            className="min-h-28 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-sky-400 focus:bg-white"
            value={formData.current_work}
            onChange={(event) => setFormData((current) => ({ ...current, current_work: event.target.value }))}
            placeholder={t("team.exampleTask")}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? t("team.saveInProgress")
              : selectedMember
                ? t("team.saveChanges")
                : t("team.addMember")}
          </button>
          <button
            type="button"
            onClick={() => selectedMember && onDelete?.(selectedMember.id)}
            disabled={!selectedMember || isSubmitting}
            className="rounded-2xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("team.deleteMember")}
          </button>
        </div>
      </form>
    </aside>
  );
}

export default TeamDirectoryManager;

