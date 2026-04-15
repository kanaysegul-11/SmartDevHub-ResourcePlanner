import React, { useEffect, useMemo, useRef, useState } from "react";
import { useList } from "@refinedev/core";
import { FeatherShield, FeatherZap } from "@subframe/core";

import Sidebar from "../component/layout/Sidebar";
import { useI18n } from "../I18nContext.jsx";
import { useUser } from "../UserContext.jsx";
import { apiClient } from "../refine/axios";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";

const EMPTY_ARRAY = [];

function GithubGovernance() {
  const { userData } = useUser();
  const { t } = useI18n();
  const isAdmin = Boolean(userData?.isAdmin);
  const accountsQuery = useList({ resource: "github-accounts" });
  const repositoriesQuery = useList({ resource: "github-repositories" });
  const scansQuery = useList({ resource: "repository-scans" });
  const profilesQuery = useList({ resource: "standard-profiles" });
  const aiRequestsQuery = useList({ resource: "ai-code-requests" });

  const accounts = accountsQuery.data?.data ?? EMPTY_ARRAY;
  const repositories = repositoriesQuery.data?.data ?? EMPTY_ARRAY;
  const scans = scansQuery.data?.data ?? EMPTY_ARRAY;
  const profiles = profilesQuery.data?.data ?? EMPTY_ARRAY;
  const aiRequests = aiRequestsQuery.data?.data ?? EMPTY_ARRAY;
  const hasConnectedGithubAccount = accounts.length > 0;

  const [githubToken, setGithubToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLaunchingOauth, setIsLaunchingOauth] = useState(false);
  const [isCompletingOauth, setIsCompletingOauth] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [activeScanId, setActiveScanId] = useState(null);
  const [isPreparingPrompt, setIsPreparingPrompt] = useState(false);
  const [validationForm, setValidationForm] = useState({
    repository_id: "",
    standard_profile_id: "",
    provider_name: "openai",
    model_name: "gpt-4",
    task_summary: "",
    prompt: "",
    file_path: "src/example.js",
    code: "const answer = 42;\n",
  });
  const [isValidating, setIsValidating] = useState(false);
  const [latestValidation, setLatestValidation] = useState(null);
  const [latestPreparedBundle, setLatestPreparedBundle] = useState(null);
  const [latestRemediationDraft, setLatestRemediationDraft] = useState(null);
  const [isPreparingRemediation, setIsPreparingRemediation] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [developerOverview, setDeveloperOverview] = useState({
    leaderboard: [],
    recent_commits: [],
    recent_pull_requests: [],
    scope: "self",
  });
  const oauthCallbackHandledRef = useRef(false);

  const averageRepoScore = useMemo(() => {
    const scores = repositories
      .map((repository) => Number(repository.latest_score))
      .filter((score) => Number.isFinite(score));
    if (!scores.length) {
      return 0;
    }
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [repositories]);
  const leaderboard = developerOverview.leaderboard ?? EMPTY_ARRAY;
  const recentCommitActivities = developerOverview.recent_commits ?? EMPTY_ARRAY;
  const recentPullRequestActivities =
    developerOverview.recent_pull_requests ?? EMPTY_ARRAY;
  const personalAccountCount = accounts.length;
  const teamAccountCount = useMemo(() => {
    if (!isAdmin) {
      return personalAccountCount;
    }
    return new Set(repositories.map((repository) => repository.account)).size;
  }, [isAdmin, personalAccountCount, repositories]);
  const recentViolations = useMemo(
    () =>
      scans.flatMap((scan) =>
        (scan.violations || []).map((violation, index) => ({
          ...violation,
          _key: `${scan.id}-${violation.id || index}`,
          repository_name: scan.repository_name,
          scan_score: scan.score,
          scan_created_at: scan.created_at,
        }))
      ).sort((left, right) => {
        const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
        return (
          (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0) ||
          new Date(right.scan_created_at || 0) - new Date(left.scan_created_at || 0)
        );
      }),
    [scans]
  );
  const visibleViolationCount = recentViolations.length;
  const pollingFallbackCount = useMemo(
    () =>
      repositories.filter(
        (repository) => repository.metadata?.webhook?.status === "polling_fallback"
      ).length,
    [repositories]
  );
  const failingCheckRepositoryCount = useMemo(
    () =>
      repositories.filter(
        (repository) =>
          Number(repository.metadata?.activity_health?.failing_checks || 0) > 0
      ).length,
    [repositories]
  );
  const roleViewLabel = isAdmin
    ? t("governance.adminView", "Admin view")
    : t("governance.developerView", "Developer view");
  const overviewScope = developerOverview.scope || (isAdmin ? "team" : "self");
  const visibilityMessage = isAdmin
    ? t(
      "governance.visibilityAdminBody",
      "Admins can review team-wide rankings, contributor activity, and shared repository compliance."
    )
    : t(
      "governance.visibilityDeveloperBody",
      "Developers can manage connected repositories, but only see their own score, personal activity, and AI validation history."
    );
  const leaderboardTitle = isAdmin
    ? t("governance.teamLeaderboard", "Developer Leaderboard")
    : t("governance.myGovernanceScore", "My Governance Score");
  const activityFeedTitle = isAdmin
    ? t("governance.teamActivityFeed", "Team Commit & PR Feed")
    : t("governance.myActivityFeed", "My Commit & PR Feed");
  const leaderboardEmptyMessage = isAdmin
    ? t(
      "governance.teamLeaderboardEmpty",
      "Run repository activity sync or scan to build the team leaderboard."
    )
    : t(
      "governance.myGovernanceScoreEmpty",
      "Sync activity or run a scan to build your personal governance score."
    );
  const summaryCards = [
    [t("governance.accounts", "Accounts"), teamAccountCount],
    [t("governance.repositories", "Repositories"), repositories.length],
    [t("governance.profiles", "Profiles"), profiles.length],
    [t("governance.scans", "Scans"), scans.length],
    [t("governance.avgScore", "Avg Score"), averageRepoScore],
  ];
  const repositoriesNeedingAttention = useMemo(
    () =>
      repositories.filter((repository) => {
        const health = repository.metadata?.activity_health || {};
        const autoSyncStatus = repository.metadata?.auto_sync?.status || "";
        return (
          repository.metadata?.webhook?.status === "polling_fallback" ||
          ["queued", "running", "failed"].includes(autoSyncStatus) ||
          Number(health.failing_checks || 0) > 0 ||
          repository.latest_score === null ||
          repository.latest_score === undefined ||
          (repository.last_pushed_at &&
            repository.latest_scan_at &&
            new Date(repository.latest_scan_at) < new Date(repository.last_pushed_at))
        );
      }).length,
    [repositories]
  );

  const getStatusLabel = (statusKey) => {
    if (!statusKey) {
      return t("governance.unknownStatus", "Unknown");
    }

    return t(
      `governance.statuses.${statusKey}`,
      statusKey.replaceAll("_", " ")
    );
  };

  const getStatusVariant = (statusKey) => {
    if (
      ["completed", "validated", "active", "created", "monitored"].includes(
        statusKey
      )
    ) {
      return "success";
    }
    if (["queued", "running", "polling_fallback"].includes(statusKey)) {
      return "neutral";
    }
    return "warning";
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

  const getRepositoryMonitoringState = (repository) => {
    const autoSyncStatus = repository.metadata?.auto_sync?.status || "";
    const webhookStatus = repository.metadata?.webhook?.status || "";

    if (autoSyncStatus === "running") {
      return {
        status: "running",
        label: t("governance.autoScanRunning", "Auto scan running"),
      };
    }
    if (autoSyncStatus === "queued") {
      return {
        status: "queued",
        label: t("governance.autoScanQueued", "Auto scan queued"),
      };
    }
    if (webhookStatus === "polling_fallback") {
      return {
        status: "polling_fallback",
        label: t("governance.pollingFallback", "Background sync fallback"),
      };
    }
    if (
      ["active", "created"].includes(webhookStatus) ||
      repository.latest_scan_at ||
      repository.last_synced_at
    ) {
      return {
        status: "monitored",
        label: t("governance.monitored", "Monitoring active"),
      };
    }
    return {
      status: "warning",
      label: t("governance.awaitingMonitoring", "Waiting for monitoring"),
    };
  };

  const getActivityHealthState = (repository) => {
    const health = repository.metadata?.activity_health || {};
    const failingChecks = Number(health.failing_checks || 0);
    const pendingChecks = Number(health.pending_checks || 0);
    const reviewGaps = Number(health.review_gaps || 0);

    if (failingChecks > 0) {
      return {
        label: t("governance.ciAttention", "CI attention"),
        variant: "warning",
      };
    }
    if (pendingChecks > 0 || reviewGaps > 0) {
      return {
        label: t("governance.reviewWatch", "Review watch"),
        variant: "neutral",
      };
    }
    return {
      label: t("governance.activityHealthy", "Healthy"),
      variant: "success",
    };
  };

  const hasBackgroundRefreshWork = useMemo(
    () =>
      repositories.some((repository) =>
        ["queued", "running"].includes(repository.metadata?.auto_sync?.status || "")
      ),
    [repositories]
  );

  const clearGithubOauthParams = () => {
    const url = new URL(window.location.href);
    ["code", "state", "error", "error_description"].forEach((key) => {
      url.searchParams.delete(key);
    });
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
  };

  const refreshAll = async () => {
    const [, , , , , overviewResponse, integrationResponse] = await Promise.all([
      accountsQuery.refetch?.(),
      repositoriesQuery.refetch?.(),
      scansQuery.refetch?.(),
      profilesQuery.refetch?.(),
      aiRequestsQuery.refetch?.(),
      apiClient.get("/github-repositories/developer-overview/").catch(() => null),
      apiClient.get("/github-accounts/integration-status/").catch(() => null),
    ]);
    if (overviewResponse?.data) {
      setDeveloperOverview(overviewResponse.data);
    }
    if (integrationResponse?.data) {
      setIntegrationStatus(integrationResponse.data);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadGovernanceMeta = async () => {
      try {
        const [overviewResponse, integrationResponse] = await Promise.all([
          apiClient.get("/github-repositories/developer-overview/"),
          apiClient.get("/github-accounts/integration-status/"),
        ]);
        if (!ignore) {
          setDeveloperOverview(overviewResponse.data);
          setIntegrationStatus(integrationResponse.data);
        }
      } catch {
        if (!ignore) {
          setDeveloperOverview({
            leaderboard: [],
            recent_commits: [],
            recent_pull_requests: [],
            scope: "self",
          });
          setIntegrationStatus(null);
        }
      }
    };

    void loadGovernanceMeta();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!hasConnectedGithubAccount) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refreshAll();
    }, hasBackgroundRefreshWork ? 10000 : 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasConnectedGithubAccount, hasBackgroundRefreshWork]);

  useEffect(() => {
    let ignore = false;
    const url = new URL(window.location.href);
    const githubError = url.searchParams.get("error");
    const githubErrorDescription = url.searchParams.get("error_description");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (githubError) {
      window.alert(
        githubErrorDescription ||
          t("governance.oauthAccessDenied", "GitHub authorization was cancelled.")
      );
      clearGithubOauthParams();
      return undefined;
    }

    if (!code || !state || oauthCallbackHandledRef.current) {
      return undefined;
    }

    oauthCallbackHandledRef.current = true;

    const completeOauth = async () => {
      setIsCompletingOauth(true);
      try {
        await apiClient.post("/github-accounts/oauth-connect/", {
          code,
          state,
        });
        if (!ignore) {
          await refreshAll();
          window.alert(
            t(
              "governance.oauthConnectSuccess",
              "GitHub account connected and repositories synchronized."
            )
          );
        }
      } catch (error) {
        if (!ignore) {
          window.alert(
            error?.response?.data?.detail ||
              t(
                "governance.oauthConnectFailed",
                "GitHub OAuth connection failed."
              )
          );
        }
      } finally {
        clearGithubOauthParams();
        if (!ignore) {
          setIsCompletingOauth(false);
        }
      }
    };

    void completeOauth();
    return () => {
      ignore = true;
    };
  }, [t]);

  const handleConnectGithub = async (event) => {
    event.preventDefault();
    if (!githubToken.trim()) {
      window.alert(
        t("governance.githubTokenRequired", "GitHub access token is required.")
      );
      return;
    }

    setIsConnecting(true);
    try {
      await apiClient.post("/github-accounts/", {
        access_token: githubToken.trim(),
      });
      setGithubToken("");
      await refreshAll();
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
        t("governance.githubConnectionFailed", "GitHub connection failed.")
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateStarterProfile = async () => {
    setIsCreatingProfile(true);
    try {
      await apiClient.post("/standard-profiles/create-starter-profile/");
      await refreshAll();
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
        t(
          "governance.starterProfileCreationFailed",
          "Starter profile could not be created."
        )
      );
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleStartGithubOauth = async () => {
    setIsLaunchingOauth(true);
    try {
      const response = await apiClient.get("/github-accounts/oauth-authorize/");
      const authorizeUrl = response?.data?.authorize_url;
      if (!authorizeUrl) {
        throw new Error("missing_authorize_url");
      }
      window.location.assign(authorizeUrl);
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
          t(
            "governance.oauthAuthorizeFailed",
            "GitHub OAuth could not be started."
          )
      );
      setIsLaunchingOauth(false);
    }
  };

  const handleScanRepository = async (repositoryId) => {
    setActiveScanId(repositoryId);
    try {
      await apiClient.post(`/github-repositories/${repositoryId}/scan/`);
      await refreshAll();
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
        t("governance.repositoryScanFailed", "Repository scan failed.")
      );
    } finally {
      setActiveScanId(null);
    }
  };

  const handleValidateAi = async (event) => {
    event.preventDefault();
    setIsValidating(true);
    try {
      const response = await apiClient.post("/ai-code-requests/validate/", {
        repository_id: validationForm.repository_id || undefined,
        standard_profile_id: validationForm.standard_profile_id || undefined,
        provider_name: validationForm.provider_name,
        model_name: validationForm.model_name,
        task_summary: validationForm.task_summary,
        prompt: validationForm.prompt,
        output_files: [
          {
            path: validationForm.file_path,
            content: validationForm.code,
          },
        ],
      });
      setLatestValidation(response.data);
      setLatestPreparedBundle(response.data.prepared_bundle || null);
      await refreshAll();
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
        t("governance.aiValidationFailed", "AI validation failed.")
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handlePrepareAi = async () => {
    setIsPreparingPrompt(true);
    try {
      const response = await apiClient.post("/ai-code-requests/prepare/", {
        repository_id: validationForm.repository_id || undefined,
        standard_profile_id: validationForm.standard_profile_id || undefined,
        task_summary: validationForm.task_summary,
      });
      setLatestPreparedBundle(response.data);
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
        t(
          "governance.aiBriefPreparationFailed",
          "AI brief could not be prepared."
        )
      );
    } finally {
      setIsPreparingPrompt(false);
    }
  };

  const handlePrepareRemediation = async (repositoryId) => {
    if (!repositoryId) {
      return;
    }

    setIsPreparingRemediation(true);
    try {
      const response = await apiClient.post("/ai-code-requests/prepare-remediation/", {
        repository_id: repositoryId,
      });
      setLatestRemediationDraft(response.data);
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
          t(
            "governance.remediationDraftFailed",
            "AI remediation draft could not be prepared."
          )
      );
    } finally {
      setIsPreparingRemediation(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-start overflow-x-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="governance" logoClickable={true} />
      <div className="relative flex min-h-0 grow flex-col items-start self-stretch overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={<FeatherShield />}>
                {t("governance.workspace", "Code Governance")}
              </Badge>
            }
            rightSlot={
              <Badge variant={isAdmin ? "success" : "neutral"}>
                {roleViewLabel}
              </Badge>
            }
          />

          <div className="grid grid-cols-1 gap-6 px-6 md:px-8 xl:px-10">
            <section className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
              <Badge variant="neutral" icon={<FeatherZap />}>
                {t(
                  "governance.badge",
                  "GitHub Standards & AI Validation"
                )}
              </Badge>
              <h1 className="mt-4 font-['Newsreader'] text-4xl font-medium tracking-tight text-slate-950">
                {t(
                  "governance.heroTitle",
                  "Manage repository standards, developer quality, and AI code validation."
                )}
              </h1>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
                {summaryCards.map(([label, value]) => (
                  <div key={label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">
                    {t("governance.autoMonitoringStatus", "Auto monitoring")}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {Math.max(repositories.length - repositoriesNeedingAttention, 0)}/
                    {repositories.length || 0}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t(
                      "governance.autoMonitoringStatusBody",
                      "Repositories with fresh scans and healthy activity signals stay in the healthy tracking bucket."
                    )}
                  </p>
                </div>
                <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-700">
                    {t("governance.needsAttention", "Needs attention")}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {repositoriesNeedingAttention}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t(
                      "governance.needsAttentionBody",
                      "These repositories are waiting for a fresh scan, fallback sync, or CI follow-up."
                    )}
                  </p>
                </div>
                <div className="rounded-[24px] border border-rose-100 bg-rose-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-rose-700">
                    {t("governance.qualitySignals", "Quality signals")}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {failingCheckRepositoryCount} / {visibleViolationCount}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t(
                      "governance.qualitySignalsBody",
                      "The first number is repositories with failing checks; the second is visible rule violations."
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {t("governance.visibilityPolicy", "Visibility Policy")}
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {visibilityMessage}
                </p>
              </div>
            </section>

            <section className={`grid grid-cols-1 gap-6 ${isAdmin ? "" : "xl:grid-cols-2"}`}>
              {!isAdmin ? (
                <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                  <div className="flex items-center justify-between">
                    <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                      {t("governance.connectGithub", "Connect GitHub")}
                    </h2>
                    <Badge variant="neutral">
                      {t(
                        "governance.profilesManagedByAdmins",
                        "Profiles managed by admins"
                      )}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {t(
                      "governance.userConnectBody",
                      "After you connect your GitHub account, your repositories are refreshed and monitored automatically."
                    )}
                  </p>
                  {!hasConnectedGithubAccount ? (
                    <>
                      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              integrationStatus?.oauth_enabled ? "success" : "warning"
                            }
                          >
                            {integrationStatus?.oauth_enabled
                              ? t("governance.oauthReady", "OAuth ready")
                              : t("governance.oauthNotConfigured", "OAuth not configured")}
                          </Badge>
                          <Badge
                            variant={
                              integrationStatus?.webhook_ready ? "success" : "warning"
                            }
                          >
                            {integrationStatus?.webhook_ready
                              ? t("governance.webhookReady", "Webhook ready")
                              : t(
                                "governance.webhookNotConfigured",
                                "Webhook not configured"
                              )}
                          </Badge>
                          <Badge variant="neutral">
                            {t("governance.autoSyncMode", "Auto-sync")}{" "}
                            {integrationStatus?.auto_sync_mode || t("governance.backgroundThread", "background thread")}
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={handleStartGithubOauth}
                            disabled={
                              isLaunchingOauth ||
                              isCompletingOauth ||
                              !integrationStatus?.oauth_enabled
                            }
                            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isCompletingOauth
                              ? t(
                                "governance.completingOauth",
                                "Completing GitHub authorization..."
                              )
                              : isLaunchingOauth
                                ? t(
                                  "governance.redirectingToGithub",
                                  "Redirecting to GitHub..."
                                )
                                : t(
                                  "governance.connectWithGithub",
                                  "Connect with GitHub"
                                )}
                          </button>
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                            <p>
                              {t("governance.oauthRedirectUri", "OAuth redirect URI")}:{" "}
                              <span className="break-all text-slate-700">
                                {integrationStatus?.oauth_redirect_uri ||
                                  t("governance.notConfiguredYet", "Not configured yet")}
                              </span>
                            </p>
                            <p className="mt-2">
                              {t("governance.webhookTargetUrl", "Webhook target URL")}:{" "}
                              <span className="break-all text-slate-700">
                                {integrationStatus?.webhook_target_url ||
                                  t("governance.notConfiguredYet", "Not configured yet")}
                              </span>
                            </p>
                            {integrationStatus?.webhook_requires_public_url ? (
                              <p className="mt-2 text-amber-600">
                                {t(
                                  "governance.webhookPublicUrlHint",
                                  "GitHub can reach this endpoint only if the backend is exposed with a public URL or tunnel."
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                          {t("governance.manualFallback", "Manual token fallback")}
                        </p>
                      </div>
                      <form onSubmit={handleConnectGithub} className="mt-3 flex flex-col gap-3">
                        <input
                          type="password"
                          value={githubToken}
                          onChange={(event) => setGithubToken(event.target.value)}
                          placeholder={t(
                            "governance.githubTokenPlaceholder",
                            "GitHub personal access token"
                          )}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                        />
                        <button
                          type="submit"
                          disabled={isConnecting}
                          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isConnecting
                            ? t("governance.connecting", "Connecting...")
                            : t("governance.connectAccount", "Connect account")}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      {t(
                        "governance.oauthConnectSuccess",
                        "GitHub account connected and repositories synchronized."
                      )}
                    </div>
                  )}
                  <div className="mt-5 flex flex-col gap-3">
                    {accounts.length ? (
                      accounts.map((account) => (
                        <div key={account.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-black text-slate-950">{account.github_username}</p>
                              <p className="text-sm text-slate-500">{account.masked_token}</p>
                            </div>
                            <Badge variant="neutral">
                              {t("governance.repositories", "Repositories")} {account.repository_count || 0}
                            </Badge>
                          </div>
                          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                            {t("governance.lastSynced", "Last synced")}{" "}
                            {formatTimestamp(account.last_synced_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                        {t(
                          "governance.noGithubAccount",
                          "No GitHub account connected yet."
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <div className="flex items-center justify-between">
                  <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                    {t("governance.standardProfiles", "Standard Profiles")}
                  </h2>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={handleCreateStarterProfile}
                      disabled={isCreatingProfile}
                      className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isCreatingProfile
                        ? t("governance.creating", "Creating...")
                        : t("governance.createStarterProfile", "Create starter profile")}
                    </button>
                  ) : (
                    <Badge variant="neutral">
                      {t("governance.readOnly", "Read only")}
                    </Badge>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {t(
                    isAdmin
                      ? "governance.adminProfilesBody"
                      : "governance.userProfilesBody",
                    isAdmin
                      ? "Admins manage the standard rules that every connected repository is checked against."
                      : "Your repositories are evaluated against the standard profile configured by admins."
                  )}
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  {profiles.length ? (
                    profiles.map((profile) => (
                      <div key={profile.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">{profile.name}</p>
                            <p className="text-sm text-slate-500">
                              {profile.description || t("governance.noDescription", "No description")}
                            </p>
                          </div>
                          <Badge variant={profile.is_default ? "success" : "neutral"}>
                            {profile.active_rule_count || 0} {t("governance.rules", "rules")}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      {t(
                        "governance.noStandardProfiles",
                        "No standard profiles available."
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                  {t("governance.repositories", "Repositories")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {t(
                    "governance.repositoriesBody",
                    "Connected repositories are watched automatically. The table below shows the current monitoring state, latest score, and refresh times."
                  )}
                </p>
                <div className="mt-5 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50">
                  {repositories.length ? (
                    <>
                      <div className="hidden grid-cols-[minmax(0,2.1fr)_1fr_0.8fr_1fr_1.2fr_auto] gap-4 border-b border-slate-200 bg-white/70 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 md:grid">
                        <span>{t("governance.repositoryColumn", "Repository")}</span>
                        <span>{t("governance.monitoringColumn", "Monitoring")}</span>
                        <span>{t("governance.scoreColumn", "Score")}</span>
                        <span>{t("governance.profileColumn", "Profile")}</span>
                        <span>{t("governance.lastUpdateColumn", "Last update")}</span>
                        <span>{t("governance.actionColumn", "Action")}</span>
                      </div>
                      {repositories.map((repository) => {
                        const monitoringState = getRepositoryMonitoringState(repository);
                        const activityHealthState = getActivityHealthState(repository);
                        return (
                          <div
                            key={repository.id}
                            className="grid gap-4 border-t border-slate-200 px-4 py-4 first:border-t-0 md:grid-cols-[minmax(0,2.1fr)_1fr_0.8fr_1fr_1.2fr_auto] md:items-center"
                          >
                            <div>
                              <p className="text-lg font-black text-slate-950">{repository.full_name}</p>
                              <p className="text-sm text-slate-500">
                                {repository.primary_language ||
                                  t("governance.unknownLanguage", "Unknown language")}
                              </p>
                              {repository.metadata?.webhook?.status === "polling_fallback" ? (
                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                  {t(
                                    "governance.pollingFallbackHint",
                                    "Webhook requires a public backend URL. Until then, the repository stays under background refresh mode."
                                  )}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={getStatusVariant(monitoringState.status)}>
                                {monitoringState.label}
                              </Badge>
                              <Badge variant={activityHealthState.variant}>
                                {activityHealthState.label}
                              </Badge>
                              {repository.metadata?.auto_sync?.status ? (
                                <Badge variant={getStatusVariant(repository.metadata.auto_sync.status)}>
                                  {t("governance.autoSync", "Auto-sync")}{" "}
                                  {getStatusLabel(repository.metadata.auto_sync.status)}
                                </Badge>
                              ) : null}
                            </div>
                            <div>
                              {Number.isFinite(Number(repository.latest_score)) ? (
                                <Badge variant={Number(repository.latest_score) >= 85 ? "success" : "warning"}>
                                  {Math.round(Number(repository.latest_score))}
                                </Badge>
                              ) : (
                                <span className="text-sm text-slate-500">
                                  {t("governance.awaitingFirstScore", "Awaiting first score")}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-600">
                              {repository.standard_profile_details?.name ||
                                t("governance.noProfile", "No profile")}
                            </div>
                            <div className="text-sm text-slate-600">
                              <p>{formatTimestamp(repository.last_synced_at)}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                                {t("governance.lastPush", "Last push")}{" "}
                                {formatTimestamp(repository.last_pushed_at)}
                              </p>
                              {Number(repository.metadata?.activity_health?.failing_checks || 0) > 0 ? (
                                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-rose-500">
                                  {repository.metadata.activity_health.failing_checks}{" "}
                                  {t("governance.failedChecks", "failed checks")}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex sm:justify-end">
                              <button
                                type="button"
                                onClick={() => handleScanRepository(repository.id)}
                                disabled={activeScanId === repository.id}
                                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                              >
                                {activeScanId === repository.id
                                  ? t("governance.refreshing", "Refreshing...")
                                  : t("governance.refreshNow", "Refresh now")}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      {t(
                        "governance.connectGithubToLoadRepositories",
                        "Connect GitHub first to load repositories."
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                  {t("governance.recentScans", "Recent Scans")}
                </h2>
                <div className="mt-5 flex flex-col gap-3">
                  {scans.length ? (
                    scans.slice(0, 5).map((scan) => (
                      <div key={scan.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-950">{scan.repository_name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                          {getStatusLabel(scan.status)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="neutral">
                            {t("governance.violations", "Violations")} {scan.violation_count || 0}
                          </Badge>
                          <Badge variant="neutral">
                            {isAdmin
                              ? `${t("governance.developers", "Developers")} ${scan.developer_count || 0}`
                              : t("governance.personalVisibility", "Personal visibility")}
                          </Badge>
                          <Badge variant={Number(scan.score || 0) >= 85 ? "success" : "warning"}>
                            {t("governance.score", "Score")} {Math.round(Number(scan.score || 0))}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      {t("governance.noScans", "No scan has been completed yet.")}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6">
              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                  {isAdmin
                    ? t("governance.teamViolations", "Team Violations")
                    : t("governance.myViolations", "My Violations")}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {isAdmin
                    ? t(
                      "governance.teamViolationsBody",
                      "Inspect the latest rule failures with repository, file, line, and explanation details."
                    )
                    : t(
                      "governance.myViolationsBody",
                      "Use these file, line, and rule details to understand exactly what needs to be fixed."
                    )}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge variant="neutral">
                    {visibleViolationCount} {t("governance.violations", "Violations")}
                  </Badge>
                  <Badge variant="neutral">
                    {pollingFallbackCount} {t("governance.pollingFallback", "Background sync fallback")}
                  </Badge>
                  <button
                    type="button"
                    disabled={isPreparingRemediation || !recentViolations.length}
                    onClick={() =>
                      handlePrepareRemediation(
                        recentViolations[0]?.repository || repositories[0]?.id
                      )
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    {isPreparingRemediation
                      ? t("governance.preparing", "Preparing...")
                      : t("governance.prepareRemediationDraft", "Prepare AI fix draft")}
                  </button>
                </div>
                <div className="mt-5 flex flex-col gap-3">
                  {recentViolations.length ? (
                    recentViolations.slice(0, 10).map((violation) => (
                      <div key={violation._key} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">{violation.title}</p>
                            <p className="text-sm text-slate-500">{violation.repository_name}</p>
                          </div>
                          <Badge variant="warning">
                            {violation.severity || t("governance.unknownStatus", "Unknown")}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="neutral">
                            {violation.file_path || t("governance.repositoryLevel", "Repository level")}
                          </Badge>
                          {violation.line_number ? (
                            <Badge variant="neutral">
                              {t("governance.line", "Line")} {violation.line_number}
                            </Badge>
                          ) : null}
                          {violation.author_login ? (
                            <Badge variant="neutral">{violation.author_login}</Badge>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{violation.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      {t(
                        "governance.noViolationsVisible",
                        "No visible violations found yet."
                      )}
                    </div>
                  )}
                </div>
                {latestRemediationDraft ? (
                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-950">
                          {t("governance.remediationDraft", "AI Remediation Draft")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {latestRemediationDraft.repository_context?.repository}
                        </p>
                      </div>
                      <Badge variant="neutral">
                        {latestRemediationDraft.remediation_scope?.length || 0}{" "}
                        {t("governance.fixTargets", "fix targets")}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="neutral">
                        {t("governance.suggestedBranch", "Suggested branch")}{" "}
                        {latestRemediationDraft.suggested_branch_name}
                      </Badge>
                      <Badge variant="neutral">
                        {t("governance.score", "Score")}{" "}
                        {Math.round(Number(latestRemediationDraft.scan_score || 0))}
                      </Badge>
                    </div>
                    <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        {t("governance.fixScope", "Fix scope")}
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        {(latestRemediationDraft.remediation_scope || []).map((item) => (
                          <div
                            key={item.violation_id}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                          >
                            <p className="text-sm font-black text-slate-950">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {item.file_path ||
                                t("governance.repositoryLevel", "Repository level")}
                              {item.line_number ? `:${item.line_number}` : ""} - {item.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        {t("governance.userPrompt", "User Prompt")}
                      </p>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-700">
                        {latestRemediationDraft.user_prompt}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                  {leaderboardTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {overviewScope === "team"
                    ? t(
                      "governance.teamLeaderboardBody",
                      "Cross-repository contributor ranking based on scan, commit, and pull request quality."
                    )
                    : t(
                      "governance.myGovernanceScoreBody",
                      "Your visible score blends scan findings, commit quality, and pull request health."
                    )}
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  {leaderboard.length ? (
                    leaderboard.map((developer, index) => (
                      <div
                        key={developer.github_login || index}
                        className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">
                              {developer.display_name || developer.github_login}
                            </p>
                            <p className="text-sm text-slate-500">
                              {developer.github_login}
                            </p>
                          </div>
                          <Badge
                            variant={
                              Number(developer.composite_score || 0) >= 85
                                ? "success"
                                : "warning"
                            }
                          >
                            {t("governance.score", "Score")} {Math.round(Number(developer.composite_score || 0))}
                          </Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                          {[
                            [t("governance.commits", "Commits"), developer.commit_count || 0],
                            [t("governance.pullRequestsShort", "PRs"), developer.pull_request_count || 0],
                            [t("governance.mergedPullRequests", "Merged PRs"), developer.merged_pull_request_count || 0],
                            [t("governance.violations", "Violations"), developer.violation_count || 0],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                            >
                              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                {label}
                              </p>
                              <p className="mt-2 text-lg font-black text-slate-950">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      {leaderboardEmptyMessage}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                  {activityFeedTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {overviewScope === "team"
                    ? t(
                      "governance.teamActivityFeedBody",
                      "A live stream of recent contributor activity across connected repositories."
                    )
                    : t(
                      "governance.myActivityFeedBody",
                      "Only commits and pull requests authored by your connected GitHub account are shown here."
                    )}
                </p>
                <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">
                    {isAdmin
                      ? t("governance.recentTeamCommits", "Recent Team Commits")
                      : t("governance.myRecentCommits", "My Recent Commits")}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {recentCommitActivities.length ? (
                      recentCommitActivities.slice(0, 5).map((commit) => (
                        <div
                          key={commit.id}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-950">
                              {commit.message_title || commit.sha}
                            </p>
                            <Badge
                              variant={
                                Number(commit.quality_score || 0) >= 85
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {Math.round(Number(commit.quality_score || 0))}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                            {commit.author_login} - {commit.repository_name}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        {t("governance.noCommitActivity", "No commit activity synced yet.")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">
                    {isAdmin
                      ? t("governance.recentTeamPullRequests", "Recent Team Pull Requests")
                      : t("governance.myRecentPullRequests", "My Recent Pull Requests")}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {recentPullRequestActivities.length ? (
                      recentPullRequestActivities.slice(0, 5).map((pullRequest) => (
                        <div
                          key={pullRequest.id}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-950">
                              PR #{pullRequest.pull_number} - {pullRequest.title}
                            </p>
                            <Badge
                              variant={
                                Number(pullRequest.quality_score || 0) >= 85
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {Math.round(Number(pullRequest.quality_score || 0))}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                            {pullRequest.author_login} - {pullRequest.repository_name}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        {t(
                          "governance.noPullRequestActivity",
                          "No pull request activity synced yet."
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {false ? (
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                  {t("governance.aiOutputValidation", "AI Output Validation")}
                </h2>
                <form onSubmit={handleValidateAi} className="mt-5 flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <select
                      value={validationForm.repository_id}
                      onChange={(event) =>
                        setValidationForm((current) => ({ ...current, repository_id: event.target.value }))
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                    >
                      <option value="">{t("governance.noRepository", "No repository")}</option>
                      {repositories.map((repository) => (
                        <option key={repository.id} value={repository.id}>{repository.full_name}</option>
                      ))}
                    </select>
                    <select
                      value={validationForm.standard_profile_id}
                      onChange={(event) =>
                        setValidationForm((current) => ({ ...current, standard_profile_id: event.target.value }))
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                    >
                      <option value="">
                        {t("governance.useRepositoryProfile", "Use repository profile")}
                      </option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>{profile.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      value={validationForm.provider_name}
                      onChange={(event) =>
                        setValidationForm((current) => ({ ...current, provider_name: event.target.value }))
                      }
                      placeholder={t("governance.provider", "Provider")}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                    <input
                      value={validationForm.model_name}
                      onChange={(event) =>
                        setValidationForm((current) => ({ ...current, model_name: event.target.value }))
                      }
                      placeholder={t("governance.model", "Model")}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                  <input
                    value={validationForm.task_summary}
                    onChange={(event) =>
                      setValidationForm((current) => ({ ...current, task_summary: event.target.value }))
                    }
                    placeholder={t("governance.taskSummary", "Task summary")}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                  <textarea
                    value={validationForm.prompt}
                    onChange={(event) =>
                      setValidationForm((current) => ({ ...current, prompt: event.target.value }))
                    }
                    placeholder={t("governance.originalPrompt", "Original AI prompt")}
                    className="min-h-24 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                  <input
                    value={validationForm.file_path}
                    onChange={(event) =>
                      setValidationForm((current) => ({ ...current, file_path: event.target.value }))
                    }
                    placeholder={t("governance.generatedFilePath", "Generated file path")}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                  <textarea
                    value={validationForm.code}
                    onChange={(event) =>
                      setValidationForm((current) => ({ ...current, code: event.target.value }))
                    }
                    placeholder={t("governance.generatedCode", "Generated code")}
                    className="min-h-56 rounded-[24px] border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-sky-400"
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={handlePrepareAi}
                      disabled={isPreparingPrompt}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {isPreparingPrompt
                        ? t("governance.preparing", "Preparing...")
                        : t("governance.prepareStandardAiBrief", "Prepare standard AI brief")}
                    </button>
                    <button
                      type="submit"
                      disabled={isValidating}
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isValidating
                        ? t("governance.validating", "Validating...")
                        : t("governance.validateAiOutput", "Validate AI output")}
                    </button>
                  </div>
                  {latestPreparedBundle ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            {t("governance.standardizedAiBrief", "Standardized AI brief")}
                          </p>
                          <p className="text-sm text-slate-500">
                            {t(
                              "governance.standardizedAiBriefBody",
                              "Use this package before sending work to any model provider."
                            )}
                          </p>
                        </div>
                        <Badge variant="neutral">
                          {latestPreparedBundle.profile_name ||
                            t("governance.defaultProfile", "Default profile")}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="neutral">
                          {latestPreparedBundle.repository_context?.repository ||
                            t("governance.noRepositoryScope", "No repository scope")}
                        </Badge>
                        <Badge variant="neutral">
                          {overviewScope === "team"
                            ? t("governance.teamScope", "Team scope")
                            : t("governance.personalScope", "Personal scope")}
                        </Badge>
                      </div>
                      <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                          {t("governance.systemPrompt", "System Prompt")}
                        </p>
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-700">
                          {latestPreparedBundle.system_prompt}
                        </pre>
                      </div>
                      <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                          {t("governance.outputContract", "Output Contract")}
                        </p>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-700">
                          {JSON.stringify(latestPreparedBundle.output_contract || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : null}
                </form>
              </div>

              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                  {t("governance.latestAiResult", "Latest AI Result")}
                </h2>
                {latestValidation ? (
                  <div className="mt-5 flex flex-col gap-3">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-lg font-black text-slate-950">
                          {latestValidation.request?.provider_name || t("governance.ai", "AI")}
                        </p>
                        <Badge
                          variant={
                            latestValidation.validation_result?.status === "validated"
                              ? "success"
                              : "warning"
                          }
                        >
                          {getStatusLabel(latestValidation.validation_result?.status)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="neutral">
                          {t("governance.score", "Score")} {Math.round(Number(latestValidation.validation_result?.score || 0))}
                        </Badge>
                        <Badge variant="neutral">
                          {t("governance.violations", "Violations")} {latestValidation.validation_result?.violation_count || 0}
                        </Badge>
                      </div>
                    </div>
                    {(latestValidation.evaluation?.violations || []).length ? (
                      latestValidation.evaluation.violations.map((violation, index) => (
                        <div key={`${violation.code}-${index}`} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-black text-slate-950">{violation.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{violation.message}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                            {violation.file_path ||
                              t("governance.repositoryLevel", "Repository level")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        {t(
                          "governance.validationPassedWithoutFindings",
                          "Validation passed without findings."
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    {t(
                      "governance.submitGeneratedCode",
                      "Submit generated code to see validation results here."
                    )}
                  </div>
                )}
                <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">
                    {t("governance.recentAiRequests", "Recent AI Requests")}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {aiRequests.length ? (
                      aiRequests.slice(0, 5).map((request) => (
                        <div key={request.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                          <span className="text-sm text-slate-700">
                            {request.provider_name || t("governance.ai", "AI")}
                          </span>
                          <Badge variant="neutral">
                            {getStatusLabel(request.validation_status)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        {t(
                          "governance.noAiValidationRequest",
                          "No AI validation request yet."
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GithubGovernance;
