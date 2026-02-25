import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Team from "./pages/Team";
import SnippetList from "./pages/SnippetList";
import SnippetDetail from "./pages/SnippetsDetails";
import CreatSnippet from "./pages/CreatSnippets";
import CreateMember from "./pages/CreateMember";
import Settings from "./pages/Settings";

function ProtectedRoutes() {
  const isAuthenticated = !!localStorage.getItem("token");

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/team" element={<Team />} />
        <Route path="/snippets" element={<SnippetList />} />
        <Route path="/snippets/:id" element={<SnippetDetail />} />
        <Route path="/add-snippets" element={<CreatSnippet />} />
        <Route path="/add-member" element={<CreateMember />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
