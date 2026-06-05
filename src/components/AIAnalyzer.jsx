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
        <div style={styles.frostedOverlay}>
          <div style={styles.loadingInfo}>
            <h3 style={{fontSize: '32px', fontWeight: '800', color: 'var(--accent-green)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', textShadow: '0 2px 10px rgba(255,255,255,0.8)'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{animation: 'pulse 1.5s infinite opacity'}}>
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              Thinking...
            </h3>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '300px'}}>
              {logs.map((log, i) => (
                <p key={i} style={{
                  ...styles.loadingText,
                  opacity: i === logs.length - 1 ? 1 : 0.6,
                  color: i === logs.length - 1 ? '#222' : '#555',
                  textShadow: '0 1px 4px rgba(255,255,255,0.6)',
                  transition: 'all 0.3s ease',
                  fontSize: '14px',
                  fontWeight: i === logs.length - 1 ? '600' : '500'
                }}>
                  {log}
                </p>
              ))}
            </div>
          </div>
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
    backgroundColor: 'rgba(235, 245, 238, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
  },
  loadingInfo: {
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
