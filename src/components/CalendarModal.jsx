import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone';

export default function CalendarModal({ timezone, token, onSelectDate, onClose }) {
  const tz = timezone || 'Asia/Shanghai';
  const [viewMonth, setViewMonth] = useState(moment().tz(tz)); // moment object for current view
  const [datesWithRecords, setDatesWithRecords] = useState(new Set());
  const [loadingDates, setLoadingDates] = useState(false);

  useEffect(() => {
    fetchDates(viewMonth);
  }, [viewMonth]);

  const fetchDates = async (m) => {
    setLoadingDates(true);
    try {
      const monthStr = m.format('YYYY-MM');
      const res = await fetch(`/api/meals/dates?month=${monthStr}&tz=${tz}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDatesWithRecords(new Set(data.dates || []));
      }
    } catch (e) {}
    setLoadingDates(false);
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`/api/meals/export/csv?tz=${tz}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WeightHelper_${moment().tz(tz).format('YYYYMMDD')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {}
  };

  // Build calendar grid
  const startOfMonth = viewMonth.clone().startOf('month');
  const endOfMonth = viewMonth.clone().endOf('month');
  const startDay = startOfMonth.day(); // 0=Sun
  const daysInMonth = endOfMonth.date();
  const today = moment().tz(tz).format('YYYY-MM-DD');

  const weeks = ['日', '一', '二', '三', '四', '五', '六'];

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <button style={s.navBtn} onClick={() => setViewMonth(viewMonth.clone().subtract(1, 'month'))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <span style={s.monthTitle}>{viewMonth.format('YYYY年M月')}</span>

          <button style={s.navBtn} onClick={() => setViewMonth(viewMonth.clone().add(1, 'month'))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* CSV export icon */}
          <button style={s.exportBtn} onClick={handleExportCSV} title="导出 CSV">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>

        {/* Weekday labels */}
        <div style={s.weekRow}>
          {weeks.map(w => (
            <div key={w} style={s.weekLabel}>{w}</div>
          ))}
        </div>

        {/* Day grid */}
        <div style={s.grid}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const dateStr = viewMonth.clone().date(day).format('YYYY-MM-DD');
            const hasRecord = datesWithRecords.has(dateStr);
            const isToday = dateStr === today;
            return (
              <div
                key={dateStr}
                style={{
                  ...s.dayCell,
                  ...(isToday ? s.todayCell : {}),
                }}
                onClick={() => { onSelectDate(dateStr); onClose(); }}
              >
                <span style={{ fontSize: '14px', fontWeight: isToday ? '700' : '400', color: isToday ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                  {day}
                </span>
                {hasRecord && <div style={s.dot} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 500,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    padding: '24px',
  },
  modal: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '24px',
    padding: '20px',
    width: '100%',
    maxWidth: '360px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  monthTitle: {
    fontWeight: '700',
    fontSize: '16px',
    color: 'var(--text-primary)',
    flex: 1,
    textAlign: 'center',
  },
  navBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center',
  },
  exportBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-secondary)', padding: '4px', marginLeft: '8px', display: 'flex', alignItems: 'center',
    opacity: 0.7,
  },
  weekRow: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    marginBottom: '8px',
  },
  weekLabel: {
    textAlign: 'center', fontSize: '11px',
    color: 'var(--text-secondary)', fontWeight: '500', padding: '4px 0',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
  },
  dayCell: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '6px 2px', cursor: 'pointer',
    borderRadius: '10px', minHeight: '40px', gap: '2px',
    transition: 'background 0.15s',
  },
  todayCell: {
    backgroundColor: 'var(--accent-green-light)',
  },
  dot: {
    width: '5px', height: '5px',
    borderRadius: '50%', backgroundColor: '#E87070',
  },
};
