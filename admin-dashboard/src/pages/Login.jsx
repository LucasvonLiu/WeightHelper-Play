import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../utils/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('adminToken', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>WeightHelper Admin</h2>
          <p style={{ color: 'var(--text-secondary)' }}>登录以管理系统</p>
        </div>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px' }}>{error}</div>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="请输入 admin" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="请输入密码" />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
            登录
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
