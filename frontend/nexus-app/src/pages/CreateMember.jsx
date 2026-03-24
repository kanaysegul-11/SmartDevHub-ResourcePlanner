"use client";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "@refinedev/core";
import { FeatherBriefcase, FeatherChevronLeft, FeatherUserPlus, FeatherZap } from "@subframe/core";
import Sidebar from "../component/layout/Sidebar";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";
import { useI18n } from "../I18nContext.jsx";

function AddMember() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    employee_name: "",
    position: "",
    current_work: "",
    status_type: "available",
  });
  const { onFinish, formLoading } = useForm({ resource: "status", action: "create" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await onFinish(formData);
      navigate("/team");
    } catch (error) {
      alert(t("createMember.error"));
      console.error(error);
    }
  };

  const summaryItems = useMemo(
    () => [
      {
        label: t("createMember.fullName"),
        value: formData.employee_name || "—",
      },
      {
        label: t("createMember.roleLabel"),
        value: formData.position || "—",
      },
      {
        label: t("createMember.initialStatus"),
        value:
          formData.status_type === "available"
            ? t("createMember.availableProjectReady")
            : t("createMember.busyActiveProject"),
      },
    ],
    [formData, t]
  );

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="team" showTeamSubmenu={true} logoClickable={true} />

      <div className="relative flex grow flex-col items-start self-stretch overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={<Badge variant="neutral" icon={<FeatherUserPlus />}>{t("createMember.title")}</Badge>}
            rightSlot={<Badge variant="success">{t("team.workspace")}</Badge>}
          />

          <div className="flex w-full flex-col gap-6 px-6 md:px-8 xl:px-10">
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.12fr)_340px]">
              <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.86))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur lg:p-8">
                <button
                  onClick={() => navigate("/team")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
                >
                  <FeatherChevronLeft size={16} />
                  {t("createMember.back")}
                </button>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Badge variant="neutral" icon={<FeatherZap />}>
                    {t("createMember.teamBrand")}
                  </Badge>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-700">
                    {t("createMember.initialStatus")}
                  </span>
                </div>

                <h1 className="mt-4 max-w-3xl font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-slate-950">
                  {t("createMember.title")}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{t("createMember.subtitle")}</p>
              </div>

              <div className="rounded-[34px] border border-white/65 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("projects.summary")}</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-white">{t("team.selectedProfile")}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{t("team.profileHint")}</p>
                <div className="mt-6 space-y-3">
                  {summaryItems.map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                      <p className="mt-2 text-lg font-black text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <TextField label={t("createMember.fullName")} variant="filled">
                    <TextField.Input
                      value={formData.employee_name}
                      onChange={(event) => setFormData({ ...formData, employee_name: event.target.value })}
                      placeholder={t("createMember.fullNamePlaceholder")}
                      required
                    />
                  </TextField>

                  <TextField label={t("createMember.roleLabel")} variant="filled">
                    <TextField.Input
                      value={formData.position}
                      onChange={(event) => setFormData({ ...formData, position: event.target.value })}
                      placeholder={t("createMember.rolePlaceholder")}
                    />
                  </TextField>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <label className="px-1 text-xs font-black uppercase tracking-widest text-slate-400">
                    {t("createMember.initialStatus")}
                  </label>
                  <select
                    className="w-full rounded-[22px] border border-slate-200 bg-white p-4 font-semibold text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                    value={formData.status_type}
                    onChange={(event) => setFormData({ ...formData, status_type: event.target.value })}
                  >
                    <option value="available">{t("createMember.availableProjectReady")}</option>
                    <option value="busy">{t("createMember.busyActiveProject")}</option>
                  </select>
                </div>

                <div className="mt-6">
                  <TextField label={t("createMember.currentTask")} variant="filled">
                    <TextField.Input
                      value={formData.current_work}
                      onChange={(event) => setFormData({ ...formData, current_work: event.target.value })}
                      placeholder={t("createMember.currentTaskPlaceholder")}
                      required
                    />
                  </TextField>
                </div>
              </div>

              <aside className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur">
                <div className="inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700">
                  <FeatherBriefcase size={20} />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("team.nextStep")}</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t("createMember.saveMember")}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t("team.nextStepBody")}</p>

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full rounded-[18px] bg-slate-950 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    disabled={formLoading}
                  >
                    {formLoading ? t("createMember.saving") : t("createMember.saveMember")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate("/team")}
                    className="w-full rounded-[18px] bg-slate-100 py-3 text-sm font-bold text-slate-700"
                  >
                    {t("createMember.cancel")}
                  </Button>
                </div>
              </aside>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddMember;
