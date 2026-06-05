import React from 'react';

const CameraIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const HistoryIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="8" y1="18" x2="8" y2="18" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const SettingsIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default function BottomNav({ currentTab, onTabChange }) {
  return (
    <div style={styles.navContainer}>
      <button 
        style={{ ...styles.navItem, ...(currentTab === 'camera' ? styles.active : {}) }} 
        onClick={() => onTabChange('camera')}
      >
        <CameraIcon active={currentTab === 'camera'} />
      </button>
      <button 
        style={{ ...styles.navItem, ...(currentTab === 'history' ? styles.active : {}) }} 
        onClick={() => onTabChange('history')}
      >
        <HistoryIcon active={currentTab === 'history'} />
      </button>
      <button 
        style={{ ...styles.navItem, ...(currentTab === 'settings' ? styles.active : {}) }} 
        onClick={() => onTabChange('settings')}
      >
        <SettingsIcon active={currentTab === 'settings'} />
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
    height: 'calc(60px + env(safe-area-inset-bottom))',
    paddingBottom: 'env(safe-area-inset-bottom)',
    backgroundColor: 'var(--card-bg)',
    display: 'flex',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.04)',
    zIndex: 100,
    maxWidth: '480px',
    margin: '0 auto',
  },
  navItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '8px',
    transition: 'color 0.2s',
  },
  active: {
    color: 'var(--accent-green)',
  },
};
