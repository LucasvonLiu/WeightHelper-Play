import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 检测是否已经在独立模式下运行 (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
    
    if (isStandalone) {
      return; // 已经是 PWA，不显示
    }

    // 检测是否为 iOS Safari
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    
    // 我们暂时只针对移动端显示提示
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    if (isMobile) {
      setIsIOS(isIOSDevice && isSafari);
      
      // 检查之前是否已经关闭过提示
      const hasClosedPrompt = localStorage.getItem('hideInstallPrompt');
      if (!hasClosedPrompt) {
        // 延迟一下显示，避免一上来就弹
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('hideInstallPrompt', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div style={styles.container} className="fade-in">
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.titleArea}>
            <span style={styles.icon}>📱</span>
            <span style={styles.title}>添加到桌面，一键秒开</span>
          </div>
          <button style={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>
        
        {isIOS ? (
          <div style={styles.instruction}>
            点击底部 <span style={styles.highlight}>[分享]</span> ➔ 选择 <span style={styles.highlight}>"添加到主屏幕"</span>
          </div>
        ) : (
          <div style={styles.instruction}>
            点击右上角 <span style={styles.highlight}>[⋮]</span> ➔ 选择 <span style={styles.highlight}>"添加到主屏幕"</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    right: '16px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 9999,
    overflow: 'hidden',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  content: {
    padding: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instruction: {
    backgroundColor: '#f5f7f5',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: '1.4',
    marginTop: '4px'
  },
  highlight: {
    fontWeight: '600',
    color: 'var(--accent-green)',
  }
};
