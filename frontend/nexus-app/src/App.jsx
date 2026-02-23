import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import Analytics from './pages/Analaytics';
import Team from './pages/Team';
import Snippet from './pages/Snippet';

function App() {
  // Token varsa giriş yapılmış demektir
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
       
        <Route path="/login" element={<Login />} />
        <Route path='/analytics' element={<Analytics />} />
        <Route path='/team' element={<Team />} />
        <Route path='/snippet' element={<Snippet />} />
        <Route 
          path="/" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />

        {/* Yanlış bir linke gidilirse ana sayfaya dön */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;