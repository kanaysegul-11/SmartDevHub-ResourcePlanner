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
import CreateSnippet from "./pages/CreatSnippets";
import Team from "./pages/Team";
import CreateMember from "./pages/CreateMember";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";

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
          name: "settings",
          list: "/settings",
          meta: {
            label: "Settings",
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
          <Route path="/team" element={<Team />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/add-member" element={<CreateMember />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
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
      <UnsavedChangesNotifier />
      <DocumentTitleHandler />
    </Refine>
  );
}

export default App;
