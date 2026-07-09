import { useEffect, useState } from 'react';
import { fetchApi } from '../utils/api';
import { Trash2 } from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const data = await fetchApi('/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除此用户及相关的所有饮食记录吗？此操作不可恢复！')) return;
    try {
      await fetchApi(`/users/${id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">用户管理</h1>
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>注册时间</th>
              <th>目标 (kcal)</th>
              <th>消耗 Tokens</th>
              <th>时区</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td style={{ fontWeight: 600 }}>{user.username}</td>
                <td>{new Date(user.createdAt).toLocaleString()}</td>
                <td>{user.goal}</td>
                <td>{user.totalTokensUsed}</td>
                <td>{user.timezone}</td>
                <td>
                  <button className="btn-danger" onClick={() => handleDelete(user.id)}>
                    <Trash2 size={16} /> 删除
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>暂无用户</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
