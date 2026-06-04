import React, { useState, useEffect } from 'react';

export default function NutritionCard({ imageUrl, data, onReset, onSave, readOnly }) {
  const [posterUrl, setPosterUrl] = useState(null);
  const [editableData, setEditableData] = useState(data);

  useEffect(() => {
    setEditableData(data);
  }, [data]);

  if (!editableData) return null;

  const handleAmountChange = (index, newAmountStr) => {
    const newAmount = parseInt(newAmountStr) || 0;
    const newDetails = [...editableData.details];
    newDetails[index] = { ...newDetails[index], amount: newAmount };

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    newDetails.forEach(item => {
      const macros = item.macrosPer100g || { calories: 0, protein: 0, carbs: 0, fats: 0 };
      const ratio = item.amount / 100;
      totalCalories += macros.calories * ratio;
      totalProtein += macros.protein * ratio;
      totalCarbs += macros.carbs * ratio;
      totalFats += macros.fats * ratio;
    });

    setEditableData({
      ...editableData,
      details: newDetails,
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fats: Math.round(totalFats)
    });
  };


  const generatePoster = (displayOnly = false) => {
    if (!imageUrl) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // 使用 devicePixelRatio 提升清晰度（视网膜屏适配）
      const dpr = Math.max(window.devicePixelRatio || 2, 2);
      canvas.width = img.width * dpr;
      canvas.height = img.height * dpr;
      ctx.scale(dpr, dpr);
      
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      const padding = Math.max(img.width * 0.018, 8);
      const baseFont = Math.max(img.width * 0.018, 8);
      
      // 各营养素分别用不同颜色，先算宽度
      const carbText = `碳水 ${editableData.carbs}g`;
      const proteinText = `· 蛋白 ${editableData.protein}g`;
      const fatText = `· 脂肪 ${editableData.fats}g`;
      
      ctx.font = `700 ${baseFont * 1.1}px sans-serif`;
      const nameWidth = ctx.measureText(editableData.foodName).width;
      ctx.font = `800 ${baseFont * 1.6}px sans-serif`;
      const calWidth = ctx.measureText(`${editableData.calories} kcal`).width;
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
      
      // 食物名称
      ctx.fillStyle = isLightBg ? '#222222' : '#f0f0f0';
      ctx.font = `700 ${baseFont * 1.1}px sans-serif`;
      ctx.fillText(editableData.foodName, textX, textY);
      
      // 卡路里：暗红色
      textY += baseFont * 1.45;
      ctx.font = `800 ${baseFont * 1.6}px sans-serif`;
      ctx.fillStyle = isLightBg ? '#8B1A1A' : '#E87070';
      ctx.fillText(`${editableData.calories} kcal`, textX, textY);
      
      // 各营养素分别用对应颜色
      textY += baseFont * 1.9;
      ctx.font = `500 ${baseFont * 0.75}px sans-serif`;
      
      // 碳水：沙鹿色 #C4A882
      ctx.fillStyle = isLightBg ? '#8a6d3b' : '#D0C0A8';
      const cw = ctx.measureText(carbText).width;
      ctx.fillText(carbText, textX, textY);
      
      // 蛋白: 绿色 #7aad84
      ctx.fillStyle = isLightBg ? '#3a7a4a' : '#A3BCA7';
      const pw = ctx.measureText(proteinText).width;
      ctx.fillText(proteinText, textX + cw + 2, textY);
      
      // 脂肪: 暖色 #c4a87a
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

  // readOnly 模式下自动生成海报展示（useEffect 放在 generatePoster 声明之后避免引用问题）
  useEffect(() => {
    if (readOnly && imageUrl) {
      const timer = setTimeout(() => generatePoster(true), 200);
      return () => clearTimeout(timer);
    }
  }, [readOnly, imageUrl, editableData?.calories]);

  const totalMacros = (editableData.protein || 0) + (editableData.carbs || 0) + (editableData.fats || 0);
  
  const getPercentage = (value) => totalMacros > 0 ? Math.round((value / totalMacros) * 100) : 0;

  const proteinPct = getPercentage(editableData.protein);
  const carbsPct = getPercentage(editableData.carbs);
  const fatsPct = getPercentage(editableData.fats);

  // For SVG donut chart (circumference = 2 * PI * R)
  // R = 36, C = 226.19
  const C = 226.19;
  const pOffset = C - (proteinPct / 100) * C;
  const cOffset = C - (carbsPct / 100) * C;
  const fOffset = C - (fatsPct / 100) * C;

  const donutLabels = [];
  let prevRightY = null;
  let prevLeftY = null;

  [
    { pct: proteinPct, label: "蛋白质", value: editableData.protein, color: "#A3BCA7" },
    { pct: carbsPct, label: "碳水", value: editableData.carbs, color: "#D0D0C8" },
    { pct: fatsPct, label: "脂肪", value: editableData.fats, color: "#E6DFD3" }
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
        <h3 style={styles.foodName}>{editableData.foodName}</h3>
      </div>

      <div style={styles.mainStats}>
        <div style={styles.calorieCircle}>
          <span style={styles.calorieValue}>{editableData.calories}</span>
          <span style={styles.calorieUnit}>kcal</span>
        </div>
        
        {/* 右侧：宏量营养素环形图带拉线标注 */}
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

      <div style={styles.detailsList}>
        {editableData.details.map((item, index) => (
          <div key={index} style={styles.detailRow}>
            <span style={styles.detailName}>{item.name}</span>
            <div style={styles.detailInputWrapper}>
              {readOnly ? (
                <span style={{...styles.amountInput, display: 'inline-block'}}>{item.amount}</span>
              ) : (
                <input 
                  type="number" 
                  value={item.amount === 0 ? '' : item.amount} 
                  onChange={(e) => handleAmountChange(index, e.target.value)}
                  style={styles.amountInput}
                  min="0"
                />
              )}
              <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>g</span>
            </div>
          </div>
        ))}
      </div>

      {!readOnly && (
        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={() => onSave(editableData)}>
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
            归档
          </button>
          <button style={styles.posterBtn} onClick={() => generatePoster(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            保存图片
          </button>
          <button style={styles.secondaryBtn} onClick={onReset}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
              <polyline points="1 4 1 10 7 10"></polyline>
              <polyline points="23 20 23 14 17 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            重新分析
          </button>
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

function MacroItem({ label, value, percentage, color }) {
  return (
    <div style={styles.macroItem}>
      <div style={{...styles.macroColorDot, backgroundColor: color}}></div>
      <div style={styles.macroInfo}>
        <span style={styles.macroLabel}>{label}</span>
        <span style={styles.macroValue}>{value}</span>
      </div>
      <span style={styles.macroPercentage}>{percentage}</span>
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
  macrosContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  macrosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  donutWrapper: {
    width: '80px',
    height: '80px',
    flexShrink: 0,
    marginLeft: '12px'
  },
  macroItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  macroColorDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
  },
  macroInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '40px'
  },
  macroLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  macroValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  macroPercentage: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginLeft: 'auto'
  },
  detailsList: {
    marginBottom: 'auto',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 12px',
    borderBottom: '1px solid #f0f0f0',
  },
  detailName: {
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontWeight: '500',
    flex: 1,
  },
  detailInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#f5f5f5',
    padding: '6px 12px',
    borderRadius: '12px',
  },
  amountInput: {
    width: '46px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--accent-green)',
    textAlign: 'right',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '40px',
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
