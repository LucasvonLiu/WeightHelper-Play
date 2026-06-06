import { useEffect, useState } from 'react';
import { fetchApi } from '../utils/api';
import { Activity, Users, Database } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalMeals: 0, totalTokens: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchApi('/stats');
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) return <div className="animate-fade-in">Loading...</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">大盘数据</h1>
      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div className="stat-title">总用户数</div>
            <Users size={24} color="var(--accent)" />
          </div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
        
        <div className="glass-panel stat-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div className="stat-title">记录的美食总数</div>
            <Database size={24} color="#10b981" />
          </div>
          <div className="stat-value">{stats.totalMeals}</div>
        </div>
        
        <div className="glass-panel stat-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div className="stat-title">消耗的总 Token 数</div>
            <Activity size={24} color="#8b5cf6" />
          </div>
          <div className="stat-value">{stats.totalTokens}</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
