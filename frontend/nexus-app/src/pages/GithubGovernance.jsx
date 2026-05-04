import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useList } from "@refinedev/core";
import { FeatherBookOpen, FeatherShield, FeatherSparkles, FeatherZap } from "@subframe/core";
import { Link } from "react-router-dom";

import Sidebar from "../component/layout/Sidebar";
import { useI18n } from "../I18nContext.jsx";
import { useUser } from "../UserContext.jsx";
import { apiClient } from "../refine/axios";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import {
  getLatestRepositoryScan,
  summarizeViolationsByRule,
} from "../utils/governanceViolations";

const EMPTY_ARRAY = [];
const showAiValidationPanel =
  import.meta.env.VITE_SHOW_AI_VALIDATION_PANEL === "true";
const GOVERNANCE_LIST_PAGE_SIZE = 200;
const EMPTY_DEVELOPER_ACTIVITY = {
  recent_commits: [],
};

function GithubGovernance() {
  const { userData } = useUser();
  const { t } = useI18n();
  const isAdmin = Boolean(userData?.isAdmin);
  const sharedQueryOptions = {
    pagination: {
      current: 1,
      pageSize: GOVERNANCE_LIST_PAGE_SIZE,
    },
    queryOptions: {
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  };
  const accountsQuery = useList({
    resource: "github-accounts",
    ...sharedQueryOptions,
    filters: isAdmin
      ? [{ field: "scope", operator: "eq", value: "team" }]
      : undefined,
  });
  const repositoriesQuery = useList({
    resource: "github-repositories",
    ...sharedQueryOptions,
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "full_name", order: "asc" }],
  });
  const scansQuery = useList({
    resource: "repository-scans",
    ...sharedQueryOptions,
    sorters: [{ field: "created_at", order: "desc" }],
  });
  const profilesQuery = useList({
    resource: "standard-profiles",
    ...sharedQueryOptions,
  });
  const aiRequestsQuery = useList({
    resource: "ai-code-requests",
    ...sharedQueryOptions,
    sorters: [{ field: "created_at", order: "desc" }],
  });
  const refetchAccounts = accountsQuery.refetch;
  const refetchRepositories = repositoriesQuery.refetch;
  const refetchScans = scansQuery.refetch;
  const refetchProfiles = profilesQuery.refetch;
  const refetchAiRequests = aiRequestsQuery.refetch;

  const accounts = accountsQuery.data?.data ?? EMPTY_ARRAY;
  const repositories = repositoriesQuery.data?.data ?? EMPTY_ARRAY;
  const scans = scansQuery.data?.data ?? EMPTY_ARRAY;
  const profiles = profilesQuery.data?.data ?? EMPTY_ARRAY;
  const aiRequests = aiRequestsQuery.data?.data ?? EMPTY_ARRAY;
  const currentUserId = Number(userData?.id || userData?.pk || userData?.user_id || 0);
  const hasConnectedGithubAccount = accounts.length > 0;

  const [githubToken, setGithubToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState(null);
  const [disconnectingAccountId, setDisconnectingAccountId] = useState(null);
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
  const [developerActivity, setDeveloperActivity] = useState(
    EMPTY_DEVELOPER_ACTIVITY
  );
  const [isDeveloperActivityLoading, setIsDeveloperActivityLoading] = useState(false);
  const oauthCallbackHandledRef = useRef(false);
  const isOwnRepository = useCallback(
    (repository) =>
      Boolean(currentUserId && Number(repository?.account_user) === currentUserId),
    [currentUserId]
  );
  const canUseAiForRepository = useCallback(
    (repository) => Boolean(repository && (!isAdmin || isOwnRepository(repository))),
    [isAdmin, isOwnRepository]
  );
  const canDisconnectGithubAccount = useCallback(
    (account) => Boolean(account && (!isAdmin || Number(account.user) === currentUserId)),
    [isAdmin, currentUserId]
  );
  const aiAccessibleRepositories = useMemo(
    () =>
      repositories.filter((repository) =>
        canUseAiForRepository(repository)
      ),
    [repositories, canUseAiForRepository]
  );
  const canShowLatestRemediationDraft = useMemo(() => {
    if (!latestRemediationDraft) {
      return false;
    }
    if (!isAdmin) {
      return true;
    }
    const draftRepositoryName = latestRemediationDraft.repository_context?.repository;
    return aiAccessibleRepositories.some(
      (repository) => repository.full_name === draftRepositoryName
    );
  }, [latestRemediationDraft, isAdmin, aiAccessibleRepositories]);

  const averageRepoScore = useMemo(() => {
    const scores = repositories
      .map((repository) => Number(repository.latest_score))
      .filter((score) => Number.isFinite(score));
    if (!scores.length) {
      return 0;
    }
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [repositories]);
  const sortedRepositories = useMemo(
    () =>
      [...repositories].sort((left, right) =>
        String(left?.full_name || "").localeCompare(String(right?.full_name || ""))
      ),
    [repositories]
  );
  const personalAccountCount = accounts.length;
  const teamAccountCount = useMemo(() => {
    if (!isAdmin) {
      return personalAccountCount;
    }
    return new Set(repositories.map((repository) => repository.account)).size;
  }, [isAdmin, personalAccountCount, repositories]);
  const recentViolations = useMemo(
    () =>
      repositories.flatMap((repository) => {
        const repositoryScans = scans.filter(
          (scan) => Number(scan.repository) === Number(repository.id)
        );
        const latestScan = getLatestRepositoryScan(repositoryScans);
        return (latestScan?.violations || []).map((violation, index) => ({
          ...violation,
          _key: `${latestScan.id}-${violation.id || index}`,
          repository_name: latestScan.repository_name,
          scan_score: latestScan.score,
          scan_created_at: latestScan.created_at,
        }));
      }).sort((left, right) => {
        const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
        return (
          (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0) ||
          new Date(right.scan_created_at || 0) - new Date(left.scan_created_at || 0)
        );
      }),
    [repositories, scans]
  );
  const repositoryViolationSummaries = useMemo(
    () =>
      repositories
        .map((repository) => {
          const repositoryScans = scans.filter(
            (scan) => Number(scan.repository) === Number(repository.id)
          );
          const latestScan = getLatestRepositoryScan(repositoryScans);
          const violations = latestScan?.violations || [];
          return {
            repository,
            latestScan,
            violations,
            violationCount: Math.max(
              violations.length,
              Number(latestScan?.violation_count || 0)
            ),
            ruleSummary: summarizeViolationsByRule(violations),
          };
        })
        .filter((item) => item.violationCount > 0)
        .sort(
          (left, right) =>
            right.violationCount - left.violationCount ||
            left.repository.full_name.localeCompare(right.repository.full_name)
        ),
    [repositories, scans]
  );
  const firstRepositoryWithViolations = repositoryViolationSummaries[0]?.repository || null;
  const visibleViolationCount = useMemo(
    () =>
      repositories.reduce((total, repository) => {
        const repositoryScans = scans.filter(
          (scan) => Number(scan.repository) === Number(repository.id)
        );
        const latestScan = getLatestRepositoryScan(repositoryScans);
        return total + Math.max(
          latestScan?.violations?.length || 0,
          Number(latestScan?.violation_count || 0)
        );
      }, 0),
    [repositories, scans]
  );
  const latestScanByRepositoryId = useMemo(() => {
    const scanMap = new Map();
    scans.forEach((scan) => {
      const repositoryId = scan.repository;
      if (!repositoryId || scanMap.has(repositoryId)) {
        return;
      }
      scanMap.set(repositoryId, scan);
    });
    return scanMap;
  }, [scans]);
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
  const overviewScope = isAdmin ? "team" : "self";
  const visibilityMessage = isAdmin
    ? t(
      "governance.visibilityAdminBody",
      "Admins can review team-wide rankings, contributor activity, and shared repository compliance."
    )
    : t(
      "governance.visibilityDeveloperBody",
      "Developers can manage connected repositories, but only see their own score, personal activity, and AI validation history."
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
  const recentCommitRows = useMemo(
    () => (developerActivity.recent_commits || []).slice(0, 5),
    [developerActivity]
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

  const formatCommitTimestamp = (value) => {
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

  const getScoreState = (repository) => {
    const score = Number(repository.latest_score);
    if (!Number.isFinite(score)) {
      return {
        label: t("governance.awaitingFirstScore", "Awaiting first score"),
        detail: t("governance.scoreNotReady", "Scan has not produced a score yet."),
        variant: "neutral",
      };
    }

    if (score <= 0) {
      return {
        label: "0 / 100",
        detail: t(
          "governance.zeroScoreExplanation",
          "Scored, but critical rule debt dropped this repository to zero."
        ),
        variant: "warning",
      };
    }

    if (score < 70) {
      return {
        label: `${Math.round(score)} / 100`,
        detail: t("governance.lowScoreExplanation", "Needs standard fixes."),
        variant: "warning",
      };
    }

    return {
      label: `${Math.round(score)} / 100`,
      detail: t("governance.scoredRepository", "Scored repository."),
      variant: score >= 85 ? "success" : "neutral",
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

  const refreshAll = useCallback(async () => {
    const [, , , , , integrationResponse] = await Promise.all([
      refetchAccounts?.(),
      refetchRepositories?.(),
      refetchScans?.(),
      refetchProfiles?.(),
      refetchAiRequests?.(),
      apiClient.get("/github-accounts/integration-status/").catch(() => null),
    ]);
    if (integrationResponse?.data) {
      setIntegrationStatus(integrationResponse.data);
    }
  }, [
    refetchAccounts,
    refetchRepositories,
    refetchScans,
    refetchProfiles,
    refetchAiRequests,
  ]);

  useEffect(() => {
    let ignore = false;

    const loadGovernanceMeta = async () => {
      try {
        const integrationResponse = await apiClient.get(
          "/github-accounts/integration-status/"
        );
        if (!ignore) {
          setIntegrationStatus(integrationResponse.data);
        }
      } catch {
        if (!ignore) {
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

    if (isAdmin || !hasConnectedGithubAccount) {
      setDeveloperActivity(EMPTY_DEVELOPER_ACTIVITY);
      setIsDeveloperActivityLoading(false);
      return undefined;
    }

    const loadDeveloperActivity = async () => {
      setIsDeveloperActivityLoading(true);
      try {
        const response = await apiClient.get("/github-repositories/developer-overview/");
        if (!ignore) {
          setDeveloperActivity(response.data || EMPTY_DEVELOPER_ACTIVITY);
        }
      } catch {
        if (!ignore) {
          setDeveloperActivity(EMPTY_DEVELOPER_ACTIVITY);
        }
      } finally {
        if (!ignore) {
          setIsDeveloperActivityLoading(false);
        }
      }
    };

    void loadDeveloperActivity();
    return () => {
      ignore = true;
    };
  }, [isAdmin, hasConnectedGithubAccount]);

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
  }, [hasConnectedGithubAccount, hasBackgroundRefreshWork, refreshAll]);

  useEffect(() => {
    const handleGovernanceSyncRequested = () => {
      void refreshAll();
      if (!isAdmin && hasConnectedGithubAccount) {
        void apiClient
          .get("/github-repositories/developer-overview/")
          .then((response) => {
            setDeveloperActivity(response.data || EMPTY_DEVELOPER_ACTIVITY);
          })
          .catch(() => {
            setDeveloperActivity(EMPTY_DEVELOPER_ACTIVITY);
          });
      }
    };

    window.addEventListener(
      "governance-sync-requested",
      handleGovernanceSyncRequested
    );

    return () => {
      window.removeEventListener(
        "governance-sync-requested",
        handleGovernanceSyncRequested
      );
    };
  }, [refreshAll, isAdmin, hasConnectedGithubAccount]);

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
  }, [t, refreshAll]);

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

  const handleSyncAccountRepositories = async (accountId) => {
    if (!accountId) {
      return;
    }

    setSyncingAccountId(accountId);
    try {
      await apiClient.post(`/github-accounts/${accountId}/sync-repositories/`);
      await refreshAll();
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
          t("governance.repositorySyncFailed", "Repository sync failed.")
      );
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleDisconnectGithubAccount = async (account) => {
    if (!account?.id || !canDisconnectGithubAccount(account)) {
      return;
    }

    const confirmed = window.confirm(
      t(
        "governance.disconnectGithubConfirm",
        "Disconnect this GitHub account from your profile? You can connect a different GitHub account afterwards."
      )
    );
    if (!confirmed) {
      return;
    }

    setDisconnectingAccountId(account.id);
    try {
      await apiClient.delete(`/github-accounts/${account.id}/`);
      setLatestRemediationDraft(null);
      setLatestPreparedBundle(null);
      await refreshAll();
      window.alert(
        t(
          "governance.disconnectGithubSuccess",
          "GitHub account disconnected. You can now connect another account."
        )
      );
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
          t(
            "governance.disconnectGithubFailed",
            "GitHub account could not be disconnected."
          )
      );
    } finally {
      setDisconnectingAccountId(null);
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

    const selectedRepository = repositories.find(
      (repository) => Number(repository.id) === Number(repositoryId)
    );
    if (!canUseAiForRepository(selectedRepository)) {
      window.alert(
        t(
          "governance.aiOnlyOwnRepositories",
          "AI fixes are only available for repositories connected to your own GitHub account."
        )
      );
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
    <div className="app-shell flex bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="governance" logoClickable={true} />
      <div className="app-shell__main relative flex flex-col items-start pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex min-w-0 w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={<FeatherShield />}>
                {t("governance.workspace", "Code Governance")}
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
                  to="/github-governance/ai-prompts"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  <FeatherSparkles size={16} />
                  AI Prompt Rehberi
                </Link>
                <Badge variant={isAdmin ? "success" : "neutral"}>
                  {roleViewLabel}
                </Badge>
              </div>
            }
          />

          <div className="grid min-w-0 grid-cols-1 gap-6 px-6 md:px-8 xl:px-10">
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
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="neutral">
                                {t("governance.repositories", "Repositories")} {account.repository_count || 0}
                              </Badge>
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSyncAccountRepositories(account.id)}
                                  disabled={syncingAccountId === account.id}
                                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {syncingAccountId === account.id
                                    ? t("governance.syncing", "Syncing...")
                                    : t("governance.syncRepositories", "Sync repositories")}
                                </button>
                                {canDisconnectGithubAccount(account) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDisconnectGithubAccount(account)}
                                    disabled={disconnectingAccountId === account.id}
                                    className="rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {disconnectingAccountId === account.id
                                      ? t("governance.disconnectingGithub", "Disconnecting...")
                                      : t("governance.disconnectGithub", "Disconnect")}
                                  </button>
                                ) : null}
                              </div>
                            </div>
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

            {!isAdmin ? (
              <section className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      {t("governance.latestCommits", "Latest commits")}
                    </p>
                    <h2 className="mt-3 font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                      {t("governance.latestCommitsTitle", "Your last 5 GitHub commits")}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {t(
                        "governance.latestCommitsBody",
                        "Review your most recent commit activity from the GitHub account connected to this workspace. This list is informational only and does not affect repository scores."
                      )}
                    </p>
                  </div>
                  <Badge variant="neutral">
                    {t("governance.latestCommitCount", "{{count}} commits").replace(
                      "{{count}}",
                      String(recentCommitRows.length)
                    )}
                  </Badge>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  {isDeveloperActivityLoading ? (
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      {t("governance.loadingRecentCommits", "Loading recent commits...")}
                    </div>
                  ) : recentCommitRows.length ? (
                    recentCommitRows.map((commit) => (
                      <a
                        key={commit.id || commit.sha}
                        href={commit.commit_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-[0_18px_40px_rgba(148,163,184,0.16)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-black text-slate-950">
                              {commit.message_title || t("governance.noDescription", "No description")}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                              {commit.repository_name || "-"}
                            </p>
                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                              {commit.message_body ||
                                t(
                                  "governance.commitNoBody",
                                  "No additional commit description."
                                )}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <Badge variant="neutral">
                              {t("governance.informationalOnly", "Informational only")}
                            </Badge>
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {(commit.sha || "").slice(0, 7)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                          <span>{commit.author_name || commit.author_login || "-"}</span>
                          <span>
                            {formatCommitTimestamp(
                              commit.committed_at || commit.created_at
                            )}
                          </span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      {hasConnectedGithubAccount
                        ? t(
                            "governance.noRecentCommits",
                            "No recent commit activity was found for your connected GitHub account yet."
                          )
                        : t(
                            "governance.connectGithubFirstForCommits",
                            "Connect your GitHub account first to list your recent commits."
                          )}
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0 rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
                <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                  {t("governance.repositories", "Repositories")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isAdmin
                    ? t(
                      "governance.repositoriesAdminBody",
                      "Admin list shows every synced team repository with just the repository name, visible rule violation count, and score impact."
                    )
                    : t(
                      "governance.repositoriesBody",
                      "Connected repositories are watched automatically. The table below shows the current monitoring state, latest score, and refresh times."
                    )}
                </p>
                {accounts.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {accounts.map((account) => (
                      <div key={account.id} className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSyncAccountRepositories(account.id)}
                          disabled={syncingAccountId === account.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {syncingAccountId === account.id
                            ? t("governance.syncing", "Syncing...")
                            : `${account.github_username} ${t("governance.syncRepositories", "Sync repositories")}`}
                        </button>
                        {canDisconnectGithubAccount(account) ? (
                          <button
                            type="button"
                            onClick={() => handleDisconnectGithubAccount(account)}
                            disabled={disconnectingAccountId === account.id}
                            className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {disconnectingAccountId === account.id
                              ? t("governance.disconnectingGithub", "Disconnecting...")
                              : `${account.github_username} ${t("governance.disconnectGithub", "Disconnect")}`}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-5 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50">
                  {repositories.length ? (
                    <>
                      {isAdmin ? (
                        <>
                          <div className="hidden grid-cols-[minmax(0,2fr)_120px_120px] gap-3 border-b border-slate-200 bg-white/70 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 md:grid">
                            <span>{t("governance.repositoryColumn", "Repository")}</span>
                            <span>{t("governance.violationsColumn", "Violations")}</span>
                            <span>{t("governance.scoreColumn", "Score")}</span>
                          </div>
                          {sortedRepositories.map((repository) => {
                            const latestScan = latestScanByRepositoryId.get(repository.id);
                            const violationCount = Math.max(
                              Number(latestScan?.violation_count || 0),
                              latestScan?.violations?.length || 0
                            );
                            const scoreState = getScoreState(repository);
                            return (
                              <div
                                key={repository.id}
                                className="grid min-w-0 gap-3 border-t border-slate-200 px-4 py-4 first:border-t-0 md:grid-cols-[minmax(0,2fr)_120px_120px] md:items-center"
                              >
                                <div className="min-w-0">
                                  <p className="break-words text-lg font-black text-slate-950">
                                    {repository.full_name}
                                  </p>
                                </div>
                                <div>
                                  <Badge variant={violationCount > 0 ? "warning" : "success"}>
                                    {violationCount}
                                  </Badge>
                                </div>
                                <div>
                                  <Badge variant={scoreState.variant}>
                                    {scoreState.label}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(130px,0.8fr)_minmax(90px,0.55fr)_minmax(130px,0.8fr)_minmax(150px,0.9fr)_auto] gap-3 border-b border-slate-200 bg-white/70 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 md:grid">
                            <span>{t("governance.repositoryColumn", "Repository")}</span>
                            <span>{t("governance.monitoringColumn", "Monitoring")}</span>
                            <span>{t("governance.scoreColumn", "Score")}</span>
                            <span>{t("governance.profileColumn", "Profile")}</span>
                            <span>{t("governance.lastUpdateColumn", "Last update")}</span>
                            <span>{t("governance.actionColumn", "Action")}</span>
                          </div>
                          {sortedRepositories.map((repository) => {
                            const monitoringState = getRepositoryMonitoringState(repository);
                            const activityHealthState = getActivityHealthState(repository);
                            const scoreState = getScoreState(repository);
                            const latestScan = latestScanByRepositoryId.get(repository.id);
                            const ruleBreakdown = latestScan?.summary?.rule_breakdown || {};
                            const topRule = Object.entries(ruleBreakdown).sort(
                              (left, right) => Number(right[1] || 0) - Number(left[1] || 0)
                            )[0];
                            return (
                              <div
                                key={repository.id}
                                className="grid min-w-0 gap-3 border-t border-slate-200 px-4 py-4 first:border-t-0 md:grid-cols-[minmax(0,1.8fr)_minmax(130px,0.8fr)_minmax(90px,0.55fr)_minmax(130px,0.8fr)_minmax(150px,0.9fr)_auto] md:items-center"
                              >
                                <div className="min-w-0">
                                  <p className="break-words text-lg font-black text-slate-950">{repository.full_name}</p>
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
                                  <div className="flex flex-col items-start gap-1">
                                    <Badge variant={scoreState.variant}>
                                      {scoreState.label}
                                    </Badge>
                                    <span className="text-xs leading-5 text-slate-500">
                                      {scoreState.detail}
                                    </span>
                                    {latestScan?.violation_count ? (
                                      <span className="text-xs leading-5 text-rose-600">
                                        {latestScan.violation_count}{" "}
                                        {t("governance.violations", "Violations")}
                                        {topRule ? ` - ${topRule[0]} (${topRule[1]})` : ""}
                                      </span>
                                    ) : null}
                                  </div>
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
                      )}
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
                          {Number.isFinite(Number(scan.score)) ? (
                            <Badge variant={Number(scan.score) >= 85 ? "success" : "warning"}>
                              {t("governance.score", "Score")} {Math.round(Number(scan.score))}
                            </Badge>
                          ) : (
                            <Badge variant="neutral">
                              {t("governance.scorePending", "Score pending")}
                            </Badge>
                          )}
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
                      "Review repository-level violation totals, then open a project detail page for exact fixes."
                    )
                    : t(
                      "governance.myViolationsBody",
                      "Review repository-level violation totals, then open a project detail page for exact fixes."
                    )}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge variant="neutral">
                    {visibleViolationCount} {t("governance.violations", "Violations")}
                  </Badge>
                  <Badge variant="neutral">
                    {repositoryViolationSummaries.length}{" "}
                    {t("governance.repositories", "Repositories")}
                  </Badge>
                  <Badge variant="neutral">
                    {pollingFallbackCount} {t("governance.pollingFallback", "Background sync fallback")}
                  </Badge>
                  {!isAdmin ? (
                    <button
                      type="button"
                      disabled={isPreparingRemediation || !visibleViolationCount}
                      onClick={() =>
                        handlePrepareRemediation(
                          firstRepositoryWithViolations?.id ||
                            recentViolations[0]?.repository ||
                            repositories[0]?.id
                        )
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {isPreparingRemediation
                        ? t("governance.preparing", "Preparing...")
                        : t("governance.prepareRemediationDraft", "Prepare AI fix draft")}
                    </button>
                  ) : null}
                </div>
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {repositoryViolationSummaries.length ? (
                    repositoryViolationSummaries.map(({ repository, latestScan, violationCount, ruleSummary }) => (
                      <div
                        key={repository.id}
                        className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">
                              {repository.full_name}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {repository.primary_language ||
                                t("governance.unknownLanguage", "Unknown language")}
                            </p>
                          </div>
                          <Badge variant={Number(latestScan?.score || 0) >= 85 ? "success" : "warning"}>
                            {t("governance.score", "Score")}{" "}
                            {Number.isFinite(Number(latestScan?.score))
                              ? Math.round(Number(latestScan.score))
                              : "-"}
                          </Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                              {t("governance.violations", "Violations")}
                            </p>
                            <p className="mt-2 text-2xl font-black text-slate-950">
                              {violationCount}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                              {t("governance.rules", "rules")}
                            </p>
                            <p className="mt-2 text-2xl font-black text-slate-950">
                              {ruleSummary.length}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {ruleSummary.slice(0, 4).map((rule) => (
                            <Badge
                              key={`${repository.id}-${rule.code}`}
                              variant={rule.severity === "high" || rule.severity === "critical" ? "warning" : "neutral"}
                            >
                              {rule.code} {rule.count}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs uppercase tracking-[0.14em] text-slate-400">
                            {formatTimestamp(latestScan?.completed_at || latestScan?.created_at)}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/github-governance/repositories/${repository.id}/violations`}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                            >
                              {t("governance.details", "Details")}
                            </Link>
                            {canUseAiForRepository(repository) ? (
                              <Link
                                to={`/github-governance/repositories/${repository.id}/violations`}
                                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                              >
                                {t("governance.aiDraft", "AI draft")}
                              </Link>
                            ) : null}
                          </div>
                        </div>
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
                {canShowLatestRemediationDraft ? (
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

            {showAiValidationPanel ? (
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
                      {aiAccessibleRepositories.map((repository) => (
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
