import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import Analytics from './pages/Analytics';
import Team from './pages/Team';
import SnippetList from './pages/SnippetList';
import SnippetDetail from './pages/SnippetsDetails';
import CreatSnippet from './pages/CreatSnippets';
import CreateMember from './pages/CreateMember';
import Settings from './pages/Settings';

function App() {
  // Token varsa giriş yapılmış demektir
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Routes>
       
        <Route path="/login" element={<Login />} />
        <Route path='/analytics' element={<Analytics />} />
        <Route path='/team' element={<Team />} />
        <Route path='/snippets' element={<SnippetList />} />
        <Route path="/snippets/:id" element={<SnippetDetail />} />
        <Route path="/add-snippets" element={<CreatSnippet />} />
        <Route path="/add-member" element={<CreateMember />} />
          <Route path="/settings" element={<Settings />} />
          <Route path = "/" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />

        {/* Yanlış bir linke gidilirse ana sayfaya dön */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
  );
}

export default App;