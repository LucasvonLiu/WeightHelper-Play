import React, { useState, useEffect } from 'react';
import ProPaywall from './ProPaywall';
import moment from 'moment-timezone';
import NutritionCard from './NutritionCard';
import CalendarModal from './CalendarModal';
import PixelatedImage from './PixelatedImage';

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
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  
  const weekDates = getPast7Days(timezone);

  useEffect(() => {
    fetchHistory(true);
  }, [selectedDate, timezone]);

  const fetchHistory = async (showFullScreenLoading = false) => {
    try {
      if (showFullScreenLoading) setLoading(true);
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
      if (showFullScreenLoading) setLoading(false);
    }
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!window.confirm('确认删除该记录吗？')) return;
    
    const mealToDelete = meals.find(m => m.id === id);
    if (!mealToDelete) return;

    // 极致乐观更新：立刻删掉列表里的记录，同时立刻扣减总热量和营养素
    setMeals(prev => prev.filter(m => m.id !== id));
    setTotals(prev => ({
      calories: Math.max(0, prev.calories - (mealToDelete.calories || 0)),
      protein: Math.max(0, prev.protein - (mealToDelete.protein || 0)),
      carbs: Math.max(0, prev.carbs - (mealToDelete.carbs || 0)),
      fats: Math.max(0, prev.fats - (mealToDelete.fats || 0))
    }));
    
    // 异步发给后端，不管成功失败也不重新加载了（代码最少，体感最快）
    fetch(`/api/meals/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(console.error);
  };

  const handleUpdateMeal = async (updatedMeal) => {
    try {
      const res = await fetch(`/api/meals/${selectedMeal.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(updatedMeal)
      });
      if (res.ok) {
        setSelectedMeal(null);
        fetchHistory(false);
      } else {
        alert("更新失败");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const C = 226.19; // R=36
  const calPct = Math.min((totals.calories / goal) * 100, 100);
  const calOffset = C - (calPct / 100) * C;

  const totalMacros = totals.protein + totals.carbs + totals.fats;
  const pPct = totalMacros > 0 ? Math.round((totals.protein / totalMacros) * 100) : 0;
  const cPct = totalMacros > 0 ? Math.round((totals.carbs / totalMacros) * 100) : 0;
  const fPct = totalMacros > 0 ? 100 - pPct - cPct : 0;
  
  const pOffset = C - (pPct / 100) * C;
  const cOffset = C - (cPct / 100) * C;
  const fOffset = C - (fPct / 100) * C;

  if (loading) {
    return <div style={styles.loadingContainer}>加载中...</div>;
  }

  return (
    <div className="fade-in" style={styles.container}>
      
      {/* 日期栏 + 日历图标 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ ...styles.calendarStrip, flex: 1 }}>
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
        <button
          onClick={() => setShowCalendar(true)}
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', opacity: 0.7, display: 'flex', alignItems: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>
      </div>

      {showCalendar && (
        <CalendarModal
          timezone={timezone}
          token={token}
          onSelectDate={(date) => setSelectedDate(date)}
          onClose={() => setShowCalendar(false)}
        />
      )}
      
      <div style={{ ...styles.dashboardCard, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '24px 12px' }}>
        {/* 热量余量环形图 */}
        <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <svg width="110" height="110" viewBox="0 0 80 80" style={{ position: 'absolute', top: 0, left: 0 }}>
            <circle cx="40" cy="40" r="36" fill="transparent" stroke="#f0f0f0" strokeWidth="6" />
            <circle cx="40" cy="40" r="36" fill="transparent" stroke={totals.calories > goal ? "#ff4d4f" : "var(--accent-green)"} strokeWidth="6" strokeDasharray={C} strokeDashoffset={calOffset} transform="rotate(-90 40 40)" strokeLinecap="round" />
          </svg>
          <div style={{ textAlign: 'center', zIndex: 1, marginTop: '2px' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: totals.calories > goal ? '#ff4d4f' : 'var(--text-primary)', lineHeight: 1.2 }}>{totals.calories}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '500' }}>/ {goal} kcal</div>
          </div>
        </div>

        {/* 营养素组成环形图 */}
        <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <svg width="110" height="110" viewBox="0 0 80 80" style={{ position: 'absolute', top: 0, left: 0 }}>
            <circle cx="40" cy="40" r="36" fill="transparent" stroke="#f0f0f0" strokeWidth="6" />
            <circle cx="40" cy="40" r="36" fill="transparent" stroke="#A3BCA7" strokeWidth="6" strokeDasharray={C} strokeDashoffset={pOffset} transform="rotate(-90 40 40)" strokeLinecap="round" />
            <circle cx="40" cy="40" r="36" fill="transparent" stroke="#D0D0C8" strokeWidth="6" strokeDasharray={C} strokeDashoffset={cOffset} transform={`rotate(${-90 + (pPct/100)*360} 40 40)`} strokeLinecap="round" />
            <circle cx="40" cy="40" r="36" fill="transparent" stroke="#E6DFD3" strokeWidth="6" strokeDasharray={C} strokeDashoffset={fOffset} transform={`rotate(${-90 + ((pPct+cPct)/100)*360} 40 40)`} strokeLinecap="round" />
          </svg>
          <div style={{ textAlign: 'center', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', fontWeight: '600' }}>
              <div style={{width: 6, height: 6, backgroundColor: '#A3BCA7', borderRadius: '50%'}}></div>蛋 {pPct}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', fontWeight: '600' }}>
              <div style={{width: 6, height: 6, backgroundColor: '#D0D0C8', borderRadius: '50%'}}></div>碳 {cPct}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', fontWeight: '600' }}>
              <div style={{width: 6, height: 6, backgroundColor: '#E6DFD3', borderRadius: '50%'}}></div>脂 {fPct}%
            </div>
          </div>
        </div>
      </div>



      <div style={styles.mealsList}>
        {meals.length === 0 ? (
          <p style={styles.emptyState}>今天还没有记录任何饮食哦～</p>
        ) : (
          meals.map(meal => (
            <div key={meal.id} style={{...styles.mealItem, cursor: 'pointer'}} onClick={() => setSelectedMeal(meal)}>
              <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                <div style={{width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                  {meal.image ? (
                    <PixelatedImage src={meal.image} alt={meal.foodName} style={{width: '100%', height: '100%'}} blocksCount={20} />
                  ) : (
                    <span style={{fontSize: '20px'}}>🍽️</span>
                  )}
                </div>
                <div style={styles.mealInfo}>
                  <h4 style={styles.mealName}>
                    {(() => {
                      const match = meal.foodName.match(/^(.*?)\s*(\(.*?\)|（.*?）)$/);
                      if (match) {
                        return (
                          <>
                            <span>{match[1]}</span>
                            <span style={{display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 'normal'}}>{match[2]}</span>
                          </>
                        );
                      }
                      return meal.foodName;
                    })()}
                  </h4>
                  <span style={styles.mealTime}>
                    {(() => {
                      const m = moment.utc(meal.createdAt).tz(timezone);
                      const offsetHours = m.utcOffset() / 60;
                      const offsetStr = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;
                      return `UTC${offsetStr} ${m.format('HH:mm')}`;
                    })()}
                  </span>
                </div>
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

      {selectedMeal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, 
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px'
        }} onClick={() => setSelectedMeal(null)}>
          <div style={{width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', backgroundColor: 'var(--card-bg)', position: 'relative'}} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedMeal(null)}
              style={{position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 10}}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            {selectedMeal.image && (
              <div style={{width: '100%', height: '200px', overflow: 'hidden', borderRadius: '24px 24px 0 0', flexShrink: 0}}>
                <PixelatedImage src={selectedMeal.image} alt={selectedMeal.foodName} style={{width: '100%', height: '100%'}} blocksCount={45} />
              </div>
            )}
            <NutritionCard 
              imageUrl={selectedMeal.image}
              data={
                selectedMeal.details && selectedMeal.details.isMulti 
                  ? { foods: selectedMeal.details.foods }
                  : {
                      foodName: selectedMeal.foodName,
                      calories: selectedMeal.calories,
                      protein: selectedMeal.protein,
                      carbs: selectedMeal.carbs,
                      fats: selectedMeal.fats,
                      details: selectedMeal.details || []
                    }
              } 
              readOnly={false}
              onSave={handleUpdateMeal}
            />
          </div>
        </div>
      )}
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
