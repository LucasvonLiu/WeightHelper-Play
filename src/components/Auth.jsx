import React, { useState } from 'react';

export default function Auth({ onAuthSuccess }) {
  const [showIntro, setShowIntro] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/login' : '/api/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '请求失败');
      }
      
      onAuthSuccess(data.token, data.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {showIntro && (
        <div style={styles.modalOverlay} onClick={() => setShowIntro(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>📸</div>
            <h3 style={styles.modalTitle}>欢迎来到 WeightHelper</h3>
            <p style={styles.modalText}>
              只需拍下食物照片，AI 即可帮您秒算卡路里与三大营养素，轻松管理日常饮食！
            </p>
            <button style={styles.modalBtn} onClick={() => setShowIntro(false)}>
              开始使用
            </button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <h2 style={styles.title}>{isLogin ? '欢迎回来' : '创建新账号'}</h2>
        <p style={styles.subtitle}>WeightHelper - 你的智能饮食伴侣</p>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="账号用户名 (例如: alex)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {error && <div style={styles.error}>{error}</div>}
          
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? '处理中...' : (isLogin ? '登录' : '注册并登录')}
          </button>
        </form>
        
        <div style={styles.toggleText}>
          {isLogin ? '还没有账号？' : '已有账号？'}
          <span style={styles.toggleLink} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? '立即注册' : '直接登录'}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-color)',
    padding: '20px'
  },
  card: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '24px',
    padding: '40px 30px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
    textAlign: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    color: 'var(--text-primary)'
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '32px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  input: {
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid #e1e1e1',
    fontSize: '16px',
    backgroundColor: '#f9f9f9',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '16px',
    borderRadius: '16px',
    border: 'none',
    backgroundColor: 'var(--accent-green)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px'
  },
  error: {
    color: '#ff3b30',
    fontSize: '14px',
    marginTop: '4px'
  },
  toggleText: {
    marginTop: '24px',
    fontSize: '14px',
    color: 'var(--text-secondary)'
  },
  toggleLink: {
    color: 'var(--accent-green)',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: '8px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    animation: 'fadeIn 0.3s ease',
  },
  modalContent: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '24px',
    padding: '32px 24px',
    textAlign: 'center',
    width: '100%',
    maxWidth: '320px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    animation: 'slideUp 0.3s ease',
  },
  modalIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '12px',
  },
  modalText: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '28px',
  },
  modalBtn: {
    width: '100%',
    backgroundColor: 'var(--accent-green)',
    color: '#fff',
    border: 'none',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  }
};
