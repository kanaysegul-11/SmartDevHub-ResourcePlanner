import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { FeatherBookOpen, FeatherShield } from "@subframe/core";
import { Link, useParams } from "react-router-dom";

import Sidebar from "../component/layout/Sidebar";
import { useI18n } from "../I18nContext.jsx";
import { useUser } from "../UserContext.jsx";
import { apiClient } from "../refine/axios";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import {
  getLatestRepositoryScan,
  getLocalizedSeverityLabel,
  getRemediationSkipMessage,
  getViolationDisplayMessage,
  getViolationDisplayTitle,
  getViolationFixExample,
  getViolationRecommendation,
  isAlreadyHandledRemediationItem,
  summarizeViolationsByRule,
} from "../utils/governanceViolations";

const EMPTY_ARRAY = [];

function RepositoryViolationDetails() {
  const { repositoryId } = useParams();
  const { t } = useI18n();
  const { userData } = useUser();
  const isAdmin = Boolean(userData?.isAdmin);
  const currentUserId = Number(userData?.id || userData?.pk || userData?.user_id || 0);
  const [ruleFilter, setRuleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [isPreparingAiDraft, setIsPreparingAiDraft] = useState(false);
  const [isApplyingAiDraft, setIsApplyingAiDraft] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);
  const [aiApplyResult, setAiApplyResult] = useState(null);
  const repositoriesQuery = useList({ resource: "github-repositories" });
  const scansQuery = useList({
    resource: "repository-scans",
    filters: [{ field: "repository", operator: "eq", value: repositoryId }],
  });

  const repositories = repositoriesQuery.data?.data ?? EMPTY_ARRAY;
  const scans = scansQuery.data?.data ?? EMPTY_ARRAY;
  const repository = repositories.find(
    (item) => Number(item.id) === Number(repositoryId)
  );
  const isOwnRepository = Boolean(
    currentUserId && Number(repository?.account_user) === currentUserId
  );
  const canUseAiForRepository = Boolean(repository && (!isAdmin || isOwnRepository));
  const latestScan = useMemo(() => getLatestRepositoryScan(scans), [scans]);
  const violations = latestScan?.violations || EMPTY_ARRAY;
  const ruleSummary = useMemo(
    () => summarizeViolationsByRule(violations),
    [violations]
  );
  const filteredViolations = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return violations.filter((violation) => {
      const matchesRule =
        ruleFilter === "all" || (violation.code || "unknown") === ruleFilter;
      const matchesSeverity =
        severityFilter === "all" ||
        (violation.severity || "unknown") === severityFilter;
      const searchableText = [
        violation.title,
        violation.message,
        violation.file_path,
        violation.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);
      return matchesRule && matchesSeverity && matchesSearch;
    });
  }, [violations, ruleFilter, severityFilter, searchText]);
  const availableSeverities = useMemo(
    () =>
      [...new Set(violations.map((violation) => violation.severity || "unknown"))]
        .filter(Boolean)
        .sort(),
    [violations]
  );
  const alreadyHandledItems = useMemo(
    () => (aiApplyResult?.skipped || []).filter(isAlreadyHandledRemediationItem),
    [aiApplyResult]
  );
  const needsReviewItems = useMemo(
    () =>
      (aiApplyResult?.skipped || []).filter(
        (item) => !isAlreadyHandledRemediationItem(item)
      ),
    [aiApplyResult]
  );

  const handlePrepareAiDraft = async (selectedViolations = filteredViolations) => {
    if (!repositoryId || !selectedViolations.length) {
      return;
    }
    if (!canUseAiForRepository) {
      window.alert(
        t(
          "governance.aiOnlyOwnRepositories",
          "AI fixes are only available for repositories connected to your own GitHub account."
        )
      );
      return;
    }

    setIsPreparingAiDraft(true);
    try {
      const response = await apiClient.post("/ai-code-requests/prepare-remediation/", {
        repository_id: Number(repositoryId),
        scan_id: latestScan?.id,
        violation_ids: selectedViolations.slice(0, 8).map((violation) => violation.id),
      });
      setAiDraft(response.data);
      setAiApplyResult(null);
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
          t(
            "governance.remediationDraftFailed",
            "AI remediation draft could not be prepared."
          )
      );
    } finally {
      setIsPreparingAiDraft(false);
    }
  };

  const handleApplyAiDraft = async () => {
    if (!repositoryId || !aiDraft) {
      return;
    }
    if (!canUseAiForRepository) {
      window.alert(
        t(
          "governance.aiOnlyOwnRepositories",
          "AI fixes are only available for repositories connected to your own GitHub account."
        )
      );
      return;
    }

    const violationIds = (aiDraft.remediation_scope || [])
      .map((item) => item.violation_id)
      .filter(Boolean);

    setIsApplyingAiDraft(true);
    try {
      const response = await apiClient.post("/ai-code-requests/apply-remediation/", {
        repository_id: Number(repositoryId),
        scan_id: aiDraft.scan_id || latestScan?.id,
        violation_ids: violationIds,
        branch_name: aiDraft.suggested_branch_name || "",
      });
      setAiApplyResult(response.data);
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
          t(
            "governance.remediationApplyFailed",
            "Remediation branch could not be created."
          )
      );
    } finally {
      setIsApplyingAiDraft(false);
    }
  };

  const formatTimestamp = (value) => {
    if (!value) {
      return t("governance.notAvailable", "Not available");
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  return (
    <div className="flex h-screen w-full items-start overflow-x-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="governance" logoClickable={true} />
      <div className="relative flex min-h-0 min-w-0 grow flex-col items-start self-stretch overflow-y-auto overflow-x-hidden pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex min-w-0 w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={<FeatherShield />}>
                {t("governance.violationDetails", "Violation Details")}
              </Badge>
            }
            rightSlot={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/github-governance/rules"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  <FeatherBookOpen size={16} />
                  {t("governance.codeRules", "Kod Kuralları")}
                </Link>
                <Link
                  to="/github-governance"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  {t("governance.backToGovernance", "Back")}
                </Link>
              </div>
            }
          />

          <div className="grid min-w-0 grid-cols-1 gap-6 px-6 md:px-8 xl:px-10">
            <section className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("governance.repositoryViolationReport", "Repository violation report")}
                  </p>
                  <h1 className="mt-3 font-['Newsreader'] text-4xl font-medium tracking-tight text-slate-950">
                    {repository?.full_name ||
                      latestScan?.repository_name ||
                      t("governance.repository", "Repository")}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {t(
                      "governance.repositoryViolationReportBody",
                      "Each item shows what is wrong and what the expected structure should be."
                    )}
                  </p>
                </div>
                <Badge variant={Number(latestScan?.score || 0) >= 85 ? "success" : "warning"}>
                  {t("governance.score", "Score")}{" "}
                  {Number.isFinite(Number(latestScan?.score))
                    ? Math.round(Number(latestScan.score))
                    : "-"}
                </Badge>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  [t("governance.violations", "Violations"), violations.length],
                  [t("governance.rules", "rules"), ruleSummary.length],
                  [t("governance.files", "Files"), latestScan?.file_count || 0],
                  [
                    t("governance.lastScan", "Last scan"),
                    formatTimestamp(latestScan?.completed_at || latestScan?.created_at),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {ruleSummary.map((rule) => (
                  <Badge
                    key={rule.code}
                    variant={rule.severity === "high" || rule.severity === "critical" ? "warning" : "neutral"}
                  >
                    {rule.code} {rule.count}
                  </Badge>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-white/65 bg-white/90 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.1)]">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-[220px] flex-1 flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {t("governance.search", "Search")}
                  </span>
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder={t(
                      "governance.searchViolations",
                      "Search file, rule, or message"
                    )}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="flex min-w-[180px] flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {t("governance.rule", "Rule")}
                  </span>
                  <select
                    value={ruleFilter}
                    onChange={(event) => setRuleFilter(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="all">{t("governance.allRules", "All rules")}</option>
                    {ruleSummary.map((rule) => (
                      <option key={rule.code} value={rule.code}>
                        {rule.code} ({rule.count})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-[160px] flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {t("governance.severity", "Severity")}
                  </span>
                  <select
                    value={severityFilter}
                    onChange={(event) => setSeverityFilter(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="all">
                      {t("governance.allSeverities", "All severities")}
                    </option>
                    {availableSeverities.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                </label>
                {canUseAiForRepository ? (
                  <button
                    type="button"
                    onClick={() => handlePrepareAiDraft()}
                    disabled={isPreparingAiDraft || !filteredViolations.length}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPreparingAiDraft
                      ? t("governance.preparing", "Preparing...")
                      : t("governance.prepareSafeAiDraft", "Prepare safe AI draft")}
                  </button>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="neutral">
                  {filteredViolations.length}{" "}
                  {t("governance.filteredViolations", "filtered violations")}
                </Badge>
                {canUseAiForRepository ? (
                  <Badge variant="neutral">
                    {t(
                      "governance.aiDraftSafety",
                      "Draft only: no code is changed without review."
                    )}
                  </Badge>
                ) : null}
              </div>
            </section>

            {canUseAiForRepository && aiDraft ? (
              <section className="rounded-[26px] border border-sky-100 bg-sky-50 p-5 shadow-[0_18px_40px_rgba(14,165,233,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      {t("governance.safeAiDraft", "Safe AI draft")}
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      {aiDraft.repository_context?.repository ||
                        repository?.full_name ||
                        t("governance.repository", "Repository")}
                    </h2>
                  </div>
                  <Badge variant="neutral">
                    {aiDraft.remediation_scope?.length || 0}{" "}
                    {t("governance.fixTargets", "fix targets")}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-[20px] border border-sky-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {t("governance.safeWorkflow", "Safe workflow")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {t(
                        "governance.safeWorkflowBody",
                        "Review the draft, then create a dedicated branch for safe automatic fixes. Main branch is never edited directly."
                      )}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-sky-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {t("governance.suggestedBranch", "Suggested branch")}
                    </p>
                    <p className="mt-2 break-all text-sm font-bold text-slate-700">
                      {aiDraft.suggested_branch_name ||
                        t("governance.notAvailable", "Not available")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-sky-100 bg-white p-4">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {t("governance.applySafeDraftTitle", "Apply controlled fixes")}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {t(
                        "governance.applySafeDraftBody",
                        "Creates a new GitHub branch and applies only low-risk fixes that can be changed deterministically."
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyAiDraft}
                    disabled={isApplyingAiDraft || !(aiDraft.remediation_scope || []).length}
                    className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isApplyingAiDraft
                      ? t("governance.applyingSafeDraft", "Applying...")
                      : t(
                          "governance.applySafeAiDraft",
                          "Create branch and apply safe fixes"
                        )}
                  </button>
                </div>
                {aiApplyResult ? (
                  <div
                    className={`mt-4 rounded-[20px] border p-4 ${
                      aiApplyResult.status === "no_safe_fix_available"
                        ? "border-amber-100 bg-amber-50"
                        : "border-emerald-100 bg-emerald-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                            aiApplyResult.status === "no_safe_fix_available"
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {aiApplyResult.status === "no_safe_fix_available"
                            ? t(
                                "governance.noSafeBranchCreated",
                                "No automatic branch was created"
                              )
                            : aiApplyResult.branch_reused
                              ? t(
                                  "governance.existingBranchUsed",
                                  "Existing remediation branch used"
                                )
                            : t(
                                "governance.remediationBranchReady",
                                "Remediation branch ready"
                              )}
                        </p>
                        <p className="mt-2 break-words text-sm font-bold text-slate-800">
                          {aiApplyResult.branch_name ||
                            t(
                              "governance.reviewPatchRequired",
                              "These violations need a reviewed patch before code can be changed."
                            )}
                        </p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                          {aiApplyResult.status === "no_safe_fix_available"
                            ? t(
                                "governance.noSafeFixExplanation",
                                "Meaning: the system found issues, but they are not safe one-click edits. No branch was created and no repository code was changed."
                              )
                            : aiApplyResult.branch_reused
                              ? t(
                                  "governance.existingBranchExplanation",
                                  "Meaning: a remediation branch already existed for this repository, so the system reused it instead of creating another one."
                                )
                              : t(
                                  "governance.branchReadyExplanation",
                                  "Meaning: a remediation branch is ready. Use the diff to review exactly what changed."
                                )}
                        </p>
                      </div>
                      {aiApplyResult.branch_url ? (
                        <div className="flex flex-wrap gap-2">
                          {aiApplyResult.compare_url ? (
                            <a
                              href={aiApplyResult.compare_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                            >
                              {t("governance.viewDiff", "View diff")}
                            </a>
                          ) : null}
                          <a
                            href={aiApplyResult.branch_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
                          >
                            {t("governance.openBranch", "Open branch")}
                          </a>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {t("governance.appliedFiles", "Applied files")}
                        </p>
                        {(aiApplyResult.applied || []).length ? (
                          <ul className="mt-2 space-y-2 text-sm text-slate-700">
                            {(aiApplyResult.applied || []).map((item, index) => (
                              <li key={`${item.path}-${index}`} className="break-all">
                                {item.action} - {item.path}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">
                            {t(
                              "governance.noSafeFixesApplied",
                              "No deterministic fix was applied automatically; the repository code was not changed."
                            )}
                          </p>
                        )}
                      </div>
                      <div className="rounded-2xl border border-amber-100 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {t("governance.skippedFixes", "Needs review")}
                        </p>
                        {alreadyHandledItems.length ? (
                          <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                              {t("governance.alreadyHandled", "Already handled on branch")}
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-700">
                              {alreadyHandledItems.slice(0, 4).map((item, index) => (
                                <li key={`${item.code}-${item.path}-handled-${index}`}>
                                  <span className="font-bold">{item.code}</span>
                                  {item.path ? ` - ${item.path}` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {needsReviewItems.length ? (
                          <ul className="mt-2 space-y-2 text-sm text-slate-700">
                            {needsReviewItems.slice(0, 6).map((item, index) => (
                              <li key={`${item.code}-${item.path}-${index}`}>
                                <span className="font-bold">{item.code}</span>
                                {item.path ? ` - ${item.path}` : ""}:{" "}
                                {getRemediationSkipMessage(item, t)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">
                            {t("governance.noSkippedFixes", "No skipped fix remains.")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {(aiDraft.remediation_scope || []).map((item) => (
                    <div
                      key={item.violation_id}
                      className="rounded-[20px] border border-sky-100 bg-white p-4"
                    >
                      <p className="text-sm font-black text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {item.file_path ||
                          t("governance.repositoryLevel", "Repository level")}
                        {item.line_number ? `:${item.line_number}` : ""} - {item.message}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[20px] border border-sky-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {t("governance.userPrompt", "User Prompt")}
                  </p>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-700">
                    {aiDraft.user_prompt}
                  </pre>
                </div>
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-4">
              {scansQuery.isLoading ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-sm text-slate-500">
                  {t("governance.loadingViolations", "Loading violations...")}
                </div>
              ) : violations.length ? (
                violations.map((violation, index) => (
                  <div
                    key={violation.id || `${violation.code}-${index}`}
                    className="rounded-[26px] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_36px_rgba(148,163,184,0.1)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-950">
                          {getViolationDisplayTitle(violation, t)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {violation.file_path ||
                            t("governance.repositoryLevel", "Repository level")}
                          {violation.line_number ? `:${violation.line_number}` : ""}
                        </p>
                      </div>
                      <Badge variant="warning">
                        {getLocalizedSeverityLabel(
                          violation.severity,
                          t
                        ) || t("governance.unknownStatus", "Unknown")}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <div className="rounded-[20px] border border-rose-100 bg-rose-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                          {t("governance.violationThis", "Violation")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {getViolationDisplayMessage(violation, t)}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          {t("governance.correctStructure", "Correct structure")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {getViolationRecommendation(violation)}
                        </p>
                        {getViolationFixExample(violation) ? (
                          <div className="mt-3 rounded-2xl border border-emerald-100 bg-white p-3">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                              {t("governance.suggestedCodeShape", "Suggested code shape")}
                            </p>
                            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-700">
                              {getViolationFixExample(violation)}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {canUseAiForRepository ? (
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrepareAiDraft([violation])}
                          disabled={isPreparingAiDraft}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {t("governance.prepareThisViolation", "Draft fix for this")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-sm text-slate-500">
                  {t(
                    "governance.noViolationsVisible",
                    "No visible violations found yet."
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RepositoryViolationDetails;
