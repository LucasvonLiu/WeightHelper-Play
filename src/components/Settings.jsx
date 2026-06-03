import React, { useState } from 'react';

export default function Settings({ currentGoal, onSaveGoal }) {
  const [goal, setGoal] = useState(currentGoal);

  const handleSave = () => {
    onSaveGoal(Number(goal));
    alert("目标已保存！");
  };

  return (
    <div className="fade-in" style={styles.container}>
      <h2 style={styles.title}>偏好设置</h2>
      
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>每日摄入目标 (kcal)</h3>
        <p style={styles.cardDesc}>根据您的减脂或增肌需求，设定一个卡路里上限。</p>
        
        <div style={styles.inputGroup}>
          <input 
            type="number" 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={styles.input}
          />
          <span style={styles.unit}>大卡</span>
        </div>

        <button style={styles.saveBtn} onClick={handleSave}>
          保存目标
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    paddingBottom: '88px',
    backgroundColor: 'var(--bg-color)',
    minHeight: '100vh',
  },
  title: {
    fontSize: '24px',
    color: 'var(--text-primary)',
    fontWeight: '600',
    marginBottom: '24px',
    paddingTop: '20px',
  },
  card: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--border-radius)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
  },
  cardTitle: {
    fontSize: '18px',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  cardDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '16px',
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--accent-green)',
    border: '2px solid #eee',
    borderRadius: '12px',
    outline: 'none',
    textAlign: 'center',
  },
  unit: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  saveBtn: {
    width: '100%',
    backgroundColor: 'var(--accent-green)',
    color: '#fff',
    border: 'none',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  }
};
