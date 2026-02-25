import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import Analytics from './pages/Analaytics';
import Team from './pages/Team';
import SnippetList from './pages/SnippetList';
import SnippetDetail from './component/SnippetsDetails';
import CreatSnippet from './component/CreatSnippets';
import CreateMember from './component/CreateMember';
import Settings from './pages/Settings';
import UserContext from './UserContext.jsx';

function App() {
  // Token varsa giriş yapılmış demektir
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
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
    </Router>
  );
}

export default App;