import { Refine, Authenticated } from "@refinedev/core";
import {
  NavigateToResource,
  CatchAllNavigate,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router-v6";
import { Routes, Route, Outlet } from "react-router-dom";
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
import GithubGovernance from "./pages/GithubGovernance";
import MessageNotificationWatcher from "./component/notifications/MessageNotificationWatcher.jsx";
import { useUser } from "./UserContext.jsx";
import { Toaster } from "sonner";

function AdminOnlyRoute({ children }) {
  const { userData } = useUser();

  if (!userData?.isAdmin) {
    return <CatchAllNavigate to="/dashboard" />;
  }

  return children;
}

function App() {
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
