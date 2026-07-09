import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext.jsx';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { 
    goal: currentGoal, 
    timezone: currentTimezone, 
    handleSavePreferences, 
    handleDeleteAccount 
  } = useApp();

  const [goal, setGoal] = useState(currentGoal);
  const [tz, setTz] = useState(currentTimezone || 'Asia/Shanghai');
  const [lang, setLang] = useState(i18n.language || 'zh');

  const handleSave = () => {
    handleSavePreferences(Number(goal), tz);
    i18n.changeLanguage(lang);
    localStorage.setItem('weighthelper_lang', lang);
    alert(lang === 'zh' ? "设置已保存！" : "Settings saved!");
  };

  return (
    <div className="fade-in" style={styles.container}>
      <h2 style={styles.title}>{t('settings.title')}</h2>
      
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>{t('settings.langLabel')}</h3>
        <div style={styles.inputGroup}>
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
            style={styles.select}
          >
            <option value="zh">简体中文 (Simplified Chinese)</option>
            <option value="en">English</option>
          </select>
        </div>

        <h3 style={{...styles.cardTitle, marginTop: '24px'}}>{t('settings.goalLabel')}</h3>
        <p style={styles.cardDesc}>{t('settings.goalDesc')}</p>
        
        <div style={styles.inputGroup}>
          <input 
            type="number" 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={styles.input}
          />
          <span style={styles.unit}>{t('settings.goalUnit')}</span>
        </div>

        <h3 style={{...styles.cardTitle, marginTop: '24px'}}>{t('settings.timezoneLabel')}</h3>
        <p style={styles.cardDesc}>{t('settings.timezoneDesc')}</p>

        <div style={styles.inputGroup}>
          <select 
            value={tz} 
            onChange={(e) => setTz(e.target.value)}
            style={styles.select}
          >
            <option value="Asia/Shanghai">北京时间 (UTC+8)</option>
            <option value="Europe/Berlin">柏林时间 (UTC+1)</option>
            <option value="America/New_York">纽约时间 (UTC-5)</option>
            <option value="America/Chicago">休斯敦时间 (UTC-6)</option>
          </select>
        </div>

        <button style={styles.saveBtn} onClick={handleSave}>
          {t('settings.saveBtn')}
        </button>
      </div>

      <div style={{ ...styles.card, marginTop: '24px', borderColor: '#ffcccc', borderWidth: '1px', borderStyle: 'solid' }}>
        <h3 style={{ ...styles.cardTitle, color: '#ff4d4f' }}>{t('settings.dangerZone')}</h3>
        <p style={styles.cardDesc}>{t('settings.deleteDesc')}</p>
        <button style={styles.deleteBtn} onClick={handleDeleteAccount}>
          {t('settings.deleteBtn')}
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
  },
  deleteBtn: {
    width: '100%',
    backgroundColor: '#fff',
    color: '#ff4d4f',
    border: '2px solid #ff4d4f',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  select: {
    flex: 1,
    minWidth: 0,
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    border: '2px solid #eee',
    borderRadius: '12px',
    outline: 'none',
    appearance: 'none',
    backgroundColor: '#fff',
  }
};
