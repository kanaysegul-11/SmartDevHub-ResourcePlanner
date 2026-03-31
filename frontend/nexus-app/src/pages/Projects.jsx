"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCreate, useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core";
import {
  FeatherArrowUpRight,
  FeatherFolderKanban,
  FeatherLayers,
  FeatherTarget,
  FeatherUsers,
} from "@subframe/core";
import Sidebar from "../component/layout/Sidebar";
import ConfirmDialog from "../component/common/ConfirmDialog.jsx";
import { useUser } from "../UserContext.jsx";
import { useI18n } from "../I18nContext.jsx";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";

const EMPTY_PROJECTS = [];
const emptyForm = {
  name: "",
  client_name: "",
  summary: "",
  status: "planning",
  priority: "medium",
  progress: 0,
  start_date: "",
  end_date: "",
  tech_stack: "",
  team_members: [],
};

const buildProjectForm = (project) => ({
  name: project?.name || "",
  client_name: project?.client_name || "",
  summary: project?.summary || "",
  status: project?.effective_status || project?.status || "planning",
  priority: project?.priority || "medium",
  progress: Number(project?.progress || 0),
  start_date: project?.start_date || "",
  end_date: project?.end_date || "",
  tech_stack: project?.tech_stack || "",
  team_members: project?.team_members || [],
});

function Projects() {
  const { userData } = useUser();
  const { language, t } = useI18n();
  const canManageProjects = Boolean(userData?.isAdmin);
  const invalidate = useInvalidate();
  const { mutate: createProject, isLoading: isCreating } = useCreate();
  const { mutate: updateProject, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteProject } = useDelete();
  const projectsQuery = useList({ resource: "projects" });
  const teamQuery = useList({ resource: "status" });

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const statusOptions = [
    { value: "planning", label: t("projects.planning") },
    { value: "active", label: t("projects.active") },
    { value: "blocked", label: t("projects.blocked") },
    { value: "completed", label: t("projects.completed") },
  ];
  const priorityOptions = [
    { value: "low", label: t("projects.low") },
    { value: "medium", label: t("projects.medium") },
    { value: "high", label: t("projects.high") },
    { value: "critical", label: t("projects.critical") },
  ];

  const projects = useMemo(
    () => projectsQuery.data?.data ?? EMPTY_PROJECTS,
    [projectsQuery.data]
  );
  const projectRecords = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        effective_status: project?.effective_status || project?.status || "planning",
        is_completed_archive: Boolean(project?.is_completed_archive),
      })),
    [projects]
  );
  const teamMembers = useMemo(
    () =>
      (teamQuery.data?.data ?? EMPTY_PROJECTS).filter(
        (member) => !member.user_details?.is_admin
      ),
    [teamQuery.data]
  );
  const activeProjects = useMemo(
    () => projectRecords.filter((project) => !project.is_completed_archive),
    [projectRecords]
  );
  const completedProjects = useMemo(
    () => projectRecords.filter((project) => project.is_completed_archive),
    [projectRecords]
  );
  const selectedProject = useMemo(
    () =>
      isCreateMode
        ? null
        : projectRecords.find((project) => project.id === selectedProjectId) || null,
    [isCreateMode, projectRecords, selectedProjectId]
  );

  const formatProjectDate = (value) => {
    if (!value) return t("projects.notSet");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("projects.notSet");
    return new Intl.DateTimeFormat(language || "en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const parseProjectDate = (value) => {
    if (!value) return null;

    const normalizedValue = String(value).trim();
    const dateOnlyMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsedDate = new Date(normalizedValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate()
    );
  };

  const hasProjectDeadlinePassed = (project) => {
    const deliveryDate = parseProjectDate(project?.end_date);
    if (!deliveryDate) {
      return false;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return deliveryDate < today;
  };

  const getProjectAccessLabel = (project) => {
    if (!canManageProjects) {
      return t("projects.readOnly");
    }

    const projectStatus = project?.effective_status || project?.status;
    const isLockedProject =
      Boolean(project?.is_completed_archive) ||
      projectStatus === "completed" ||
      hasProjectDeadlinePassed(project);

    return isLockedProject ? null : t("projects.editable");
  };

  const translateStatus = (value) => statusOptions.find((item) => item.value === value)?.label || value;
  const translatePriority = (value) => priorityOptions.find((item) => item.value === value)?.label || value;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!projectRecords.length) {
        setSelectedProjectId(null);
        setIsCreateMode(false);
        setFormData(emptyForm);
        return;
      }

      if (isCreateMode) {
        return;
      }

      if (!selectedProject) {
        setSelectedProjectId(projectRecords[0].id);
        return;
      }

      setFormData(buildProjectForm(selectedProject));
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCreateMode, projectRecords, selectedProject]);

  const stats = useMemo(() => {
    const active = projectRecords.filter((item) => item.effective_status === "active").length;
    const blocked = projectRecords.filter((item) => item.effective_status === "blocked").length;
    const avgProgress = projectRecords.length
      ? Math.round(projectRecords.reduce((sum, item) => sum + Number(item.progress || 0), 0) / projectRecords.length)
      : 0;
    return { total: projectRecords.length, active, blocked, avgProgress };
  }, [projectRecords]);

  const refreshProjects = () => invalidate({ resource: "projects", invalidates: ["list", "detail"] });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canManageProjects) return;
    const payload = { ...formData, progress: Number(formData.progress || 0), team_members: formData.team_members };
    if (selectedProject) {
      updateProject(
        { resource: "projects", id: selectedProject.id, values: payload },
        {
          onSuccess: () => {
            setIsCreateMode(false);
            refreshProjects();
          },
          onError: () => alert(t("projects.updateError")),
        }
      );
      return;
    }
    createProject(
      { resource: "projects", values: payload },
      {
        onSuccess: (response) => {
          const newProjectId = response?.data?.id ?? response?.id ?? null;
          setIsCreateMode(false);
          if (newProjectId) setSelectedProjectId(newProjectId);
          refreshProjects();
        },
        onError: () => alert(t("projects.createError")),
      }
    );
  };

  const startCreateMode = () => {
    if (!canManageProjects) return;
    setIsDeleteConfirmOpen(false);
    setIsCreateMode(true);
    setSelectedProjectId(null);
    setFormData(emptyForm);
  };

  const handleDelete = () => {
    if (!canManageProjects || !selectedProject) return;
    deleteProject(
      { resource: "projects", id: selectedProject.id },
      {
        onSuccess: () => {
          setIsCreateMode(false);
          setSelectedProjectId(null);
          setIsDeleteConfirmOpen(false);
          refreshProjects();
        },
        onError: () => alert(t("projects.deleteError")),
      }
    );
  };

  const toggleTeamMember = (memberId) => {
    if (!canManageProjects) return;
    setFormData((current) => {
      const exists = current.team_members.includes(memberId);
      return {
        ...current,
        team_members: exists
          ? current.team_members.filter((id) => id !== memberId)
          : [...current.team_members, memberId],
      };
    });
  };

  const renderProjectCard = (project) => {
    const isSelected = !isCreateMode && project.id === selectedProjectId;
    const statusLabel = translateStatus(project.effective_status || project.status);
    const accessLabel = getProjectAccessLabel(project);
    const baseClass = project.is_completed_archive
      ? "border-emerald-200/80 bg-emerald-50/60 hover:border-emerald-300 hover:bg-white"
      : "border-slate-200/80 bg-slate-50/75 hover:border-slate-300 hover:bg-white";
    const selectedClass = project.is_completed_archive
      ? "border-emerald-300 bg-white shadow-[0_16px_36px_rgba(16,185,129,0.14)]"
      : "border-sky-200 bg-white shadow-[0_16px_36px_rgba(148,163,184,0.14)]";
    const progressBarClass = project.is_completed_archive ? "bg-emerald-500" : "bg-slate-950";

    return (
      <button
        key={project.id}
        type="button"
        onClick={() => {
          setIsCreateMode(false);
          setSelectedProjectId(project.id);
        }}
        className={`rounded-[28px] border p-5 text-left transition ${isSelected ? selectedClass : baseClass}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-black tracking-tight text-slate-900">{project.name}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {project.client_name || t("projects.internalProject")}
            </p>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <Badge variant={project.is_completed_archive ? "success" : "neutral"}>{statusLabel}</Badge>
            <Badge variant={project.priority === "critical" ? "error" : project.priority === "high" ? "warning" : "neutral"}>
              {translatePriority(project.priority)}
            </Badge>
            {accessLabel ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {accessLabel}
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">{project.summary}</p>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            <span>{t("projects.progress")}</span><span>%{project.progress || 0}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${progressBarClass}`} style={{ width: `${Math.max(Number(project.progress || 0), 6)}%` }} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-slate-200 bg-white/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("projects.start")}</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">{formatProjectDate(project.start_date)}</p>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-white/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("projects.delivery")}</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">{formatProjectDate(project.end_date)}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="projects" showTeamSubmenu={true} logoClickable={true} />
      <div className="relative flex grow flex-col items-start self-stretch overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={<Badge variant="neutral" icon={<FeatherFolderKanban />}>{t("projects.workspace")}</Badge>}
            rightSlot={<Badge variant={canManageProjects ? "success" : "neutral"}>{canManageProjects ? t("projects.adminView") : t("projects.userView")}</Badge>}
          />

          <div className="flex w-full flex-col gap-6 px-6 md:px-8 xl:px-10">
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
              <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.86))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur lg:p-8">
                <Badge variant="neutral" icon={<FeatherLayers />}>{t("projects.listTitle")}</Badge>
                <h1 className="mt-4 font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-slate-950">{t("projects.heroTitle")}</h1>
                <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-4">
                  {[
                    [t("projects.totalProjects"), stats.total, <FeatherFolderKanban size={18} />],
                    [t("projects.active"), stats.active, <FeatherTarget size={18} />],
                    [t("projects.blocked"), stats.blocked, <FeatherArrowUpRight size={18} />],
                    [t("projects.averageProgress"), `%${stats.avgProgress}`, <FeatherUsers size={18} />],
                  ].map(([label, value, icon]) => (
                    <div key={label} className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                      <div className="flex items-center gap-3 text-sky-700">
                        {icon}
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</span>
                      </div>
                      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dark-surface rounded-[34px] border border-white/65 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("projects.roleBehavior")}</p>
                <p className="mt-3 text-2xl font-black tracking-tight">
                  {canManageProjects ? t("projects.accountCanManage") : t("projects.accountCanView")}
                </p>
                {canManageProjects ? (
                  <button type="button" onClick={startCreateMode} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                    {t("projects.newProjectOpen")}
                  </button>
                ) : null}
              </div>
            </section>

            <section className={`grid grid-cols-1 gap-6 ${canManageProjects ? "xl:grid-cols-[minmax(0,1fr)_420px]" : "xl:grid-cols-1"}`}>
              <div className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">{t("projects.listTitle")}</h2>
                  </div>
                  {canManageProjects ? (
                    <button type="button" onClick={startCreateMode} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                      {t("projects.createProject")}
                    </button>
                  ) : null}
                </div>
                <div className="mt-7 grid grid-cols-1 gap-6 2xl:grid-cols-2">
                  <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/40 p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-black tracking-tight text-slate-950">{t("projects.activeProjectsTitle")}</h3>
                        <p className="text-sm leading-7 text-slate-500">{t("projects.activeProjectsBody")}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                        {activeProjects.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                      {activeProjects.map(renderProjectCard)}
                      {!activeProjects.length ? (
                        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
                          {projectRecords.length ? t("projects.noActiveProjects") : t("projects.noProjects")}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/30 p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-black tracking-tight text-slate-950">{t("projects.completedProjectsTitle")}</h3>
                        <p className="text-sm leading-7 text-slate-500">{t("projects.completedProjectsBody")}</p>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-700">
                        {completedProjects.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                      {completedProjects.map(renderProjectCard)}
                      {!completedProjects.length ? (
                        <div className="rounded-[28px] border border-dashed border-emerald-200 bg-white/80 px-5 py-10 text-center text-sm text-slate-400">
                          {t("projects.noCompletedProjects")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {canManageProjects ? (
                <aside className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black tracking-tight text-slate-900">{isCreateMode ? t("projects.createProject") : selectedProject ? t("projects.editProject") : t("projects.createProject")}</h3>
                    </div>
                    {!isCreateMode && selectedProject ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">#{selectedProject.id}</span> : null}
                  </div>

                  <form key={isCreateMode ? "create-project" : `edit-project-${selectedProjectId ?? "empty"}`} onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                    {isCreateMode ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 px-4 py-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{t("projects.createMode")}</p></div> : null}
                    <div className="rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,rgba(240,249,255,0.88),rgba(255,255,255,0.95))] p-4 shadow-[0_14px_34px_rgba(14,165,233,0.08)]">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">{t("projects.summary")}</p>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-[20px] border border-white bg-white/90 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("projects.selectedStatus")}</p><p className="mt-2 text-sm font-black text-slate-900">{translateStatus(formData.status)}</p></div>
                        <div className="rounded-[20px] border border-white bg-white/90 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("projects.priority")}</p><p className="mt-2 text-sm font-black text-slate-900">{translatePriority(formData.priority)}</p></div>
                        <div className="rounded-[20px] border border-white bg-white/90 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("projects.progress")}</p><p className="mt-2 text-sm font-black text-slate-900">%{formData.progress}</p></div>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/75 px-4 py-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("projects.basicInfo")}</p>
                    </div>
                    <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" placeholder={t("projects.projectName")} value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} required />
                    <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" placeholder={t("projects.clientDepartment")} value={formData.client_name} onChange={(event) => setFormData((current) => ({ ...current, client_name: event.target.value }))} />
                    <textarea className="min-h-28 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" placeholder={t("projects.projectSummary")} value={formData.summary} onChange={(event) => setFormData((current) => ({ ...current, summary: event.target.value }))} required />
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/75 px-4 py-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("projects.scheduleStatus")}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("projects.projectStatus")}</label>
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((option) => {
                          const active = formData.status === option.value;
                          return <button key={option.value} type="button" onClick={() => setFormData((current) => ({ ...current, status: option.value }))} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]" : "border border-slate-200 bg-white text-slate-700"}`}>{option.label}</button>;
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("projects.priority")}</label>
                      <div className="flex flex-wrap gap-2">
                        {priorityOptions.map((option) => {
                          const active = formData.priority === option.value;
                          return <button key={option.value} type="button" onClick={() => setFormData((current) => ({ ...current, priority: option.value }))} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{option.label}</button>;
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" value={formData.start_date} onChange={(event) => setFormData((current) => ({ ...current, start_date: event.target.value }))} />
                      <input type="date" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" value={formData.end_date} onChange={(event) => setFormData((current) => ({ ...current, end_date: event.target.value }))} />
                    </div>
                    <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" placeholder={t("projects.techStack")} value={formData.tech_stack} onChange={(event) => setFormData((current) => ({ ...current, tech_stack: event.target.value }))} />
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("projects.progress")}</label>
                      <input type="range" min="0" max="100" value={formData.progress} disabled className="w-full accent-slate-950 opacity-70" />
                      <p className="mt-2 text-sm font-semibold text-slate-600">%{formData.progress}</p>
                    </div>
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50/75 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("projects.teamAssignment")}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {teamMembers.map((member) => {
                          const active = formData.team_members.includes(member.id);
                          return <button key={member.id} type="button" onClick={() => toggleTeamMember(member.id)} className={`rounded-full px-3 py-2 text-xs font-semibold transition ${active ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{member.employee_name}</button>;
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="submit" disabled={isCreating || isUpdating} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">
                        {isCreating || isUpdating ? t("settings.processing") : !isCreateMode && selectedProject ? t("projects.saveProject") : t("projects.createProjectAction")}
                      </button>
                      <button type="button" onClick={isCreateMode ? () => setIsCreateMode(false) : () => setIsDeleteConfirmOpen(true)} disabled={!isCreateMode && !selectedProject} className="rounded-2xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40">
                        {isCreateMode ? t("projects.cancelCreate") : t("projects.deleteProject")}
                      </button>
                    </div>
                  </form>
                </aside>
              ) : (
                <aside className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
                  <h3 className="text-xl font-black tracking-tight text-slate-900">{t("projects.readOnlyTitle")}</h3>
                  {selectedProject ? (
                    <div className="mt-6 flex flex-col gap-4">
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50/75 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("projects.scheduleStatus")}</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t("projects.start")}</p><p className="mt-2 text-sm font-semibold text-slate-700">{formatProjectDate(selectedProject.start_date)}</p></div>
                          <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t("projects.delivery")}</p><p className="mt-2 text-sm font-semibold text-slate-700">{formatProjectDate(selectedProject.end_date)}</p></div>
                          <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t("projects.status")}</p><p className="mt-2 text-sm font-semibold text-slate-700">{translateStatus(selectedProject.effective_status || selectedProject.status)}</p></div>
                          <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t("projects.progress")}</p><p className="mt-2 text-sm font-semibold text-slate-700">%{selectedProject.progress || 0}</p></div>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50/75 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("projects.techStack")}</p>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{selectedProject.tech_stack || t("projects.noTechStack")}</p>
                      </div>
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50/75 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t("projects.teamAssignment")}</p>
                        {selectedProject.team_member_details?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2.5">
                            {selectedProject.team_member_details.map((member) => (
                              <span
                                key={member.id}
                                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                              >
                                {member.employee_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-7 text-slate-500">{t("projects.noMembersAssigned")}</p>
                        )}
                      </div>
                    </div>
                  ) : <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/75 p-6 text-sm text-slate-500" />}
                </aside>
              )}
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(selectedProject && isDeleteConfirmOpen)}
        title={t("projects.deleteProject")}
        description={selectedProject ? `${selectedProject.name}: ${t("projects.confirmDelete")}` : ""}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default Projects;
