import React, { useRef, useState } from 'react';

export default function CameraCapture({ onCapture, modelName, token }) {
  const fileInputRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);
  
  // V2.1.1 新增结构化状态
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);

  const handleAreaClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择一张图片文件！');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round(height * (MAX_SIZE / width));
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round(width * (MAX_SIZE / height));
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setPreviewImage(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      alert('图片读取失败，请重试。');
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset input
  };

  const handleRotate = () => {
    if (!previewImage) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      const rotatedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      setPreviewImage(rotatedBase64);
    };
    img.src = previewImage;
  };

  // v2.1.1 核心路由逻辑：单按钮智能分发
  const handleAnalyze = async () => {
    // 路线 A 第一步：如果三个参数都为空，先去粗粒度识别
    if (!foodName && !quantity && !unit) {
      setIsRecognizing(true);
      try {
        const res = await fetch('/api/recognize_basic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image: previewImage })
        });
        
        if (res.ok) {
          const data = await res.json();
          setFoodName(data.name || '');
          setQuantity(data.quantity ? String(data.quantity) : '1');
          setUnit(data.unit || '份');
        } else {
          alert('智能识别失败，请直接手动输入');
        }
      } catch (e) {
        console.error(e);
        alert('智能识别失败，请直接手动输入');
      } finally {
        setIsRecognizing(false);
      }
      return; // 停留在此页面，让用户核对
    }

    // 路线 A 第二步（或路线 B）：已有数据，直接发起深度分析
    onCapture(previewImage, { foodName, quantity, unit });
  };

  const handleCancel = () => {
    setPreviewImage(null);
    setFoodName('');
    setQuantity('');
    setUnit('');
  };

  if (previewImage) {
    return (
      <div className="capture-container fade-in" style={styles.container}>
        <div style={styles.previewWrapper}>
          <img src={previewImage} alt="preview" style={styles.previewImage} />
          <button onClick={handleRotate} style={styles.rotateBtn} disabled={isRecognizing}>🔄 旋转</button>
        </div>
        
        <div style={styles.formContainer}>
          <div style={styles.formHint}>
            <span style={{fontWeight: 600}}>核对食物信息</span>
            <span style={{fontSize: '12px', color: '#888'}}>直接分析 或 补全信息</span>
          </div>
          
          <div style={styles.formRow}>
            <div style={{flex: 2}}>
              <label style={styles.label}>名称</label>
              <input 
                type="text" 
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="如: 番茄炒蛋"
                style={styles.input}
                disabled={isRecognizing}
              />
            </div>
            <div style={{flex: 1}}>
              <label style={styles.label}>数量</label>
              <input 
                type="number" 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                style={styles.input}
                disabled={isRecognizing}
              />
            </div>
            <div style={{flex: 1}}>
              <label style={styles.label}>单位</label>
              <input 
                type="text" 
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="盘/个"
                style={styles.input}
                disabled={isRecognizing}
              />
            </div>
          </div>
        </div>

        <div style={{display: 'flex', gap: '12px', width: '100%'}}>
          <button onClick={handleCancel} style={styles.secondaryBtn} disabled={isRecognizing}>重拍</button>
          <button onClick={handleAnalyze} style={styles.primaryBtn} disabled={isRecognizing}>
            {isRecognizing ? '正在智能识别...' : '🚀 分析'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="capture-container fade-in" style={styles.container}>
      <header style={{ textAlign: 'center', marginBottom: '20px', padding: '0 12px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--accent-green)', letterSpacing: '1px' }}>
          祝你们健康，我的家人！<br />
          <span style={{ fontSize: '14px', opacity: 0.8, display: 'inline-block', marginTop: '8px' }}>——刘钟泽</span>
        </h1>
      </header>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <div className="upload-area" style={styles.uploadArea} onClick={handleAreaClick}>
        <div style={styles.iconWrapper}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
        <h3 style={styles.uploadTitle}>选择或拍摄食物照片</h3>
        <p style={styles.uploadHint}>点击此处从相册选择或直接拍照</p>
      </div>

      <div style={styles.tips}>
        <p>💡 提示：为了让 AI 估算重量更准，建议在画面边缘放入您的手、硬币或常规餐具作为比例尺哦！</p>
      </div>
      
      {modelName && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.6, marginTop: '8px', marginBottom: '8px' }}>
          正在使用: {modelName}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '8px 24px 88px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: 'calc(100vh - 120px)'
  },
  uploadArea: {
    width: '100%',
    flex: 1,
    minHeight: '220px',
    maxHeight: '320px',
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    border: '2px dashed var(--accent-green-light)',
    transition: 'all 0.3s ease',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-green-light)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
  },
  uploadTitle: {
    fontSize: '18px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  uploadHint: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  tips: {
    marginTop: 'auto',
    marginBottom: '20px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--accent-green-light)',
    padding: '12px 20px',
    borderRadius: '20px',
  },
  previewWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: '20px',
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: '16px',
    overflow: 'hidden',
    minHeight: '180px'
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
  },
  rotateBtn: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'var(--card-bg)',
    padding: '16px',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: '20px'
  },
  formHint: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    color: 'var(--text-primary)',
    fontSize: '14px'
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    width: '100%'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #ddd',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#fafafa'
  },
  primaryBtn: {
    flex: 2,
    backgroundColor: 'var(--accent-green)',
    color: '#fff',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    color: 'var(--text-primary)',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer'
  }
};
