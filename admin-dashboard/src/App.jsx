import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Image as ImageIcon, LogOut } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import MealsPage from './pages/Meals';

const Sidebar = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-title">WeightHelper Admin</div>
      <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
        <LayoutDashboard size={20} />
        大盘数据
      </NavLink>
      <NavLink to="/users" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
        <Users size={20} />
        用户管理
      </NavLink>
      <NavLink to="/meals" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
        <ImageIcon size={20} />
        图片与饮食记录
      </NavLink>
      <div style={{flex: 1}}></div>
      <button className="nav-item" onClick={handleLogout} style={{background: 'transparent', width: '100%', textAlign: 'left', border: 'none', color: 'var(--text-secondary)'}}>
        <LogOut size={20} />
        退出登录
      </button>
    </div>
  );
};

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/login" />;
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
        <Route path="/meals" element={<PrivateRoute><MealsPage /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
