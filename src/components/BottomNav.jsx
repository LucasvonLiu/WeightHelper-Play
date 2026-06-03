import React from 'react';

export default function BottomNav({ currentTab, onTabChange }) {
  return (
    <div style={styles.navContainer}>
      <button 
        style={{ ...styles.navItem, ...(currentTab === 'camera' ? styles.active : {}) }} 
        onClick={() => onTabChange('camera')}
      >
        <span style={styles.icon}>📸</span>
        <span>记录</span>
      </button>
      <button 
        style={{ ...styles.navItem, ...(currentTab === 'history' ? styles.active : {}) }} 
        onClick={() => onTabChange('history')}
      >
        <span style={styles.icon}>📊</span>
        <span>今日</span>
      </button>
      <button 
        style={{ ...styles.navItem, ...(currentTab === 'settings' ? styles.active : {}) }} 
        onClick={() => onTabChange('settings')}
      >
        <span style={styles.icon}>⚙️</span>
        <span>设置</span>
      </button>
    </div>
  );
}

const styles = {
  navContainer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '64px',
    backgroundColor: '#fff',
    display: 'flex',
    borderTop: '1px solid #eee',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.02)',
    zIndex: 100,
    maxWidth: '480px',
    margin: '0 auto',
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '8px',
  },
  active: {
    color: 'var(--accent-green)',
    fontWeight: '600',
  },
  icon: {
    fontSize: '20px',
    marginBottom: '2px',
  }
};
