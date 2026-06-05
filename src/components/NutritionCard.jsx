import React, { useState, useEffect } from 'react';

export default function NutritionCard({ imageUrl, data, onReset, onSave, readOnly }) {
  const [posterUrl, setPosterUrl] = useState(null);
  
  const [editableFoods, setEditableFoods] = useState(() => data?.foods || (data ? [data] : []));
  const [portions, setPortions] = useState(() => (data?.foods || (data ? [data] : [])).map(() => 1));
  const [expandedPortions, setExpandedPortions] = useState({});

  const toggleExpand = (index) => {
    setExpandedPortions(prev => ({...prev, [index]: !prev[index]}));
  };

  const dataStr = JSON.stringify(data);

  useEffect(() => {
    const parsedData = JSON.parse(dataStr);
    const foods = parsedData?.foods || (parsedData ? [parsedData] : []);
    setEditableFoods(foods);
    setPortions(foods.map(() => 1));
  }, [dataStr]);

  if (!editableFoods.length) {
    return (
      <div className="nutrition-card fade-in" style={{...styles.container, justifyContent: 'center', alignItems: 'center'}}>
        <div style={{textAlign: 'center', marginBottom: '24px'}}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.5, marginBottom: '16px'}}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 style={{color: 'var(--text-primary)', marginTop: '16px', fontSize: '20px'}}>未识别到食物</h3>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px'}}>AI 在图里没找到吃的呢，换张图试试？</p>
        </div>
        {onReset && (
          <button style={{...styles.secondaryBtn, padding: '12px 24px', backgroundColor: '#f0f0f0', color: 'var(--text-primary)'}} onClick={onReset}>
            重新选择图片
          </button>
        )}
      </div>
    );
  }

  const handlePortionSelect = (index, ratio) => {
    const newPortions = [...portions];
    newPortions[index] = ratio;
    setPortions(newPortions);

    const originalFoods = data?.foods || (data ? [data] : []);
    const originalFood = originalFoods[index];

    const newFoods = [...editableFoods];
    newFoods[index] = {
      ...originalFood,
      calories: Math.round((originalFood.calories || 0) * ratio),
      protein: Math.round((originalFood.protein || 0) * ratio),
      carbs: Math.round((originalFood.carbs || 0) * ratio),
      fats: Math.round((originalFood.fats || 0) * ratio),
      details: (originalFood.details || []).map(item => ({
        ...item,
        amount: Math.round((item.amount || 0) * ratio)
      }))
    };
    setEditableFoods(newFoods);
  };

  const handleSaveAll = () => {
    if (data && !data.foods) {
      onSave(editableFoods[0]);
    } else {
      onSave(editableFoods);
    }
  };

  const totalCals = editableFoods.reduce((sum, f) => sum + (f.calories || 0), 0);
  const totalPro = editableFoods.reduce((sum, f) => sum + (f.protein || 0), 0);
  const totalCar = editableFoods.reduce((sum, f) => sum + (f.carbs || 0), 0);
  const totalFat = editableFoods.reduce((sum, f) => sum + (f.fats || 0), 0);

  const computedData = {
    foodName: editableFoods.length === 1 ? editableFoods[0].foodName : `今日饮食 (${editableFoods.length}项)`,
    calories: totalCals,
    protein: totalPro,
    carbs: totalCar,
    fats: totalFat
  };

  const generatePoster = (displayOnly = false) => {
    if (!imageUrl) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const dpr = Math.max(window.devicePixelRatio || 2, 2);
      canvas.width = img.width * dpr;
      canvas.height = img.height * dpr;
      ctx.scale(dpr, dpr);
      
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      const padding = Math.max(img.width * 0.018, 8);
      const baseFont = Math.max(img.width * 0.018, 8);
      
      const carbText = `碳水 ${computedData.carbs}g`;
      const proteinText = `· 蛋白 ${computedData.protein}g`;
      const fatText = `· 脂肪 ${computedData.fats}g`;
      
      ctx.font = `700 ${baseFont * 1.1}px sans-serif`;
      const nameWidth = ctx.measureText(computedData.foodName).width;
      ctx.font = `800 ${baseFont * 1.6}px sans-serif`;
      const calWidth = ctx.measureText(`${computedData.calories} kcal`).width;
      ctx.font = `500 ${baseFont * 0.75}px sans-serif`;
      const macroWidth = ctx.measureText(carbText + proteinText + fatText).width;
      
      const contentWidth = Math.max(nameWidth, calWidth, macroWidth);
      const boxWidth = contentWidth + padding * 2;
      const boxHeight = padding * 2 + baseFont * 3.6;
      
      const boxX = img.width - boxWidth - padding;
      const boxY = img.height - boxHeight - padding;
      
      let isLightBg = false;
      try {
        const imageData = ctx.getImageData(boxX, boxY, boxWidth, boxHeight);
        let r = 0, g = 0, b = 0;
        const step = 4 * 10; 
        let count = 0;
        for (let i = 0; i < imageData.data.length; i += step) {
          r += imageData.data[i];
          g += imageData.data[i+1];
          b += imageData.data[i+2];
          count++;
        }
        const brightness = (0.299 * (r/count) + 0.587 * (g/count) + 0.114 * (b/count));
        isLightBg = brightness > 120; 
      } catch(e) {}

      const cornerRadius = Math.floor(Math.min(boxWidth, boxHeight) * 0.1);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, [cornerRadius]);
      ctx.clip();

      ctx.filter = 'blur(30px) saturate(160%)';
      ctx.drawImage(img, 0, 0, img.width, img.height);
      ctx.filter = 'none';

      const gradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
      if (isLightBg) {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
        gradient.addColorStop(1, 'rgba(245, 245, 245, 0.30)');
      } else {
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.70)');
        gradient.addColorStop(1, 'rgba(30, 30, 30, 0.38)');
      }
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = isLightBg ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.18)';
      ctx.stroke();
      ctx.restore();
      
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      const textX = boxX + padding;
      let textY = boxY + padding;
      
      ctx.fillStyle = isLightBg ? '#222222' : '#f0f0f0';
      ctx.font = `700 ${baseFont * 1.1}px sans-serif`;
      ctx.fillText(computedData.foodName, textX, textY);
      
      textY += baseFont * 1.45;
      ctx.font = `800 ${baseFont * 1.6}px sans-serif`;
      ctx.fillStyle = isLightBg ? '#8B1A1A' : '#E87070';
      ctx.fillText(`${computedData.calories} kcal`, textX, textY);
      
      textY += baseFont * 1.9;
      ctx.font = `500 ${baseFont * 0.75}px sans-serif`;
      
      ctx.fillStyle = isLightBg ? '#8a6d3b' : '#D0C0A8';
      const cw = ctx.measureText(carbText).width;
      ctx.fillText(carbText, textX, textY);
      
      ctx.fillStyle = isLightBg ? '#3a7a4a' : '#A3BCA7';
      const pw = ctx.measureText(proteinText).width;
      ctx.fillText(proteinText, textX + cw + 2, textY);
      
      ctx.fillStyle = isLightBg ? '#7a5c2a' : '#E6D8C0';
      ctx.fillText(fatText, textX + cw + pw + 4, textY);
      
      if (displayOnly) {
        setPosterUrl(canvas.toDataURL('image/png'));
        return;
      }

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        canvas.toBlob(async (blob) => {
          const file = new File([blob], 'WeightHelper_Poster.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: '我的饮食打卡' });
            } catch (err) {
              setPosterUrl(canvas.toDataURL('image/png'));
            }
          } else {
            setPosterUrl(canvas.toDataURL('image/png'));
          }
        }, 'image/png');
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `WeightHelper_${new Date().getTime()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    
    img.src = imageUrl;
  };

  useEffect(() => {
    if (readOnly && imageUrl) {
      const timer = setTimeout(() => generatePoster(true), 200);
      return () => clearTimeout(timer);
    }
  }, [readOnly, imageUrl, computedData?.calories]);

  const totalMacros = totalPro + totalCar + totalFat;
  const getPercentage = (value) => totalMacros > 0 ? Math.round((value / totalMacros) * 100) : 0;

  const proteinPct = getPercentage(totalPro);
  const carbsPct = getPercentage(totalCar);
  const fatsPct = getPercentage(totalFat);

  const C = 226.19;
  const pOffset = C - (proteinPct / 100) * C;
  const cOffset = C - (carbsPct / 100) * C;
  const fOffset = C - (fatsPct / 100) * C;

  const donutLabels = [];
  let prevRightY = null;
  let prevLeftY = null;

  [
    { pct: proteinPct, label: "蛋白质", value: totalPro, color: "#A3BCA7" },
    { pct: carbsPct, label: "碳水", value: totalCar, color: "#D0D0C8" },
    { pct: fatsPct, label: "脂肪", value: totalFat, color: "#E6DFD3" }
  ].reduce((startPct, item) => {
    if (item.pct > 0) {
      const midPct = startPct + item.pct / 2;
      const angle = (-Math.PI / 2) + (midPct / 100) * 2 * Math.PI;
      const cx = 100, cy = 60, R = 36;
      
      const x1 = cx + (R + 4) * Math.cos(angle);
      const y1 = cy + (R + 4) * Math.sin(angle);
      
      let x2 = cx + (R + 16) * Math.cos(angle);
      let y2 = cy + (R + 16) * Math.sin(angle);
      
      const isRight = Math.cos(angle) >= 0;
      
      if (isRight) {
        if (prevRightY !== null && Math.abs(y2 - prevRightY) < 32) {
          y2 = prevRightY + (y2 >= prevRightY ? 32 : -32);
        }
        prevRightY = y2;
      } else {
        if (prevLeftY !== null && Math.abs(y2 - prevLeftY) < 32) {
          y2 = prevLeftY + (y2 >= prevLeftY ? 32 : -32);
        }
        prevLeftY = y2;
      }

      const x3 = isRight ? x2 + 12 : x2 - 12;
      const textX = isRight ? x3 + 6 : x3 - 6;
      const textAnchor = isRight ? "start" : "end";

      donutLabels.push({ x1, y1, x2, y2, x3, textX, textY: y2, isRight, ...item });
    }
    return startPct + item.pct;
  }, 0);

  return (
    <div className="nutrition-card fade-in" style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.foodName}>{computedData.foodName}</h3>
      </div>

      <div style={styles.mainStats}>
        <div style={styles.calorieCircle}>
          <span style={styles.calorieValue}>{computedData.calories}</span>
          <span style={styles.calorieUnit}>kcal</span>
        </div>
        
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <svg width="100%" height="120" viewBox="-10 0 220 120" style={{ overflow: 'visible' }}>
            <circle cx="100" cy="60" r="36" fill="transparent" stroke="#f0f0f0" strokeWidth="8" />
            <circle cx="100" cy="60" r="36" fill="transparent" stroke="#A3BCA7" strokeWidth="8" strokeDasharray={C} strokeDashoffset={pOffset} transform="rotate(-90 100 60)" strokeLinecap="round" />
            <circle cx="100" cy="60" r="36" fill="transparent" stroke="#D0D0C8" strokeWidth="8" strokeDasharray={C} strokeDashoffset={cOffset} transform={`rotate(${-90 + (proteinPct/100)*360} 100 60)`} strokeLinecap="round" />
            <circle cx="100" cy="60" r="36" fill="transparent" stroke="#E6DFD3" strokeWidth="8" strokeDasharray={C} strokeDashoffset={fOffset} transform={`rotate(${-90 + ((proteinPct+carbsPct)/100)*360} 100 60)`} strokeLinecap="round" />
            
            {donutLabels.map((l, i) => (
              <g key={i}>
                <polyline points={`${l.x1},${l.y1} ${l.x2},${l.y2} ${l.x3},${l.y2}`} fill="none" stroke={l.color} strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx={l.x1} cy={l.y1} r="3" fill={l.color} stroke="var(--card-bg)" strokeWidth="1.5" />
                <text x={l.textX} y={l.textY - 4} fill="var(--text-secondary)" fontSize="11" textAnchor={l.textAnchor}>
                  {l.label} <tspan fill="var(--text-primary)" fontWeight="600">{l.value}g</tspan>
                </text>
                <text x={l.textX} y={l.textY + 12} fill="var(--text-secondary)" fontSize="12" fontWeight="500" textAnchor={l.textAnchor}>
                  {l.pct}%
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div style={styles.foodList}>
        {editableFoods.map((food, index) => (
          <div key={index} style={styles.foodItem}>
            <div style={styles.foodHeader}>
              <h4 style={styles.foodItemName}>{food.foodName}</h4>
              <span style={styles.foodItemCalories}>{food.calories} kcal</span>
            </div>
            
            {!readOnly && (
              <div style={styles.portionContainer}>
                <div style={styles.portionChips}>
                  {[
                    { label: '1/4 份', value: 0.25 },
                    { label: '1/2 份', value: 0.5 },
                    { label: '3/4 份', value: 0.75 },
                    { label: '1 份', value: 1 },
                    { label: '1 ½ 份', value: 1.5 },
                  ].map(p => (
                    <button 
                      key={p.value} 
                      onClick={() => handlePortionSelect(index, p.value)}
                      style={{
                        ...styles.portionChip, 
                        ...(portions[index] === p.value ? styles.portionChipActive : {})
                      }}
                    >
                      {p.label}
                    </button>
                  ))}

                  {expandedPortions[index] && [
                    { label: '2 份', value: 2 },
                    { label: '3 份', value: 3 },
                    { label: '4 份', value: 4 },
                    { label: '5 份', value: 5 },
                  ].map(p => (
                    <button 
                      key={p.value} 
                      onClick={() => handlePortionSelect(index, p.value)}
                      style={{
                        ...styles.portionChip, 
                        ...(portions[index] === p.value ? styles.portionChipActive : {})
                      }}
                    >
                      {p.label}
                    </button>
                  ))}

                  <button
                    onClick={() => toggleExpand(index)}
                    style={{
                      ...styles.portionChip,
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: expandedPortions[index] ? '#f5f5f5' : 'transparent',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedPortions[index] ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div style={styles.detailsList}>
              {(food.details || []).map((item, dIndex) => (
                <div key={dIndex} style={styles.detailRow}>
                  <span style={styles.detailName}>{item.name}</span>
                  <div style={styles.detailInputWrapper}>
                    <span style={styles.amountInput}>{item.amount}</span>
                    <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>g/份</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!readOnly && (
        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={handleSaveAll}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <path d="M8 14h.01"></path>
              <path d="M12 14h.01"></path>
              <path d="M16 14h.01"></path>
              <path d="M8 18h.01"></path>
              <path d="M12 18h.01"></path>
              <path d="M16 18h.01"></path>
            </svg>
            {onReset ? '归档保存' : '保存修改'}
          </button>
          <button style={styles.posterBtn} onClick={() => generatePoster(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            保存图片
          </button>
          {onReset && (
            <button style={styles.secondaryBtn} onClick={onReset}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                <polyline points="1 4 1 10 7 10"></polyline>
                <polyline points="23 20 23 14 17 14"></polyline>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
              重新分析
            </button>
          )}
        </div>
      )}

      {readOnly && posterUrl && (
        <div style={{ marginTop: '16px', paddingBottom: '24px' }}>
          <img src={posterUrl} alt="打卡海报" style={{ width: '100%', borderRadius: '16px', display: 'block', boxShadow: 'var(--shadow-md)' }} />
        </div>
      )}

      {!readOnly && posterUrl && (
        <div style={styles.modalOverlay} onClick={() => setPosterUrl(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <img src={posterUrl} alt="打卡海报" style={styles.posterPreview} />
            <p style={styles.modalTip}>💡 长按上方图片，选择“存储图像”保存到相册</p>
            <button style={styles.modalCloseBtn} onClick={() => setPosterUrl(null)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 24px 88px 24px',
    backgroundColor: 'var(--card-bg)',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    marginBottom: '24px',
    paddingTop: '12px',
    display: 'flex',
    justifyContent: 'center'
  },
  foodName: {
    fontSize: '24px',
    color: 'var(--text-primary)',
    fontWeight: '600',
    textAlign: 'center'
  },
  mainStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '32px',
    backgroundColor: 'var(--bg-color)',
    padding: '24px',
    borderRadius: '24px',
  },
  calorieCircle: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    backgroundColor: 'var(--card-bg)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
    border: '4px solid var(--accent-green)',
    flexShrink: 0
  },
  calorieValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--accent-green)',
    lineHeight: '1',
  },
  calorieUnit: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  foodList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    marginBottom: '24px'
  },
  foodItem: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '1px solid #f0f0f0',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  foodHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid #f5f5f5',
    paddingBottom: '12px'
  },
  foodItemName: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  foodItemCalories: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--accent-green)'
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 8px',
    borderBottom: '1px solid #f5f5f5',
  },
  detailName: {
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: '500',
    flex: 1,
  },
  detailInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#f9f9f9',
    padding: '4px 10px',
    borderRadius: '8px',
  },
  amountInput: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--accent-green)',
    textAlign: 'right',
  },
  portionContainer: {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  portionLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)'
  },
  portionChips: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingBottom: '4px'
  },
  portionChip: {
    padding: '6px 14px',
    borderRadius: '16px',
    border: '1px solid #e0e0e0',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease'
  },
  portionChipActive: {
    backgroundColor: 'var(--accent-green)',
    color: '#fff',
    border: '1px solid var(--accent-green)'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '20px',
    paddingBottom: '24px',
  },
  primaryBtn: {
    backgroundColor: 'var(--accent-green)',
    color: '#fff',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  posterBtn: {
    backgroundColor: '#333',
    color: '#fff',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
  },
  modalContent: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '20px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: '400px',
  },
  posterPreview: {
    width: '100%',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  modalTip: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
    textAlign: 'center',
  },
  modalCloseBtn: {
    backgroundColor: '#eee',
    color: 'var(--text-primary)',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  }
};
