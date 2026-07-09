import { useEffect, useState } from 'react';
import { fetchApi } from '../utils/api';
import { Trash2, Image as ImageIcon, X } from 'lucide-react';

const Meals = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);

  const limit = 20;

  const loadMeals = async (p = 1) => {
    try {
      const data = await fetchApi(`/meals?page=${p}&limit=${limit}`);
      setMeals(data.data);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals(page);
  }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这条记录吗？')) return;
    try {
      await fetchApi(`/meals/${id}`, { method: 'DELETE' });
      loadMeals(page);
    } catch (err) {
      alert(err.message);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">饮食图片与记录</h1>
      <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>图片</th>
              <th>食物名称</th>
              <th>热量 (kcal)</th>
              <th>所属用户</th>
              <th>记录时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {meals.map(meal => (
              <tr key={meal.id}>
                <td>{meal.id}</td>
                <td>
                  {meal.image ? (
                    <img 
                      src={meal.image} 
                      alt={meal.foodName} 
                      className="thumbnail" 
                      onClick={() => setPreviewImage(meal.image)}
                    />
                  ) : (
                    <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                      <ImageIcon size={24} color="var(--text-secondary)" />
                    </div>
                  )}
                </td>
                <td style={{ fontWeight: 500 }}>{meal.foodName}</td>
                <td>{meal.calories}</td>
                <td>{meal.username} <span style={{color:'var(--text-secondary)', fontSize:'0.8rem'}}>(ID: {meal.userId})</span></td>
                <td>{new Date(meal.createdAt).toLocaleString()}</td>
                <td>
                  <button className="btn-danger" onClick={() => handleDelete(meal.id)}>
                    <Trash2 size={16} /> 删除
                  </button>
                </td>
              </tr>
            ))}
            {meals.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>暂无记录</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button 
            className="btn-primary" 
            style={{ background: 'rgba(255,255,255,0.1)' }}
            disabled={page === 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <span style={{ display: 'flex', alignItems: 'center' }}>{page} / {totalPages}</span>
          <button 
            className="btn-primary" 
            style={{ background: 'rgba(255,255,255,0.1)' }}
            disabled={page === totalPages} 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            下一页
          </button>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <button className="close-modal" onClick={() => setPreviewImage(null)}><X size={24} /></button>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="modal-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Meals;
