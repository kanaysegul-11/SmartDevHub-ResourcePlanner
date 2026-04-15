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
  const [activeSyncId, setActiveSyncId] = useState(null);
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
    [t("governance.accounts", "Accounts"), accounts.length],
    [t("governance.repositories", "Repositories"), repositories.length],
    [t("governance.profiles", "Profiles"), profiles.length],
    [t("governance.scans", "Scans"), scans.length],
    [t("governance.avgScore", "Avg Score"), averageRepoScore],
  ];

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
    if (["completed", "validated", "active", "created"].includes(statusKey)) {
      return "success";
    }
    if (["queued", "running"].includes(statusKey)) {
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

  const handleSyncActivity = async (repositoryId) => {
    setActiveSyncId(repositoryId);
    try {
      await apiClient.post(`/github-repositories/${repositoryId}/sync-activity/`);
      await refreshAll();
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
        t(
          "governance.repositorySyncFailed",
          "Repository activity sync failed."
        )
      );
    } finally {
      setActiveSyncId(null);
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
              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {t("governance.visibilityPolicy", "Visibility Policy")}
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {visibilityMessage}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <div className="flex items-center justify-between">
                  <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                    {t("governance.connectGithub", "Connect GitHub")}
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
                      {t(
                        "governance.profilesManagedByAdmins",
                        "Profiles managed by admins"
                      )}
                    </Badge>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {t(
                    "governance.oauthBody",
                    "Use OAuth for a production-style account link, then keep personal access token support as a fallback."
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
                          {t("governance.autoSyncMode", "Auto-sync")}
                          {" "}
                          {integrationStatus?.auto_sync_mode === "background_thread"
                            ? t("governance.backgroundThread", "background thread")
                            : integrationStatus?.auto_sync_mode ||
                              t("governance.backgroundThread", "background thread")}
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
                            {t(
                              "governance.oauthRedirectUri",
                              "OAuth redirect URI"
                            )}
                            :{" "}
                            <span className="break-all text-slate-700">
                              {integrationStatus?.oauth_redirect_uri ||
                                t(
                                  "governance.notConfiguredYet",
                                  "Not configured yet"
                                )}
                            </span>
                          </p>
                          <p className="mt-2">
                            {t(
                              "governance.webhookTargetUrl",
                              "Webhook target URL"
                            )}
                            :{" "}
                            <span className="break-all text-slate-700">
                              {integrationStatus?.webhook_target_url ||
                                t(
                                  "governance.notConfiguredYet",
                                  "Not configured yet"
                                )}
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

              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                  {t("governance.standardProfiles", "Standard Profiles")}
                </h2>
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
                <div className="mt-5 flex flex-col gap-3">
                  {repositories.length ? (
                    repositories.map((repository) => (
                      <div key={repository.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-lg font-black text-slate-950">{repository.full_name}</p>
                            <p className="text-sm text-slate-500">
                              {repository.primary_language ||
                                t("governance.unknownLanguage", "Unknown language")}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {repository.latest_score ? (
                                <Badge variant={Number(repository.latest_score) >= 85 ? "success" : "warning"}>
                                  {t("governance.score", "Score")} {Math.round(Number(repository.latest_score))}
                                </Badge>
                              ) : null}
                              <Badge variant="neutral">
                                {repository.standard_profile_details?.name ||
                                  t("governance.noProfile", "No profile")}
                              </Badge>
                              {repository.metadata?.webhook?.status ? (
                                <Badge
                                  variant={getStatusVariant(repository.metadata.webhook.status)}
                                >
                                  {t("governance.webhook", "Webhook")}{" "}
                                  {getStatusLabel(repository.metadata.webhook.status)}
                                </Badge>
                              ) : null}
                              {repository.metadata?.auto_sync?.status ? (
                                <Badge
                                  variant={getStatusVariant(repository.metadata.auto_sync.status)}
                                >
                                  {t("governance.autoSync", "Auto-sync")}{" "}
                                  {getStatusLabel(repository.metadata.auto_sync.status)}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                              {t("governance.lastSynced", "Last synced")}{" "}
                              {formatTimestamp(repository.last_synced_at)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => handleSyncActivity(repository.id)}
                              disabled={activeSyncId === repository.id}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                            >
                              {activeSyncId === repository.id
                                ? t("governance.syncing", "Syncing...")
                                : t("governance.syncActivity", "Sync activity")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleScanRepository(repository.id)}
                              disabled={activeScanId === repository.id}
                              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                            >
                              {activeScanId === repository.id
                                ? t("governance.scanning", "Scanning...")
                                : t("governance.runScan", "Run scan")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default GithubGovernance;
