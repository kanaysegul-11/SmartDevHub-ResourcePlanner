import React, { useEffect, useMemo, useState } from "react";
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

  const [githubToken, setGithubToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
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
  const [developerOverview, setDeveloperOverview] = useState({
    leaderboard: [],
    recent_commits: [],
    recent_pull_requests: [],
    scope: "self",
  });

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
  const overviewScope = developerOverview.scope || (isAdmin ? "team" : "self");
  const visibilityMessage = isAdmin
    ? "Admins can review team-wide rankings, contributor activity, and shared repository compliance."
    : "Developers can manage connected repositories, but only see their own score, personal activity, and AI validation history.";
  const leaderboardTitle = isAdmin ? "Developer Leaderboard" : "My Governance Score";
  const activityFeedTitle = isAdmin ? "Team Commit & PR Feed" : "My Commit & PR Feed";
  const leaderboardEmptyMessage = isAdmin
    ? "Run repository activity sync or scan to build the team leaderboard."
    : "Sync activity or run a scan to build your personal governance score.";

  const refreshAll = async () => {
    const [, , , , , overviewResponse] = await Promise.all([
      accountsQuery.refetch?.(),
      repositoriesQuery.refetch?.(),
      scansQuery.refetch?.(),
      profilesQuery.refetch?.(),
      aiRequestsQuery.refetch?.(),
      apiClient.get("/github-repositories/developer-overview/").catch(() => null),
    ]);
    if (overviewResponse?.data) {
      setDeveloperOverview(overviewResponse.data);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadDeveloperOverview = async () => {
      try {
        const response = await apiClient.get("/github-repositories/developer-overview/");
        if (!ignore) {
          setDeveloperOverview(response.data);
        }
      } catch {
        if (!ignore) {
          setDeveloperOverview({
            leaderboard: [],
            recent_commits: [],
            recent_pull_requests: [],
            scope: "self",
          });
        }
      }
    };

    void loadDeveloperOverview();
    return () => {
      ignore = true;
    };
  }, []);

  const handleConnectGithub = async (event) => {
    event.preventDefault();
    if (!githubToken.trim()) {
      window.alert("GitHub access token is required.");
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
      window.alert(error?.response?.data?.detail || "GitHub connection failed.");
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
      window.alert(error?.response?.data?.detail || "Starter profile could not be created.");
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleScanRepository = async (repositoryId) => {
    setActiveScanId(repositoryId);
    try {
      await apiClient.post(`/github-repositories/${repositoryId}/scan/`);
      await refreshAll();
    } catch (error) {
      window.alert(error?.response?.data?.detail || "Repository scan failed.");
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
      window.alert(error?.response?.data?.detail || "Repository activity sync failed.");
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
      window.alert(error?.response?.data?.detail || "AI validation failed.");
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
      window.alert(error?.response?.data?.detail || "AI brief could not be prepared.");
    } finally {
      setIsPreparingPrompt(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="governance" logoClickable={true} />
      <div className="relative flex grow flex-col overflow-y-auto pb-10">
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
                {isAdmin ? "Admin view" : "Developer view"}
              </Badge>
            }
          />

          <div className="grid grid-cols-1 gap-6 px-6 md:px-8 xl:px-10">
            <section className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
              <Badge variant="neutral" icon={<FeatherZap />}>
                GitHub Standards & AI Validation
              </Badge>
              <h1 className="mt-4 font-['Newsreader'] text-4xl font-medium tracking-tight text-slate-950">
                Manage repository standards, developer quality, and AI code validation.
              </h1>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
                {[
                  ["Accounts", accounts.length],
                  ["Repositories", repositories.length],
                  ["Profiles", profiles.length],
                  ["Scans", scans.length],
                  ["Avg Score", averageRepoScore],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Visibility Policy
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {visibilityMessage}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <div className="flex items-center justify-between">
                  <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">Connect GitHub</h2>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={handleCreateStarterProfile}
                      disabled={isCreatingProfile}
                      className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isCreatingProfile ? "Creating..." : "Create starter profile"}
                    </button>
                  ) : (
                    <Badge variant="neutral">Profiles managed by admins</Badge>
                  )}
                </div>
                <form onSubmit={handleConnectGithub} className="mt-5 flex flex-col gap-3">
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(event) => setGithubToken(event.target.value)}
                    placeholder="GitHub personal access token"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {isConnecting ? "Connecting..." : "Connect account"}
                  </button>
                </form>
                <div className="mt-5 flex flex-col gap-3">
                  {accounts.length ? (
                    accounts.map((account) => (
                      <div key={account.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-lg font-black text-slate-950">{account.github_username}</p>
                        <p className="text-sm text-slate-500">{account.masked_token}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      No GitHub account connected yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">Standard Profiles</h2>
                <div className="mt-5 flex flex-col gap-3">
                  {profiles.length ? (
                    profiles.map((profile) => (
                      <div key={profile.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">{profile.name}</p>
                            <p className="text-sm text-slate-500">{profile.description || "No description"}</p>
                          </div>
                          <Badge variant={profile.is_default ? "success" : "neutral"}>
                            {profile.active_rule_count || 0} rules
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      No standard profiles available.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">Repositories</h2>
                <div className="mt-5 flex flex-col gap-3">
                  {repositories.length ? (
                    repositories.map((repository) => (
                      <div key={repository.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-lg font-black text-slate-950">{repository.full_name}</p>
                            <p className="text-sm text-slate-500">{repository.primary_language || "Unknown language"}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {repository.latest_score ? (
                                <Badge variant={Number(repository.latest_score) >= 85 ? "success" : "warning"}>
                                  Score {Math.round(Number(repository.latest_score))}
                                </Badge>
                              ) : null}
                              <Badge variant="neutral">
                                {repository.standard_profile_details?.name || "No profile"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => handleSyncActivity(repository.id)}
                              disabled={activeSyncId === repository.id}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                            >
                              {activeSyncId === repository.id ? "Syncing..." : "Sync activity"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleScanRepository(repository.id)}
                              disabled={activeScanId === repository.id}
                              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                            >
                              {activeScanId === repository.id ? "Scanning..." : "Run scan"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      Connect GitHub first to load repositories.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">Recent Scans</h2>
                <div className="mt-5 flex flex-col gap-3">
                  {scans.length ? (
                    scans.slice(0, 5).map((scan) => (
                      <div key={scan.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-950">{scan.repository_name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{scan.status}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="neutral">Violations {scan.violation_count || 0}</Badge>
                          <Badge variant="neutral">
                            {isAdmin ? `Developers ${scan.developer_count || 0}` : "Personal visibility"}
                          </Badge>
                          <Badge variant={Number(scan.score || 0) >= 85 ? "success" : "warning"}>
                            Score {Math.round(Number(scan.score || 0))}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      No scan has been completed yet.
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
                    ? "Cross-repository contributor ranking based on scan, commit, and pull request quality."
                    : "Your visible score blends scan findings, commit quality, and pull request health."}
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
                            Score {Math.round(Number(developer.composite_score || 0))}
                          </Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                          {[
                            ["Commits", developer.commit_count || 0],
                            ["PRs", developer.pull_request_count || 0],
                            ["Merged PRs", developer.merged_pull_request_count || 0],
                            ["Violations", developer.violation_count || 0],
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
                    ? "A live stream of recent contributor activity across connected repositories."
                    : "Only commits and pull requests authored by your connected GitHub account are shown here."}
                </p>
                <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">
                    {isAdmin ? "Recent Team Commits" : "My Recent Commits"}
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
                            {commit.author_login} • {commit.repository_name}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No commit activity synced yet.</p>
                    )}
                  </div>
                </div>
                <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">
                    {isAdmin ? "Recent Team Pull Requests" : "My Recent Pull Requests"}
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
                              PR #{pullRequest.pull_number} • {pullRequest.title}
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
                            {pullRequest.author_login} • {pullRequest.repository_name}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No pull request activity synced yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">AI Output Validation</h2>
                <form onSubmit={handleValidateAi} className="mt-5 flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <select
                      value={validationForm.repository_id}
                      onChange={(event) =>
                        setValidationForm((current) => ({ ...current, repository_id: event.target.value }))
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                    >
                      <option value="">No repository</option>
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
                      <option value="">Use repository profile</option>
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
                      placeholder="Provider"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                    <input
                      value={validationForm.model_name}
                      onChange={(event) =>
                        setValidationForm((current) => ({ ...current, model_name: event.target.value }))
                      }
                      placeholder="Model"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                  <input
                    value={validationForm.task_summary}
                    onChange={(event) =>
                      setValidationForm((current) => ({ ...current, task_summary: event.target.value }))
                    }
                    placeholder="Task summary"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                  <textarea
                    value={validationForm.prompt}
                    onChange={(event) =>
                      setValidationForm((current) => ({ ...current, prompt: event.target.value }))
                    }
                    placeholder="Original AI prompt"
                    className="min-h-24 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                  <input
                    value={validationForm.file_path}
                    onChange={(event) =>
                      setValidationForm((current) => ({ ...current, file_path: event.target.value }))
                    }
                    placeholder="Generated file path"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                  <textarea
                    value={validationForm.code}
                    onChange={(event) =>
                      setValidationForm((current) => ({ ...current, code: event.target.value }))
                    }
                    placeholder="Generated code"
                    className="min-h-56 rounded-[24px] border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-sky-400"
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={handlePrepareAi}
                      disabled={isPreparingPrompt}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {isPreparingPrompt ? "Preparing..." : "Prepare standard AI brief"}
                    </button>
                    <button
                      type="submit"
                      disabled={isValidating}
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isValidating ? "Validating..." : "Validate AI output"}
                    </button>
                  </div>
                  {latestPreparedBundle ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            Standardized AI brief
                          </p>
                          <p className="text-sm text-slate-500">
                            Use this package before sending work to any model provider.
                          </p>
                        </div>
                        <Badge variant="neutral">
                          {latestPreparedBundle.profile_name || "Default profile"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="neutral">
                          {latestPreparedBundle.repository_context?.repository || "No repository scope"}
                        </Badge>
                        <Badge variant="neutral">
                          {overviewScope === "team" ? "Team scope" : "Personal scope"}
                        </Badge>
                      </div>
                      <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                          System Prompt
                        </p>
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-700">
                          {latestPreparedBundle.system_prompt}
                        </pre>
                      </div>
                      <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                          Output Contract
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
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">Latest AI Result</h2>
                {latestValidation ? (
                  <div className="mt-5 flex flex-col gap-3">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-lg font-black text-slate-950">
                          {latestValidation.request?.provider_name || "AI"}
                        </p>
                        <Badge
                          variant={
                            latestValidation.validation_result?.status === "validated"
                              ? "success"
                              : "warning"
                          }
                        >
                          {latestValidation.validation_result?.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="neutral">
                          Score {Math.round(Number(latestValidation.validation_result?.score || 0))}
                        </Badge>
                        <Badge variant="neutral">
                          Violations {latestValidation.validation_result?.violation_count || 0}
                        </Badge>
                      </div>
                    </div>
                    {(latestValidation.evaluation?.violations || []).length ? (
                      latestValidation.evaluation.violations.map((violation, index) => (
                        <div key={`${violation.code}-${index}`} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-black text-slate-950">{violation.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{violation.message}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                            {violation.file_path || "Repository level"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        Validation passed without findings.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    Submit generated code to see validation results here.
                  </div>
                )}
                <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">Recent AI Requests</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {aiRequests.length ? (
                      aiRequests.slice(0, 5).map((request) => (
                        <div key={request.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                          <span className="text-sm text-slate-700">{request.provider_name || "AI"}</span>
                          <Badge variant="neutral">{request.validation_status}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No AI validation request yet.</p>
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
