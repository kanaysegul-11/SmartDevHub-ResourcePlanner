"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCreate, useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core";
import { FeatherClock3, FeatherTarget, FeatherTrendingUp, FeatherUsers } from "@subframe/core";
import Sidebar from "../component/layout/Sidebar";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";
import { useUser } from "../UserContext.jsx";
import { useI18n } from "../I18nContext.jsx";

const emptyForm = {
  title: "",
  description: "",
  project: "",
  assignee: "",
  status: "todo",
  priority: "medium",
  deadline: "",
  estimated_hours: 0,
  actual_hours: 0,
};

function Tasks() {
  const { userData } = useUser();
  const { language, t } = useI18n();
  const canManageTasks = Boolean(userData?.isAdmin);
  const invalidate = useInvalidate();
  const { mutate: createTask, isLoading: isCreating } = useCreate();
  const { mutate: updateTask, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteTask } = useDelete();

  const tasksQuery = useList({ resource: "tasks" });
  const projectsQuery = useList({ resource: "projects" });
  const usersQuery = useList({ resource: "users" });

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const tasks = tasksQuery.data?.data ?? [];
  const projects = projectsQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;

  const statusOptions = [
    { value: "todo", label: t("tasks.todo") },
    { value: "in_progress", label: t("tasks.inProgress") },
    { value: "review", label: t("tasks.review") },
    { value: "done", label: t("tasks.done") },
  ];

  const priorityOptions = [
    { value: "low", label: t("tasks.low") },
    { value: "medium", label: t("tasks.medium") },
    { value: "high", label: t("tasks.high") },
    { value: "critical", label: t("tasks.critical") },
  ];

  useEffect(() => {
    if (!tasks.length) {
      setSelectedTaskId(null);
      setFormData(emptyForm);
      return;
    }

    if (!selectedTask) {
      setSelectedTaskId(tasks[0].id);
      return;
    }

    setFormData({
      title: selectedTask.title || "",
      description: selectedTask.description || "",
      project: selectedTask.project || "",
      assignee: selectedTask.assignee || "",
      status: selectedTask.status || "todo",
      priority: selectedTask.priority || "medium",
      deadline: selectedTask.deadline || "",
      estimated_hours: Number(selectedTask.estimated_hours || 0),
      actual_hours: Number(selectedTask.actual_hours || 0),
    });
  }, [selectedTask, tasks]);

  const stats = useMemo(() => {
    const now = new Date();
    const dueSoon = tasks.filter((task) => {
      if (!task.deadline) return false;
      const date = new Date(task.deadline);
      const diff = date.getTime() - now.getTime();
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 3;
    }).length;

    return {
      total: tasks.length,
      dueSoon,
      inReview: tasks.filter((task) => task.status === "review").length,
      completed: tasks.filter((task) => task.status === "done").length,
    };
  }, [tasks]);

  const refreshTasks = () => invalidate({ resource: "tasks", invalidates: ["list", "detail"] });

  const handleCreate = () => {
    if (!canManageTasks) return;
    setSelectedTaskId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      ...formData,
      project: formData.project || null,
      assignee: formData.assignee || null,
      estimated_hours: Number(formData.estimated_hours || 0),
      actual_hours: Number(formData.actual_hours || 0),
    };

    if (selectedTask) {
      const values = canManageTasks
        ? payload
        : {
            status: payload.status,
            actual_hours: payload.actual_hours,
          };
      updateTask(
        { resource: "tasks", id: selectedTask.id, values },
        {
          onSuccess: refreshTasks,
          onError: () => alert(t("tasks.updateError")),
        }
      );
      return;
    }

    if (!canManageTasks) return;
    createTask(
      { resource: "tasks", values: payload },
      {
        onSuccess: (response) => {
          const newId = response?.data?.id ?? response?.id ?? null;
          if (newId) setSelectedTaskId(newId);
          refreshTasks();
        },
        onError: () => alert(t("tasks.createError")),
      }
    );
  };

  const handleDelete = () => {
    if (!canManageTasks || !selectedTask) return;
    if (!window.confirm(t("tasks.confirmDelete"))) return;
    deleteTask(
      { resource: "tasks", id: selectedTask.id },
      {
        onSuccess: () => {
          setSelectedTaskId(null);
          refreshTasks();
        },
        onError: () => alert(t("tasks.deleteError")),
      }
    );
  };

  const formatDate = (value) => {
    if (!value) return t("projects.notSet");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("projects.notSet");
    return new Intl.DateTimeFormat(language || "en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getDeadlineLabel = (value) => {
    if (!value) return t("projects.notSet");
    const today = new Date();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("projects.notSet");
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return t("tasks.overdue");
    if (diffDays === 0) return t("tasks.dueToday");
    return formatDate(value);
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="tasks" showTeamSubmenu={true} logoClickable={true} />
      <div className="relative flex grow flex-col items-start self-stretch overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={<Badge variant="neutral" icon={<FeatherTarget />}>{t("tasks.workspace")}</Badge>}
            rightSlot={<Badge variant={canManageTasks ? "success" : "neutral"}>{canManageTasks ? t("tasks.adminView") : t("tasks.userView")}</Badge>}
          />

          <div className="flex w-full flex-col gap-6 px-6 md:px-8 xl:px-10">
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
              <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.86))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur lg:p-8">
                <Badge variant="neutral" icon={<FeatherTrendingUp />}>{t("tasks.taskList")}</Badge>
                <h1 className="mt-4 font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-slate-950">{t("tasks.heroTitle")}</h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{t("tasks.heroBody")}</p>
                <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-4">
                  {[
                    [t("tasks.totalTasks"), stats.total, <FeatherTarget size={18} />],
                    [t("tasks.dueSoon"), stats.dueSoon, <FeatherClock3 size={18} />],
                    [t("tasks.inReview"), stats.inReview, <FeatherTrendingUp size={18} />],
                    [t("tasks.completed"), stats.completed, <FeatherUsers size={18} />],
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

              <div className="rounded-[34px] border border-white/65 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("tasks.taskMode")}</p>
                <p className="mt-3 text-2xl font-black tracking-tight">{canManageTasks ? t("tasks.taskModeAdmin") : t("tasks.taskModeUser")}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{canManageTasks ? t("tasks.createTaskBody") : t("tasks.myTasksBody")}</p>
                {canManageTasks ? (
                  <Button
                    type="button"
                    onClick={handleCreate}
                    className="mt-6 rounded-[18px] bg-white px-5 py-3 text-sm font-bold text-slate-950"
                  >
                    {t("tasks.createTask")}
                  </Button>
                ) : null}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("tasks.taskList")}</p>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{canManageTasks ? t("tasks.taskListBody") : t("tasks.myTasksBody")}</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  {tasks.length ? (
                    tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`w-full rounded-[26px] border p-5 text-left transition ${
                          selectedTaskId === task.id
                            ? "border-sky-200 bg-sky-50/60 shadow-[0_18px_36px_rgba(125,211,252,0.18)]"
                            : "border-slate-200/80 bg-white/80 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black tracking-tight text-slate-950">{task.title}</p>
                            <p className="mt-2 text-sm text-slate-500">{task.project_name || t("tasks.noProject")}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              {statusOptions.find((item) => item.value === task.status)?.label || task.status}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              {priorityOptions.find((item) => item.value === task.priority)?.label || task.priority}
                            </span>
                          </div>
                        </div>
                        <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-600">{task.description || t("snippets.noDescription")}</p>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                          <span>{task.assignee_details?.username || t("tasks.unassigned")}</span>
                          <span>{getDeadlineLabel(task.deadline)}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50/80 text-sm text-slate-500">
                      {t("tasks.noTasks")}
                    </div>
                  )}
                </div>
              </div>

              <aside className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {selectedTask ? t("tasks.updateTask") : t("tasks.createTaskTitle")}
                </p>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {selectedTask?.title || t("tasks.createTask")}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {canManageTasks ? t("tasks.createTaskBody") : t("tasks.myTasksBody")}
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <TextField label={t("tasks.title")} variant="filled">
                    <TextField.Input
                      value={formData.title}
                      onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                      disabled={!canManageTasks}
                      required
                    />
                  </TextField>

                  <TextField label={t("tasks.description")} variant="filled">
                    <textarea
                      className="min-h-[120px] w-full resize-none rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                      value={formData.description}
                      onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                      disabled={!canManageTasks}
                    />
                  </TextField>

                  {canManageTasks ? (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <TextField label={t("tasks.project")} variant="filled">
                          <select
                            className="w-full rounded-[20px] border border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                            value={formData.project}
                            onChange={(event) => setFormData((current) => ({ ...current, project: event.target.value }))}
                          >
                            <option value="">{t("tasks.noProject")}</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        </TextField>

                        <TextField label={t("tasks.assignee")} variant="filled">
                          <select
                            className="w-full rounded-[20px] border border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                            value={formData.assignee}
                            onChange={(event) => setFormData((current) => ({ ...current, assignee: event.target.value }))}
                          >
                            <option value="">{t("tasks.unassigned")}</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.username}
                              </option>
                            ))}
                          </select>
                        </TextField>
                      </div>
                    </>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TextField label={t("tasks.status")} variant="filled">
                      <select
                        className="w-full rounded-[20px] border border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                        value={formData.status}
                        onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </TextField>

                    <TextField label={t("tasks.priority")} variant="filled">
                      <select
                        className="w-full rounded-[20px] border border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                        value={formData.priority}
                        onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value }))}
                        disabled={!canManageTasks}
                      >
                        {priorityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </TextField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <TextField label={t("tasks.deadline")} variant="filled">
                      <TextField.Input
                        type="date"
                        value={formData.deadline}
                        onChange={(event) => setFormData((current) => ({ ...current, deadline: event.target.value }))}
                        disabled={!canManageTasks}
                      />
                    </TextField>

                    <TextField label={t("tasks.estimatedHours")} variant="filled">
                      <TextField.Input
                        type="number"
                        min="0"
                        value={formData.estimated_hours}
                        onChange={(event) => setFormData((current) => ({ ...current, estimated_hours: event.target.value }))}
                        disabled={!canManageTasks}
                      />
                    </TextField>

                    <TextField label={t("tasks.actualHours")} variant="filled">
                      <TextField.Input
                        type="number"
                        min="0"
                        value={formData.actual_hours}
                        onChange={(event) => setFormData((current) => ({ ...current, actual_hours: event.target.value }))}
                      />
                    </TextField>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      type="submit"
                      className="w-full rounded-[18px] bg-slate-950 py-3 text-sm font-bold text-white"
                      disabled={isCreating || isUpdating}
                    >
                      {selectedTask ? t("tasks.updateTask") : t("tasks.saveTask")}
                    </Button>
                    {canManageTasks && selectedTask ? (
                      <Button
                        type="button"
                        onClick={handleDelete}
                        className="w-full rounded-[18px] bg-slate-100 py-3 text-sm font-bold text-slate-700"
                      >
                        {t("tasks.deleteTask")}
                      </Button>
                    ) : null}
                  </div>
                </form>
              </aside>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tasks;
