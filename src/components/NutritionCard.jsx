import React, { useState } from 'react';

export default function NutritionCard({ imageUrl, data, onReset, onSave }) {
  const [posterUrl, setPosterUrl] = useState(null);

  if (!data) return null;

  const generatePoster = () => {
    if (!imageUrl) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // 1. 绘制原图
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      // 2. 动态计算版面尺寸 (根据文字长度，极简紧凑)
      const padding = Math.max(img.width * 0.025, 12);
      const baseFont = Math.max(img.width * 0.025, 12);
      const macroText = `碳水 ${data.carbs}g · 蛋白 ${data.protein}g · 脂肪 ${data.fats}g`;
      
      // 测量文本宽度
      ctx.font = `900 ${baseFont * 1.3}px sans-serif`;
      const nameWidth = ctx.measureText(data.foodName).width;
      ctx.font = `900 ${baseFont * 1.8}px sans-serif`;
      const calWidth = ctx.measureText(`${data.calories} kcal`).width;
      ctx.font = `600 ${baseFont * 0.85}px sans-serif`;
      const macroWidth = ctx.measureText(macroText).width;
      
      const contentWidth = Math.max(nameWidth, calWidth, macroWidth);
      // 紧凑的背景框
      const boxWidth = contentWidth + padding * 2;
      const boxHeight = padding * 2 + baseFont * 3.8; 
      
      const boxX = img.width - boxWidth - padding;
      const boxY = img.height - boxHeight - padding;
      
      // 3. 背景颜色采样，决定深色还是浅色主题
      let isLightBg = false;
      try {
        const imageData = ctx.getImageData(boxX, boxY, boxWidth, boxHeight);
        let r = 0, g = 0, b = 0;
        const step = 4 * 10; // 每 10 个像素采样一次
        let count = 0;
        for (let i = 0; i < imageData.data.length; i += step) {
          r += imageData.data[i];
          g += imageData.data[i+1];
          b += imageData.data[i+2];
          count++;
        }
        // 计算区域平均亮度 (0-255)
        const brightness = (0.299 * (r/count) + 0.587 * (g/count) + 0.114 * (b/count));
        isLightBg = brightness > 120; // 亮度大于 120 判定为浅色背景
      } catch(e) {
        console.warn("背景颜色采样失败", e);
      }

      // 4. 绘制动态自适应的毛玻璃框
      const cornerRadius = Math.floor(Math.min(boxWidth, boxHeight) * 0.1);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, [cornerRadius]);
      ctx.clip();

      // 毛玻璃滤镜
      ctx.filter = 'blur(25px) saturate(140%)';
      ctx.drawImage(img, 0, 0, img.width, img.height);
      ctx.filter = 'none';

      // 动态遮罩，深底色用黑遮罩，浅底色用白遮罩
      const gradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
      if (isLightBg) {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
        gradient.addColorStop(1, 'rgba(240, 240, 240, 0.25)');
      } else {
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0.35)');
      }
      ctx.fillStyle = gradient;
      ctx.fill();

      // 玻璃边缘反光
      ctx.lineWidth = 2;
      ctx.strokeStyle = isLightBg ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.25)';
      ctx.stroke();
      ctx.restore();
      
      // 5. 绘制文字 (根据深浅主题自动反色，紧凑排版)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      const textX = boxX + padding;
      let textY = boxY + padding;
      
      // 食物名
      ctx.fillStyle = isLightBg ? '#111111' : '#ffffff';
      ctx.font = `900 ${baseFont * 1.3}px sans-serif`;
      ctx.shadowColor = isLightBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.fillText(data.foodName, textX, textY);
      
      // 总热量
      textY += baseFont * 1.6;
      ctx.font = `900 ${baseFont * 1.8}px sans-serif`;
      ctx.fillStyle = isLightBg ? '#1b4010' : '#8deb75';
      ctx.shadowBlur = 2;
      ctx.fillText(`${data.calories} kcal`, textX, textY);
      
      // 三大宏量营养素
      textY += baseFont * 2.1;
      ctx.font = `600 ${baseFont * 0.85}px sans-serif`;
      ctx.fillStyle = isLightBg ? '#444444' : '#dddddd';
      ctx.shadowColor = 'transparent';
      ctx.fillText(macroText, textX, textY);
      
      // 6. 导出逻辑：区分移动端和桌面端
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // 移动端：尝试原生分享面板 (iOS有“存储图像”按钮)，或降级为长按保存
        canvas.toBlob(async (blob) => {
          const file = new File([blob], 'WeightHelper_Poster.jpg', { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: '我的饮食打卡',
              });
            } catch (err) {
              // 用户取消分享或分享失败，降级为弹窗长按保存
              console.error(err);
              setPosterUrl(canvas.toDataURL('image/jpeg', 0.9));
            }
          } else {
            // 不支持 Share API，降级为弹窗长按保存
            setPosterUrl(canvas.toDataURL('image/jpeg', 0.9));
          }
        }, 'image/jpeg', 0.9);
      } else {
        // 桌面端 (Mac/PC)：直接触发浏览器下载到“下载”文件夹
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.download = `WeightHelper_Poster_${new Date().getTime()}.jpg`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    
    img.src = imageUrl;
  };

  const totalMacros = data.protein + data.carbs + data.fats;
  
  const getPercentage = (value) => Math.round((value / totalMacros) * 100) + '%';

  return (
    <div className="nutrition-card fade-in" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>扫描分析结果</h2>
        <h3 style={styles.foodName}>{data.foodName}</h3>
      </div>

      <div style={styles.mainStats}>
        <div style={styles.calorieCircle}>
          <span style={styles.calorieValue}>{data.calories}</span>
          <span style={styles.calorieUnit}>kcal</span>
        </div>
        <div style={styles.macrosList}>
          <MacroItem label="蛋白质" value={`${data.protein}g`} percentage={getPercentage(data.protein)} color="#A3BCA7" />
          <MacroItem label="碳水" value={`${data.carbs}g`} percentage={getPercentage(data.carbs)} color="#D0D0C8" />
          <MacroItem label="脂肪" value={`${data.fats}g`} percentage={getPercentage(data.fats)} color="#E6DFD3" />
        </div>
      </div>

      <div style={styles.detailsList}>
        <h4 style={styles.detailsTitle}>食物成分估算</h4>
        {data.details.map((item, index) => (
          <div key={index} style={styles.detailRow}>
            <span style={styles.detailName}>{item.name}</span>
            <span style={styles.detailAmount}>{item.amount}</span>
          </div>
        ))}
      </div>

      <div style={styles.actions}>
        <button style={styles.primaryBtn} onClick={() => onSave(data)}>记录这一餐</button>
        <button style={styles.posterBtn} onClick={generatePoster}>📸 生成打卡海报</button>
        <button style={styles.secondaryBtn} onClick={onReset}>重新扫描</button>
      </div>

      {/* 海报预览弹窗 (用于不支持 Share API 或用户取消分享时降级) */}
      {posterUrl && (
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
    marginBottom: '32px',
    paddingTop: '20px',
  },
  title: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  foodName: {
    fontSize: '24px',
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
  mainStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '40px',
    backgroundColor: 'var(--bg-color)',
    padding: '20px',
    borderRadius: 'var(--border-radius)',
  },
  calorieCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: 'var(--card-bg)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
    border: '4px solid var(--accent-green)',
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
  macrosList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  macroItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  macroColorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '4px',
  },
  macroInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  macroLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  macroValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  macroPercentage: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  detailsList: {
    marginBottom: 'auto',
  },
  detailsTitle: {
    fontSize: '16px',
    marginBottom: '16px',
    color: 'var(--text-primary)',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #eee',
  },
  detailName: {
    color: 'var(--text-primary)',
    fontSize: '15px',
  },
  detailAmount: {
    color: 'var(--text-secondary)',
    fontSize: '15px',
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
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
  },
  posterBtn: {
    backgroundColor: '#333',
    color: '#fff',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '500',
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
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: '400px',
  },
  posterPreview: {
    width: '100%',
    borderRadius: '8px',
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
    padding: '12px 24px',
    borderRadius: '24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  }
};
