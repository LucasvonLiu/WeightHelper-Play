import React, { useState, useEffect } from 'react';
import ProPaywall from './ProPaywall';
import moment from 'moment-timezone';

const getPast7Days = (tz) => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = moment().tz(tz).subtract(i, 'days');
    dates.push(d);
  }
  return dates;
};

const formatDate = (momentDate) => {
  return momentDate.format('YYYY-MM-DD');
};

export default function HistoryList({ goal, token, timezone }) {
  const [selectedDate, setSelectedDate] = useState(moment().tz(timezone || 'Asia/Shanghai').format('YYYY-MM-DD'));
  const [meals, setMeals] = useState([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  
  const weekDates = getPast7Days(timezone);

  useEffect(() => {
    fetchHistory();
  }, [selectedDate, timezone]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/meals?date=${selectedDate}&tz=${timezone}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeals(data.meals || []);
        setTotals(data.totals || { calories: 0, protein: 0, carbs: 0, fats: 0 });
      }
    } catch (error) {
      console.error("获取记录失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // 阻止冒泡
    try {
      setLoading(true);
      const res = await fetch(`/api/meals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchHistory();
      } else {
        alert("删除失败");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const progress = Math.min((totals.calories / goal) * 100, 100);


  if (loading) {
    return <div style={styles.loadingContainer}>加载中...</div>;
  }

  return (
    <div className="fade-in" style={styles.container}>
      <h2 style={styles.title}>历史追踪</h2>
      
      <div style={styles.calendarStrip}>
        {weekDates.map(date => {
          const dateStr = formatDate(date);
          const isSelected = dateStr === selectedDate;
          const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.day()];
          const isToday = dateStr === moment().tz(timezone).format('YYYY-MM-DD');
          return (
            <div 
              key={dateStr} 
              style={{ ...styles.dateItem, ...(isSelected ? styles.dateItemSelected : {}), color: isSelected ? '#fff' : 'var(--text-secondary)' }}
              onClick={() => setSelectedDate(dateStr)}
            >
              <span style={styles.dayName}>{isToday ? '今' : dayName}</span>
              <span style={styles.dayNumber}>{date.date()}</span>
            </div>
          );
        })}
      </div>
      
      <div style={styles.dashboardCard}>
        <div style={styles.progressContainer}>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }}></div>
          </div>
          <div style={styles.caloriesText}>
            <span style={styles.currentCals}>{totals.calories}</span>
            <span style={styles.goalCals}>/ {goal} kcal</span>
          </div>
        </div>
        
        <div style={styles.macrosSummary}>
          <div style={styles.macroItem}>
            <span style={styles.macroLabel}>蛋白质</span>
            <span style={styles.macroValue}>{totals.protein}g</span>
          </div>
          <div style={styles.macroItem}>
            <span style={styles.macroLabel}>碳水</span>
            <span style={styles.macroValue}>{totals.carbs}g</span>
          </div>
          <div style={styles.macroItem}>
            <span style={styles.macroLabel}>脂肪</span>
            <span style={styles.macroValue}>{totals.fats}g</span>
          </div>
        </div>
      </div>



      <div style={styles.mealsList}>
        <h3 style={styles.listTitle}>饮食记录</h3>
        {meals.length === 0 ? (
          <p style={styles.emptyState}>今天还没有记录任何饮食哦～</p>
        ) : (
          meals.map(meal => (
            <div key={meal.id} style={styles.mealItem}>
              <div style={styles.mealInfo}>
                <h4 style={styles.mealName}>{meal.foodName}</h4>
                <span style={styles.mealTime}>
                  {(() => {
                    const m = moment.utc(meal.createdAt).tz(timezone);
                    const offsetHours = m.utcOffset() / 60;
                    const offsetStr = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;
                    return `UTC${offsetStr} ${m.format('HH:mm')}`;
                  })()}
                </span>
              </div>
              <div style={styles.mealAction}>
                <span style={styles.mealCalories}>{meal.calories} kcal</span>
                <button 
                  style={styles.deleteBtn} 
                  onClick={(e) => handleDelete(meal.id, e)}
                  title="删除记录"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showPaywall && <ProPaywall onClose={() => setShowPaywall(false)} />}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    paddingBottom: '88px', // 为 BottomNav 留出空间
    backgroundColor: 'var(--bg-color)',
    minHeight: '100vh',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: 'var(--text-secondary)',
  },
  title: {
    fontSize: '24px',
    color: 'var(--text-primary)',
    fontWeight: '600',
    marginBottom: '24px',
    paddingTop: '20px',
  },
  dashboardCard: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--border-radius)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: '32px',
  },
  calendarStrip: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '24px',
    overflowX: 'auto',
    padding: '4px 0',
  },
  dateItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '12px',
    cursor: 'pointer',
    opacity: 0.6,
  },
  dateItemSelected: {
    opacity: 1,
    backgroundColor: 'var(--accent-green)',
    boxShadow: '0 4px 8px rgba(137, 168, 150, 0.3)',
  },
  dayName: {
    fontSize: '12px',
    marginBottom: '4px',
  },
  dayNumber: {
    fontSize: '16px',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: '24px',
  },
  progressBarBg: {
    height: '8px',
    backgroundColor: '#eee',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--accent-green)',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  caloriesText: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  currentCals: {
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  goalCals: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  macrosSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: '20px',
    borderTop: '1px solid #f0f0f0',
  },
  macroItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  macroLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  macroValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  listTitle: {
    fontSize: '18px',
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  emptyState: {
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: '14px',
  },
  mealsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  mealItem: {
    backgroundColor: 'var(--card-bg)',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  mealInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  mealName: {
    fontSize: '16px',
    color: 'var(--text-primary)',
    margin: 0,
  },
  mealTime: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  mealAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  mealCalories: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--accent-green)',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ff4d4f',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  }
};
