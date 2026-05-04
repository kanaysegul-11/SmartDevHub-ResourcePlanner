"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useCreate, useList, useOne, useUpdate } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { notification } from "antd";
import {
  FeatherChevronLeft,
  FeatherCode2,
  FeatherEdit2,
  FeatherShield,
  FeatherZap,
} from "@subframe/core";
import Sidebar from "../component/layout/Sidebar";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { Button } from "../ui/components/Button";
import { scanCodeSecurity } from "../utils/SecurityScanner";
import { useI18n } from "../I18nContext.jsx";
import { useUser } from "../UserContext.jsx";
import { getSessionValue } from "../refine/sessionStorage.js";

const EMPTY_FORM = {
  title: "",
  description: "",
  code: "",
  language: "python",
};

const runMutation = (mutate, params) =>
  new Promise((resolve, reject) => {
    mutate(params, {
      onSuccess: (result) => resolve(result),
      onError: (error) => reject(error),
    });
  });

function CreateSnippet() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { userData } = useUser();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const { data: allSnippets } = useList({
    resource: "snippets",
    queryOptions: {
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  });
  const snippetQuery = useOne({
    resource: "snippets",
    id,
    queryOptions: {
      enabled: isEditMode,
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  });
  const { mutate: createSnippet, isLoading: isCreating } = useCreate();
  const { mutate: updateSnippet, isLoading: isUpdating } = useUpdate();

  const snippet = snippetQuery.data?.data;
  const formLoading = isEditMode ? snippetQuery.isLoading || isUpdating : isCreating;
  const currentUserId = String(userData?.id || getSessionValue("user_id") || "").trim();
  const currentUsername = String(
    userData?.username || getSessionValue("username") || ""
  )
    .trim()
    .toLowerCase();
  const canManageSnippet =
    !isEditMode ||
    !snippet ||
    Boolean(userData?.isAdmin) ||
    String(snippet.author_details?.id || "").trim() === currentUserId ||
    String(snippet.author_details?.username || "").trim().toLowerCase() === currentUsername;

  useEffect(() => {
    if (!isEditMode || !snippet) {
      return undefined;
    }

    const populateForm = window.setTimeout(() => {
      setFormData({
        title: snippet.title || "",
        description: snippet.description || "",
        code: snippet.code || "",
        language: snippet.language || "python",
      });
    }, 0);
    return () => window.clearTimeout(populateForm);
  }, [isEditMode, snippet]);

  const onFinish = async (values) => {
    const risks = scanCodeSecurity(values?.code ?? "");
    const normalizedNextCode = (values?.code || "").replace(/\s/g, "");
    const isDuplicate = allSnippets?.data?.some(
      (item) =>
        String(item.id) !== String(id || "") &&
        (item.code || "").replace(/\s/g, "") === normalizedNextCode
    );

    if (isDuplicate) {
      notification.warning({
        message: t("snippets.duplicateTitle"),
        description: t("snippets.duplicateBody"),
      });
      return false;
    }

    if (risks.length > 0) {
      notification.error({
        message: t("snippets.securityBlockTitle"),
        description: `${risks[0].message}.`,
        placement: "topRight",
        duration: 5,
      });
      return false;
    }

    try {
      if (isEditMode) {
        await runMutation(updateSnippet, {
          resource: "snippets",
          id,
          values,
        });
      } else {
        await runMutation(createSnippet, {
          resource: "snippets",
          values,
        });
      }

      notification.success({
        message: isEditMode ? t("snippets.updatedTitle") : t("snippets.successTitle"),
        description: isEditMode ? t("snippets.updatedBody") : t("snippets.successBody"),
        placement: "topRight",
      });
      return true;
    } catch (error) {
      const serverMessage =
        error?.response?.data?.code?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        t("snippets.duplicateBody");
      notification.error({
        message: t("snippets.saveBlocked"),
        description: serverMessage,
        placement: "topRight",
        duration: 5,
      });
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const success = await onFinish(formData);

    if (success) {
      navigate(isEditMode ? `/snippets/${id}` : "/snippets");
    }
  };

  const currentRisks = useMemo(
    () => scanCodeSecurity(formData.code || ""),
    [formData.code]
  );
  const pageTitle = isEditMode ? t("snippets.editTitle") : t("snippets.createTitle");

  if (isEditMode && snippetQuery.isLoading && !snippet) {
    return (
      <div className="p-20 text-center font-bold italic text-sky-600 animate-pulse">
        {t("snippets.detailLoading")}
      </div>
    );
  }

  if (isEditMode && (snippetQuery.isError || !snippet)) {
    return (
      <div className="flex flex-col items-center gap-4 p-20 text-center">
        <p className="font-bold text-slate-500">{t("snippets.detailNotFound")}</p>
        <button onClick={() => navigate("/snippets")} className="text-sm text-blue-500 underline">
          {t("snippets.backToList")}
        </button>
      </div>
    );
  }

  if (isEditMode && !canManageSnippet) {
    return (
      <div className="flex flex-col items-center gap-4 p-20 text-center">
        <p className="text-2xl font-black tracking-tight text-slate-900">
          {t("snippets.editBlockedTitle")}
        </p>
        <p className="max-w-lg text-sm leading-7 text-slate-500">
          {t("snippets.editBlockedBody")}
        </p>
        <button
          type="button"
          onClick={() => navigate(`/snippets/${id}`)}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          {t("snippets.backToList")}
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell flex bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="snippets" showTeamSubmenu={true} logoClickable={true} />

      <div className="app-shell__main relative flex flex-col items-start pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={isEditMode ? <FeatherEdit2 /> : <FeatherCode2 />}>
                {pageTitle}
              </Badge>
            }
            rightSlot={<Badge variant="success">{t("snippets.workspace")}</Badge>}
          />

          <div className="flex w-full flex-col gap-6 px-6 md:px-8 xl:px-10">
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.12fr)_340px]">
              <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.86))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur lg:p-8">
                <button
                  onClick={() => navigate(isEditMode ? `/snippets/${id}` : "/snippets")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
                >
                  <FeatherChevronLeft size={16} />
                  {t("snippets.back")}
                </button>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Badge variant="neutral" icon={<FeatherZap />}>
                    {t("snippets.workspace")}
                  </Badge>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-700">
                    {formData.language}
                  </span>
                </div>

                <h1 className="mt-4 max-w-3xl font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-slate-950">
                  {pageTitle}
                </h1>
              </div>

              <div className="dark-surface rounded-[34px] border border-white/65 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("snippets.securityTitle")}</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-white">
                  {currentRisks.length ? t("snippets.securityBlockTitle") : t("snippets.systemSecure")}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {currentRisks.length ? currentRisks[0].message : t("snippets.safeMessage")}
                </p>

                <div className="mt-6 space-y-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("snippets.titlePlaceholder")}</p>
                    <p className="mt-2 text-lg font-black text-white">{formData.title || "-"}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("snippets.descriptionPlaceholder")}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{formData.description || "-"}</p>
                  </div>
                </div>
              </div>
            </section>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
                  <input
                    className="rounded-[22px] border border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                    placeholder={t("snippets.titlePlaceholder")}
                    value={formData.title}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    required
                  />

                  <select
                    className="rounded-[22px] border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                    value={formData.language}
                    onChange={(event) => setFormData({ ...formData, language: event.target.value })}
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="react/js">React/JS</option>
                    <option value="csharp">C#</option>
                    <option value="css">CSS</option>
                    <option value="html">HTML</option>
                  </select>
                </div>

                <textarea
                  className="mt-6 min-h-[130px] w-full rounded-[24px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                  placeholder={t("snippets.descriptionPlaceholder")}
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  required
                />

                <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-[#07111f] shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t("snippets.detailCodeSurface")}</p>
                      <p className="mt-2 text-xl font-black text-white">{formData.title || pageTitle}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      {formData.language}
                    </span>
                  </div>
                  <textarea
                    className="min-h-[360px] w-full resize-none bg-transparent p-6 font-mono text-sm leading-8 text-sky-100 outline-none placeholder:text-slate-500"
                    placeholder={t("snippets.codePlaceholder")}
                    value={formData.code}
                    onChange={(event) => setFormData({ ...formData, code: event.target.value })}
                    required
                  />
                </div>
              </div>

              <aside className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur">
                <div className="inline-flex rounded-2xl bg-rose-50 p-3 text-rose-600">
                  <FeatherShield size={20} />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("analytics.insightPanel")}</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {isEditMode ? t("snippets.updateSnippet") : t("snippets.saveToLibrary")}
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full rounded-[18px] bg-slate-950 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    disabled={formLoading}
                  >
                    {formLoading
                      ? t("snippets.saving")
                      : isEditMode
                        ? t("snippets.updateSnippet")
                        : t("snippets.saveToLibrary")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate(isEditMode ? `/snippets/${id}` : "/snippets")}
                    className="w-full rounded-[18px] bg-slate-100 py-3 text-sm font-bold text-slate-700"
                  >
                    {t("app.cancel")}
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

export default CreateSnippet;
