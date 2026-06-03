import React from 'react';

export default function ProPaywall({ onClose }) {
  return (
    <div style={styles.overlay} className="fade-in">
      <div style={styles.modal}>
        <div style={styles.icon}>✨</div>
        <h2 style={styles.title}>升级为 Pro 会员</h2>
        <p style={styles.desc}>
          您今天的免费 AI 营养师点评次数已用完。<br/>
          解锁 Pro 版本，享受无限次专属健康建议与深度周报分析。
        </p>
        
        <div style={styles.priceBox}>
          <span style={styles.currency}>¥</span>
          <span style={styles.price}>18</span>
          <span style={styles.period}>/月</span>
        </div>

        <button style={styles.upgradeBtn} onClick={() => alert('此为演示 Demo，无法真正付款哦！')}>
          立即解锁
        </button>
        <button style={styles.closeBtn} onClick={onClose}>
          先不，谢谢
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '24px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    padding: '32px 24px',
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '12px',
  },
  desc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  priceBox: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '32px',
  },
  currency: { fontSize: '20px', fontWeight: '600', color: 'var(--accent-green)' },
  price: { fontSize: '48px', fontWeight: '700', color: 'var(--accent-green)', letterSpacing: '-1px' },
  period: { fontSize: '14px', color: 'var(--text-secondary)', marginLeft: '4px' },
  
  upgradeBtn: {
    width: '100%',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    padding: '8px',
    cursor: 'pointer',
  }
};
