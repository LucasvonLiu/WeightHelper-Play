import React, { useEffect, useState } from 'react';

export default function AIAnalyzer({ imageUrl }) {
  const [loadingText, setLoadingText] = useState('正在上传并分析图像...');

  useEffect(() => {
    // 仅模拟文本变化，增加趣味性和仪式感，不控制加载结束状态
    const timer1 = setTimeout(() => setLoadingText('正在识别食物特征与大小...'), 1200);
    const timer2 = setTimeout(() => setLoadingText('正在估算克数与热量...'), 2400);
    const timer3 = setTimeout(() => setLoadingText('正在计算三大宏量营养素...'), 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="analyzer-container fade-in" style={styles.container}>
      <h2 style={styles.headerTitle}>AI 分析中</h2>
      <div style={styles.imageWrapper}>
        <img src={imageUrl} alt="Uploaded food" style={styles.image} />
        <div style={styles.scannerBar}></div>
      </div>
      <div style={styles.loadingInfo}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>{loadingText}</p>
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
    height: '100vh',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '500',
    marginBottom: '32px',
    color: 'var(--text-primary)',
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
  scannerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '3px',
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 0 10px var(--accent-green)',
    animation: 'scan 2s ease-in-out infinite alternate',
  },
  loadingInfo: {
    marginTop: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--accent-green-light)',
    borderTopColor: 'var(--accent-green)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    textAlign: 'center',
    padding: '0 20px',
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
