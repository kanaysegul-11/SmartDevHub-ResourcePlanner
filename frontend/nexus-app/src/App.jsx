import { Refine, Authenticated } from "@refinedev/core";
import {
  NavigateToResource,
  CatchAllNavigate,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router-v6";
import { Routes, Route, Outlet } from "react-router-dom";
import { useEffect } from "react";
import routerProvider from "@refinedev/react-router-v6";

import { dataProvider } from "./refine/dataProvider";
import { authProvider } from "./refine/authProvider";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SnippetList from "./pages/SnippetList";
import SnippetDetail from "./pages/SnippetsDetails";
import CreateSnippet from "./pages/CreateSnippets";
import Team from "./pages/Team";
import CreateMember from "./pages/CreateMember";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import SoftwareAssets from "./pages/SoftwareAssets";
import NotificationsPage from "./pages/NotificationsPage";
import ContactAdmin from "./pages/ContactAdmin";
import CodeStandards from "./pages/CodeStandards";
import GithubGovernance from "./pages/GithubGovernance";
import AIPromptPlaybook from "./pages/AIPromptPlaybook";
import RepositoryViolationDetails from "./pages/RepositoryViolationDetails";
import MessageNotificationWatcher from "./component/notifications/MessageNotificationWatcher.jsx";
import { useUser } from "./UserContext.jsx";
import { apiClient } from "./refine/axios";
import { Toaster } from "sonner";

const GOVERNANCE_SYNC_COOLDOWN_MS = 15000;
let governanceSyncInFlight = false;
let lastGovernanceSyncUserId = null;
let lastGovernanceSyncAt = 0;
const GOVERNANCE_SYNC_RETRY_DELAY_MS = 3000;
const GOVERNANCE_SYNC_MAX_ATTEMPTS = 2;

function AdminOnlyRoute({ children }) {
  const { userData } = useUser();

  if (!userData?.isAdmin) {
    return <CatchAllNavigate to="/dashboard" />;
  }

  return children;
}

function App() {
  const { userData } = useUser();

  useEffect(() => {
    if (!userData?.id) {
      return undefined;
    }

    const currentUserId = String(userData.id);
    const now = Date.now();
    const shouldSkipBecauseRecent =
      governanceSyncInFlight ||
      (lastGovernanceSyncUserId === currentUserId &&
        now - lastGovernanceSyncAt < GOVERNANCE_SYNC_COOLDOWN_MS);

    if (shouldSkipBecauseRecent) {
      return undefined;
    }

    let cancelled = false;
    let refreshTimeoutId = null;

    const wait = (delay) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, delay);
      });

    const triggerGovernanceSync = async () => {
      governanceSyncInFlight = true;
      lastGovernanceSyncUserId = currentUserId;
      lastGovernanceSyncAt = Date.now();
      window.dispatchEvent(new CustomEvent("governance-sync-started"));

      try {
        let completed = false;
        for (let attempt = 0; attempt < GOVERNANCE_SYNC_MAX_ATTEMPTS; attempt += 1) {
          try {
            await apiClient.post("/github-accounts/sync-all-repositories/");
            completed = true;
            break;
          } catch (error) {
            const statusCode = Number(error?.response?.status || 0);
            const isRetryable = [423, 429, 500, 502, 503, 504].includes(statusCode);
            if (!isRetryable || attempt >= GOVERNANCE_SYNC_MAX_ATTEMPTS - 1) {
              throw error;
            }
            await wait(GOVERNANCE_SYNC_RETRY_DELAY_MS * (attempt + 1));
          }
        }

        if (!completed) {
          throw new Error("Governance sync could not be completed.");
        }
      } catch {
        window.dispatchEvent(new CustomEvent("governance-sync-failed"));
        governanceSyncInFlight = false;
        return;
      }

      refreshTimeoutId = window.setTimeout(() => {
        if (!cancelled) {
          window.dispatchEvent(new CustomEvent("governance-sync-requested"));
          window.dispatchEvent(new CustomEvent("governance-sync-completed"));
        }
        governanceSyncInFlight = false;
      }, 4000);
    };

    void triggerGovernanceSync();

    return () => {
      cancelled = true;
      if (refreshTimeoutId) {
        window.clearTimeout(refreshTimeoutId);
        governanceSyncInFlight = false;
      }
    };
  }, [userData?.id]);

  return (
    <Refine
      dataProvider={dataProvider}
      routerProvider={routerProvider}
      authProvider={authProvider}
      resources={[
        {
          name: "dashboard",
          list: "/dashboard",
          meta: {
            label: "Dashboard",
          },
        },
        {
          name: "snippets",
          list: "/snippets",
          create: "/add-snippets",
          edit: "/snippets/:id/edit",
          show: "/snippets/:id",
          meta: {
            label: "Code Library",
          },
        },
        {
          name: "status",
          list: "/team",
          create: "/add-member",
          meta: {
            label: "Team",
          },
        },
        {
          name: "projects",
          list: "/projects",
          meta: {
            label: "Projects",
          },
        },
        {
          name: "tasks",
          list: "/tasks",
          meta: {
            label: "Tasks",
          },
        },
        {
          name: "software-assets",
          list: "/software-assets",
          meta: {
            label: "Products & Subscriptions",
          },
        },
        {
          name: "license-requests",
          meta: {
            label: "License Requests",
          },
        },
        {
          name: "comments",
          meta: {
            label: "Comments",
          },
        },
        {
          name: "team-messages",
          meta: {
            label: "Team Messages",
          },
        },
        {
          name: "analytics",
          list: "/analytics",
          meta: {
            label: "Analytics",
          },
        },
        {
          name: "github-governance",
          list: "/github-governance",
          meta: {
            label: "Code Governance",
          },
        },
        {
          name: "ai-prompt-playbook",
          list: "/github-governance/ai-prompts",
          meta: {
            label: "AI Prompt Rehberi",
          },
        },
        {
          name: "settings",
          list: "/settings",
          meta: {
            label: "Settings",
          },
        },
        {
          name: "notifications-page",
          list: "/notifications",
          meta: {
            label: "Notifications",
          },
        },
        {
          name: "administrators",
          list: "/administrators",
          meta: {
            label: "Administrators",
          },
        },
      ]}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
      }}
    >
      <Routes>
        <Route
          element={
            <Authenticated fallback={<CatchAllNavigate to="/login" />}>
              <Outlet />
            </Authenticated>
          }
        >
          <Route index element={<NavigateToResource resource="dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/snippets" element={<SnippetList />} />
          <Route path="/snippets/:id" element={<SnippetDetail />} />
          <Route path="/add-snippets" element={<CreateSnippet />} />
          <Route path="/snippets/:id/edit" element={<CreateSnippet />} />
          <Route path="/team" element={<Team />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/software-assets" element={<SoftwareAssets />} />
          <Route path="/github-governance" element={<GithubGovernance />} />
          <Route path="/github-governance/rules" element={<CodeStandards />} />
          <Route path="/github-governance/ai-prompts" element={<AIPromptPlaybook />} />
          <Route
            path="/github-governance/repositories/:repositoryId/violations"
            element={<RepositoryViolationDetails />}
          />
          <Route
            path="/add-member"
            element={
              <AdminOnlyRoute>
                <CreateMember />
              </AdminOnlyRoute>
            }
          />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/administrators" element={<ContactAdmin />} />
          <Route path="/contact-admin" element={<ContactAdmin />} />
        </Route>

        <Route
          element={
            <Authenticated fallback={<Outlet />}>
              <NavigateToResource resource="dashboard" />
            </Authenticated>
          }
        >
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route path="*" element={<CatchAllNavigate to="/dashboard" />} />
      </Routes>
      <MessageNotificationWatcher />
      <UnsavedChangesNotifier />
      <DocumentTitleHandler />
      <Toaster
        richColors
        position="top-right"
        toastOptions={{
          className: "font-sans",
        }}
      />
    </Refine>
  );
}

export default App;
