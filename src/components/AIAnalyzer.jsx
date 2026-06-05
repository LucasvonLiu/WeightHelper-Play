import React, { useEffect, useState } from 'react';

export default function AIAnalyzer({ imageUrl }) {
  const [logs, setLogs] = useState(['连接到 AI 引擎...']);

  useEffect(() => {
    const steps = [
      { text: '正在识别餐具及食物特征...', time: 800 },
      { text: '发现潜在的食材与配料...', time: 1600 },
      { text: '正在估算克数与热量...', time: 2400 },
      { text: '正在计算三大宏量营养素...', time: 3200 },
      { text: '正在生成分析报告...', time: 4000 },
    ];
    
    const timers = steps.map(step => 
      setTimeout(() => setLogs(prev => [...prev, step.text]), step.time)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="analyzer-container fade-in" style={styles.container}>
      <div style={styles.imageWrapper}>
        <img src={imageUrl} alt="Uploaded food" style={styles.image} />
        <div style={styles.frostedOverlay}></div>
      </div>
      <div style={styles.loadingInfo}>
        <h3 style={{fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation: 'pulse 1.5s infinite opacity'}}>
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
          Thinking...
        </h3>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', width: '100%', maxWidth: '300px'}}>
          {logs.map((log, i) => (
            <p key={i} style={{
              ...styles.loadingText,
              opacity: i === logs.length - 1 ? 1 : 0.5,
              color: i === logs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'all 0.3s ease'
            }}>
              {log}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    paddingBottom: '10vh'
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 'var(--border-radius)',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: 'var(--shadow-md)',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  frostedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(163, 188, 167, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  loadingInfo: {
    marginTop: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: '15px',
    fontWeight: '500',
    textAlign: 'left',
    margin: 0,
  }
};

// 确保只注入一次动画样式
if (typeof document !== 'undefined' && !document.getElementById('analyzer-animation-styles')) {
  const style = document.createElement('style');
  style.id = 'analyzer-animation-styles';
  style.innerHTML = `
    @keyframes scan {
      0% { top: 0; }
      100% { top: 100%; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
