"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDelete, useInvalidate, useList } from "@refinedev/core";
import { FeatherClock3, FeatherTarget, FeatherTrendingUp, FeatherUsers } from "@subframe/core";
import Sidebar from "../component/layout/Sidebar";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";
import { apiClient } from "../refine/axios";
import { useUser } from "../UserContext.jsx";
import { useI18n } from "../I18nContext.jsx";
const emptyForm = {
  title: "",
  description: "",
  project: "",
  assignees: [],
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
  const { mutate: deleteTask } = useDelete();
  const [isSaving, setIsSaving] = useState(false);

  const tasksQuery = useList({ resource: "tasks" });
  const projectsQuery = useList({ resource: "projects" });
  const statusQuery = useList({ resource: "status" });
  const usersQuery = useList({ resource: "users" });

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const tasks = tasksQuery.data?.data ?? [];
  const projects = projectsQuery.data?.data ?? [];
  const teamMembers = (statusQuery.data?.data ?? []).filter(
    (member) => !member.user_details?.is_admin
  );
  const users = usersQuery.data?.data ?? [];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;
  const selectedProject =
    projects.find((project) => String(project.id) === String(formData.project)) || null;
  const buildTaskGroupKey = (task) =>
    JSON.stringify({
      title: task?.title || "",
      description: task?.description || "",
      project: task?.project || null,
      deadline: task?.deadline || "",
      priority: task?.priority || "medium",
      estimated_hours: Number(task?.estimated_hours || 0),
      created_by: task?.created_by || null,
    });
  const selectedTaskGroup = useMemo(() => {
    if (!selectedTask) return [];
    const groupKey = buildTaskGroupKey(selectedTask);
    const grouped = tasks.filter((task) => buildTaskGroupKey(task) === groupKey);

    return grouped.sort((left, right) => {
      if (left.id === selectedTask.id) return -1;
      if (right.id === selectedTask.id) return 1;
      return 0;
    });
  }, [selectedTask, tasks]);

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
      setIsCreateMode(false);
      setFormData(emptyForm);
      return;
    }

    if (isCreateMode) {
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
      project: selectedTask.project ? String(selectedTask.project) : "",
      assignees: Array.from(
        new Set(
          (selectedTaskGroup.length ? selectedTaskGroup : [selectedTask])
            .map((task) => String(task.assignee || ""))
            .filter(Boolean)
        )
      ),
      status: selectedTask.status || "todo",
      priority: selectedTask.priority || "medium",
      deadline: selectedTask.deadline || "",
      estimated_hours: Number(selectedTask.estimated_hours || 0),
      actual_hours: Number(selectedTask.actual_hours || 0),
    });
  }, [isCreateMode, selectedTask, selectedTaskGroup, tasks]);

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

  const normalizeIdentity = (value) =>
    String(value || "")
      .toLocaleLowerCase(language || "en")
      .replace(/\s+/g, " ")
      .trim();

  const resolveMemberUser = (member) => {
    if (member?.user_details?.id) {
      return member.user_details;
    }

    const employeeName = normalizeIdentity(member?.employee_name);

    return (
      users.find((user) => normalizeIdentity(user.username) === employeeName) ||
      users.find(
        (user) =>
          normalizeIdentity(`${user.first_name || ""} ${user.last_name || ""}`) === employeeName
      ) ||
      null
    );
  };

  const teamMembersWithProjects = useMemo(() => {
    return teamMembers.map((member) => {
      const memberProjects = projects.filter((project) =>
        (project.team_members || []).some((memberId) => String(memberId) === String(member.id))
      );
      const taskProject =
        projects.find(
          (project) => String(project.name) === String(member.active_task_project_name)
        ) || null;
      const activeProject =
        taskProject ||
        memberProjects.find((project) => project.status === "active") ||
        memberProjects[0] ||
        null;
      const resolvedUser = resolveMemberUser(member);

      return {
        ...member,
        user_details: resolvedUser || member.user_details || null,
        activeTaskTitle: member.active_task_title || "",
        activeTaskDeadline: member.active_task_deadline || "",
        effectiveStatus: member.effective_status || "available",
        currentProject: activeProject,
        currentProjectName: member.active_task_project_name || activeProject?.name || "",
        currentProjectClient: member.active_task_project_client || activeProject?.client_name || "",
        currentProjectEndDate: member.active_task_project_end_date || activeProject?.end_date || "",
        projectCount: memberProjects.length,
        profileNote: member.current_work || "",
        projectSummary: member.active_task_description || activeProject?.summary || "",
      };
    });
  }, [projects, teamMembers, users]);

  const availableMembers = useMemo(
    () => teamMembersWithProjects.filter((member) => member.effectiveStatus === "available"),
    [teamMembersWithProjects]
  );
  const busyMembers = useMemo(
    () => teamMembersWithProjects.filter((member) => member.effectiveStatus === "busy"),
    [teamMembersWithProjects]
  );

  const assignableMembers = useMemo(() => {
    const mappedMembers = new Map();

    teamMembersWithProjects.forEach((member) => {
      const resolvedUser = resolveMemberUser(member);
      const mapKey = resolvedUser?.id ? `user-${resolvedUser.id}` : `member-${member.id}`;
      mappedMembers.set(mapKey, {
        ...member,
        user_details: resolvedUser,
      });
    });

    if (selectedTask?.assignee_status?.user_details?.id) {
      mappedMembers.set(
        `user-${selectedTask.assignee_status.user_details.id}`,
        selectedTask.assignee_status
      );
    } else if (selectedTask?.assignee_details?.id) {
      mappedMembers.set(`user-${selectedTask.assignee_details.id}`, {
        id: `legacy-${selectedTask.assignee_details.id}`,
        employee_name: selectedTask.assignee_details.username,
        position: "",
        current_work: "",
        status_type: "busy",
        user_details: selectedTask.assignee_details,
      });
    }

    return Array.from(mappedMembers.values()).sort((left, right) => {
      const leftName = left.employee_name || left.user_details?.username || "";
      const rightName = right.employee_name || right.user_details?.username || "";
      return leftName.localeCompare(rightName, language || "en");
    });
  }, [language, selectedTask, teamMembersWithProjects]);

  const selectedAssigneeMembers = useMemo(
    () =>
      assignableMembers.filter((member) =>
        (formData.assignees || []).includes(String(member.user_details?.id || ""))
      ),
    [assignableMembers, formData.assignees]
  );

  const refreshTasks = () => {
    invalidate({ resource: "tasks", invalidates: ["list", "detail"] });
    invalidate({ resource: "projects", invalidates: ["list", "detail"] });
    invalidate({ resource: "status", invalidates: ["list", "detail"] });
  };

  const getRequestErrorMessage = (error, fallback) => {
    const detail = error?.response?.data;
    if (typeof detail?.error === "string") return detail.error;
    if (Array.isArray(detail?.deadline) && detail.deadline[0]) return detail.deadline[0];
    if (typeof detail?.detail === "string") return detail.detail;
    return fallback;
  };

  const normalizeDateInput = (value) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const dottedMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dottedMatch) {
      const [, day, month, year] = dottedMatch;
      return `${year}-${month}-${day}`;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return value;
    return parsedDate.toISOString().slice(0, 10);
  };

  const handleCreate = () => {
    if (!canManageTasks) return;
    setIsCreateMode(true);
    setSelectedTaskId(null);
    setFormData(emptyForm);
  };

  const handleAssigneeSelect = (assigneeId) => {
    const nextValue = String(assigneeId || "");
    setFormData((current) => ({
      ...current,
      assignees: current.assignees.includes(nextValue)
        ? current.assignees.filter((item) => item !== nextValue)
        : [...current.assignees, nextValue],
    }));
  };

  const syncTaskAssignments = async (groupTasks, targetAssigneeIds, values, anchorTaskId = null) => {
    const orderedTasks = [...groupTasks].sort((left, right) => {
      if (left.id === anchorTaskId) return -1;
      if (right.id === anchorTaskId) return 1;
      return 0;
    });
    const remainingTasks = [...orderedTasks];
    const focusIds = [];
    const normalizedTargets = targetAssigneeIds.length ? targetAssigneeIds : [""];

    for (const assigneeId of normalizedTargets) {
      let taskIndex = remainingTasks.findIndex(
        (task) => String(task.assignee || "") === String(assigneeId || "")
      );
      if (taskIndex === -1) {
        taskIndex = remainingTasks.findIndex((task) => task.id === anchorTaskId);
      }
      if (taskIndex === -1 && remainingTasks.length) {
        taskIndex = 0;
      }

      if (taskIndex !== -1) {
        const [task] = remainingTasks.splice(taskIndex, 1);
        const response = await apiClient.patch(`/tasks/${task.id}/`, {
          ...values,
          assignee: assigneeId || null,
        });
        focusIds.push(response.data?.id || task.id);
      } else {
        const response = await apiClient.post("/tasks/", {
          ...values,
          assignee: assigneeId || null,
        });
        focusIds.push(response.data?.id || response.data?.data?.id || null);
      }
    }

    for (const task of remainingTasks) {
      await apiClient.delete(`/tasks/${task.id}/`);
    }

    return focusIds.find(Boolean) || null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...formData,
      project: formData.project || null,
      deadline: normalizeDateInput(formData.deadline),
      estimated_hours: Number(formData.estimated_hours || 0),
      actual_hours: Number(formData.actual_hours || 0),
    };
    const selectedAssigneeIds = Array.from(
      new Set((formData.assignees || []).map((item) => String(item || "")).filter(Boolean))
    );

    setIsSaving(true);
    try {
      if (selectedTask) {
        if (!canManageTasks) {
          await apiClient.patch(`/tasks/${selectedTask.id}/`, {
            status: payload.status,
            actual_hours: payload.actual_hours,
          });
          refreshTasks();
          return;
        }

        const baseValues = {
          title: payload.title,
          description: payload.description,
          project: payload.project,
          status: payload.status,
          priority: payload.priority,
          deadline: payload.deadline,
          estimated_hours: payload.estimated_hours,
          actual_hours: payload.actual_hours,
        };
        const nextFocusId = await syncTaskAssignments(
          selectedTaskGroup.length ? selectedTaskGroup : [selectedTask],
          selectedAssigneeIds,
          baseValues,
          selectedTask.id
        );
        setIsCreateMode(false);
        if (nextFocusId) setSelectedTaskId(nextFocusId);
        refreshTasks();
        return;
      }

      if (!canManageTasks) return;
      const nextFocusId = await syncTaskAssignments(
        [],
        selectedAssigneeIds,
        {
          title: payload.title,
          description: payload.description,
          project: payload.project,
          status: payload.status,
          priority: payload.priority,
          deadline: payload.deadline,
          estimated_hours: payload.estimated_hours,
          actual_hours: payload.actual_hours,
        }
      );
      setIsCreateMode(false);
      if (nextFocusId) {
        setSelectedTaskId(nextFocusId);
      } else {
        setSelectedTaskId(null);
      }
      refreshTasks();
    } catch (error) {
      alert(
        getRequestErrorMessage(
          error,
          selectedTask ? t("tasks.updateError") : t("tasks.createError")
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!canManageTasks || !selectedTask) return;
    if (!window.confirm(t("tasks.confirmDelete"))) return;
    deleteTask(
      { resource: "tasks", id: selectedTask.id },
      {
        onSuccess: () => {
          setIsCreateMode(false);
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

              <div className="dark-surface rounded-[34px] border border-white/65 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("tasks.taskMode")}</p>
                <p className="mt-3 text-2xl font-black tracking-tight">{canManageTasks ? t("tasks.taskModeAdmin") : t("tasks.taskModeUser")}</p>
                {canManageTasks ? (
                  <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {t("tasks.availableNow")}
                    </p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-white">{availableMembers.length}</p>
                  </div>
                ) : null}
                {canManageTasks ? (
                  <Button
                    type="button"
                    variant="neutral-secondary"
                    onClick={handleCreate}
                    className="mt-6 h-12 rounded-[18px] border-white/20 bg-white px-5 text-sm font-bold text-slate-950 hover:bg-slate-100"
                  >
                    {t("tasks.createTask")}
                  </Button>
                ) : null}
              </div>
            </section>

            <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(290px,0.72fr)_minmax(680px,1.32fr)_minmax(260px,0.56fr)]">
              <div className="min-w-0 rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("tasks.taskList")}</p>
                    <h2 className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950">{t("tasks.taskList")}</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  {tasks.length ? (
                    tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setIsCreateMode(false);
                          setSelectedTaskId(task.id);
                        }}
                        className={`w-full rounded-[26px] border p-5 text-left transition ${
                          !isCreateMode && selectedTaskId === task.id
                            ? "border-sky-200 bg-sky-50/60 shadow-[0_18px_36px_rgba(125,211,252,0.18)]"
                            : "border-slate-200/80 bg-white/80 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="break-words text-lg font-black tracking-tight text-slate-950">{task.title}</p>
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
                        <p className="mt-4 line-clamp-3 break-words text-sm leading-7 text-slate-600">{task.description || t("snippets.noDescription")}</p>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                          <span>
                            {task.assignee_status?.employee_name ||
                              task.assignee_details?.username ||
                              t("tasks.unassigned")}
                          </span>
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

              <div className="min-w-0 rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur xl:self-start">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {selectedTask ? t("tasks.updateTask") : t("tasks.createTaskTitle")}
                  </p>
                  <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950">
                    {isCreateMode ? t("tasks.createTask") : selectedTask?.title || t("tasks.createTask")}
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-5 2xl:grid-cols-2">
                    <div className="rounded-[26px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_12px_28px_rgba(148,163,184,0.08)] 2xl:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Temel Bilgi
                      </p>
                      <div className="mt-4 space-y-4">
                        <TextField label={t("tasks.title")} variant="filled">
                          <TextField.Input
                            value={formData.title}
                            onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                            disabled={!canManageTasks}
                            required
                          />
                        </TextField>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            {t("tasks.description")}
                          </label>
                          <textarea
                            className="min-h-[220px] w-full resize-none rounded-[20px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                            value={formData.description}
                            onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                            disabled={!canManageTasks}
                          />
                        </div>
                      </div>
                    </div>

                    {canManageTasks ? (
                      <>
                        <div className="rounded-[26px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_12px_28px_rgba(148,163,184,0.08)]">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Atama
                          </p>
                          <div className="mt-4 space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              {t("tasks.project")}
                            </label>
                            <select
                              className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
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
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              {t("tasks.assignee")}
                            </label>
                            <select
                              className="hidden"
                              value={formData.assignees?.[0] || ""}
                              onChange={(event) =>
                                setFormData((current) => ({
                                  ...current,
                                  assignees: event.target.value ? [event.target.value] : [],
                                }))
                              }
                            >
                              <option value="">{t("tasks.unassigned")}</option>
                              {assignableMembers.filter((member) => member.user_details?.id).map((member) => (
                                <option key={member.user_details?.id || member.id} value={member.user_details?.id}>
                                  {(member.employee_name || member.user_details.username) +
                                    (member.position ? ` â€¢ ${member.position}` : "")}
                                </option>
                              ))}
                            </select>
                            <div className="rounded-[20px] border border-slate-200 bg-white p-3">
                              <div className="flex flex-wrap gap-2">
                                {assignableMembers.map((member) => {
                                  const memberId = String(member.user_details?.id);
                                  const active = (formData.assignees || []).includes(memberId);

                                  return (
                                    <button
                                      key={`${member.id}-multi`}
                                      type="button"
                                      onClick={() => handleAssigneeSelect(memberId)}
                                      className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                                        active
                                          ? "bg-slate-950 text-white"
                                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                      }`}
                                    >
                                      {member.employee_name || member.user_details?.username}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="mt-3 text-xs leading-6 text-slate-500">
                                {selectedAssigneeMembers.length
                                  ? selectedAssigneeMembers
                                      .map(
                                        (member) =>
                                          member.employee_name || member.user_details?.username
                                      )
                                      .join(", ")
                                  : t("tasks.unassigned")}
                              </p>
                            </div>
                          </div>
                          </div>
                        </div>

                        {selectedAssigneeMembers.length ? (
                          <div className="min-w-0 rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                              {t("tasks.selectedAssignee")}
                            </p>
                            <div className="mt-3 space-y-3">
                              {selectedAssigneeMembers.map((member) => (
                                <div
                                  key={`selected-${member.id}`}
                                  className="rounded-[20px] border border-emerald-200/70 bg-white/80 p-4"
                                >
                                  <p className="break-words text-lg font-black text-slate-950">
                                    {member.employee_name || member.user_details?.username}
                                  </p>
                                  <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                                    {member.profileNote || t("team.noFocus")}
                                  </p>
                                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        {t("projects.clientDepartment")}
                                      </p>
                                      <p className="mt-2 text-sm font-semibold text-slate-700">
                                        {member.currentProjectClient || t("projects.internalProject")}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        {t("projects.delivery")}
                                      </p>
                                      <p className="mt-2 text-sm font-semibold text-slate-700">
                                        {member.currentProjectEndDate
                                          ? formatDate(member.currentProjectEndDate)
                                          : t("projects.notSet")}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500" />
                        )}
                      </>
                    ) : null}

                    {selectedProject ? (
                      <div className="rounded-[26px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_12px_28px_rgba(148,163,184,0.08)] 2xl:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {t("projects.teamAssignment")}
                        </p>
                        <p className="mt-3 break-words text-lg font-black tracking-tight text-slate-950">
                          {selectedProject.name}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {selectedProject.client_name || t("projects.internalProject")}
                        </p>
                        {selectedProject.team_member_details?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2.5">
                            {selectedProject.team_member_details.map((member) => {
                              const isAssignedPerson = (formData.assignees || []).includes(
                                String(member.user_details?.id || "")
                              );

                              return (
                                <span
                                  key={`task-project-member-${member.id}`}
                                  className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                                    isAssignedPerson
                                      ? "border-sky-200 bg-sky-50 text-sky-700"
                                      : "border-slate-200 bg-white text-slate-700"
                                  }`}
                                >
                                  {member.employee_name}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-7 text-slate-500">
                            {t("projects.noMembersAssigned")}
                          </p>
                        )}
                      </div>
                    ) : null}

                    <div className="rounded-[26px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_12px_28px_rgba(148,163,184,0.08)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        İş Akışı
                      </p>
                      {!canManageTasks ? (
                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50/70 px-4 py-4">
                          <input
                            type="checkbox"
                            className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            checked={formData.status === "done"}
                            onChange={(event) =>
                              setFormData((current) => ({
                                ...current,
                                status: event.target.checked ? "done" : "in_progress",
                              }))
                            }
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-slate-900">
                              Görevi tamamladım
                            </span>
                          </span>
                        </label>
                      ) : null}
                      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">
                          {t("tasks.status")}
                        </label>
                        <select
                          className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                          value={formData.status}
                          onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                          disabled={!canManageTasks}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">
                          {t("tasks.priority")}
                        </label>
                        <select
                          className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
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
                      </div>
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_12px_28px_rgba(148,163,184,0.08)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Zamanlama
                      </p>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    </div>

                    <div className="flex flex-col gap-3 pt-2 2xl:col-span-2">
                      <Button
                        type="submit"
                        className="w-full rounded-[18px] bg-slate-950 py-3 text-sm font-bold text-white"
                        disabled={isSaving}
                      >
                        {selectedTask ? t("tasks.updateTask") : t("tasks.saveTask")}
                      </Button>
                      {canManageTasks && selectedTask ? (
                        <Button
                          type="button"
                          onClick={handleDelete}
                          className="w-full rounded-[18px] bg-slate-950 py-3 text-sm font-bold text-white hover:bg-slate-800"
                        >
                          {t("tasks.deleteTask")}
                        </Button>
                        ) : null}
                    </div>
                  </form>
              </div>

              <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
                {canManageTasks ? (
                  <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {t("tasks.liveAvailability")}
                    </p>
                    <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                      {t("tasks.readyToAssign")}
                    </p>

                    <div className="mt-5 space-y-3">
                      {busyMembers.length ? (
                        <div className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                            {t("team.activeProjectMembers")}
                          </p>
                          <div className="mt-4 space-y-3">
                            {busyMembers.map((member) => (
                              <div key={member.id} className="min-w-0 rounded-[20px] border border-amber-200/70 bg-white/80 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-black text-slate-950">
                                      {member.employee_name || member.user_details?.username}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                      {member.position || t("team.noPosition")}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                    {t("team.busy")}
                                  </span>
                                </div>
                                <p className="mt-3 break-words text-sm leading-6 text-slate-600">
                                  {member.projectSummary || member.currentProjectName || t("team.noFocus")}
                                </p>
                                <div className="mt-3 grid grid-cols-1 gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      {t("projects.clientDepartment")}
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-slate-700">
                                      {member.currentProjectClient || t("projects.internalProject")}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      {t("projects.delivery")}
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-slate-700">
                                      {formatDate(member.currentProjectEndDate)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {availableMembers.length ? (
                        availableMembers.map((member) => (
                          <div key={member.id} className="min-w-0 rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="break-words text-sm font-black text-slate-950">
                                  {member.employee_name || resolveMemberUser(member)?.username}
                                </p>
                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                  {member.position || t("team.noPosition")}
                                </p>
                              </div>
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                {t("team.available")}
                              </span>
                            </div>
                            <p className="mt-3 break-words text-sm leading-6 text-slate-600">
                              {member.profileNote || t("team.noFocus")}
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  {t("projects.projectName")}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-slate-700">
                                  {member.currentProjectName || t("tasks.noProject")}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  {t("projects.delivery")}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-slate-700">
                                  {member.currentProjectEndDate ? formatDate(member.currentProjectEndDate) : t("projects.notSet")}
                                </p>
                              </div>
                            </div>
                            {!resolveMemberUser(member) ? (
                              <p className="mt-2 text-xs font-semibold text-amber-600">
                                {t("team.noLinkedAccount")}
                              </p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
                          {t("tasks.noAvailableMembers")}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </aside>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tasks;
