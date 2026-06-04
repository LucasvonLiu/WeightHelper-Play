import React, { useRef, useState } from 'react';

export default function CameraCapture({ onCapture, modelName, token }) {
  const fileInputRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);
  
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('份');
  const [isRecognizing, setIsRecognizing] = useState(false);

  // 'select' 为滚轮选择模式, 'keyboard' 为自由输入模式
  const [inputMode, setInputMode] = useState('select');

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
        
        // 每次重新选图重置默认值
        setFoodName('');
        setQuantity('1');
        setUnit('份');
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      alert('图片读取失败，请重试。');
    };
    reader.readAsDataURL(file);
    e.target.value = null; 
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

  const handleAnalyze = async () => {
    if (!foodName) {
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
      return; 
    }

    onCapture(previewImage, { foodName, quantity, unit });
  };

  const handleCancel = () => {
    setPreviewImage(null);
    setFoodName('');
    setQuantity('1');
    setUnit('份');
  };

  const toggleInputMode = () => {
    setInputMode(prev => prev === 'select' ? 'keyboard' : 'select');
  };

  if (previewImage) {
    return (
      <div className="capture-container fade-in" style={styles.container}>
        <div style={styles.previewWrapper}>
          {/* 模糊放大的背景 */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundImage: `url(${previewImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px) brightness(0.7)',
            transform: 'scale(1.1)',
            zIndex: 0
          }}></div>
          
          {/* 前景图片 */}
          <img src={previewImage} alt="preview" style={styles.previewImage} />
          
          <button onClick={handleRotate} style={styles.rotateBtn} disabled={isRecognizing}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
        
        <div style={styles.formContainer}>
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
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                <label style={{...styles.label, marginBottom: 0}}>数量</label>
                {/* 键盘切换图标 */}
                <svg onClick={toggleInputMode} style={{cursor: 'pointer', color: inputMode === 'keyboard' ? 'var(--accent-green)' : '#aaa'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                  <line x1="6" y1="8" x2="6.01" y2="8"></line>
                  <line x1="10" y1="8" x2="10.01" y2="8"></line>
                  <line x1="14" y1="8" x2="14.01" y2="8"></line>
                  <line x1="18" y1="8" x2="18.01" y2="8"></line>
                  <line x1="6" y1="12" x2="6.01" y2="12"></line>
                  <line x1="10" y1="12" x2="10.01" y2="12"></line>
                  <line x1="14" y1="12" x2="14.01" y2="12"></line>
                  <line x1="18" y1="12" x2="18.01" y2="12"></line>
                  <line x1="7" y1="16" x2="17" y2="16"></line>
                </svg>
              </div>
              {inputMode === 'select' ? (
                <select value={quantity} onChange={(e) => setQuantity(e.target.value)} style={styles.input} disabled={isRecognizing}>
                  {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              ) : (
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  style={styles.input}
                  disabled={isRecognizing}
                />
              )}
            </div>
            <div style={{flex: 1}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                <label style={{...styles.label, marginBottom: 0}}>单位</label>
              </div>
              {inputMode === 'select' ? (
                <select value={unit} onChange={(e) => setUnit(e.target.value)} style={styles.input} disabled={isRecognizing}>
                  <option value="个">个</option>
                  <option value="盘">盘</option>
                  <option value="碗">碗</option>
                  <option value="克">克</option>
                  <option value="份">份</option>
                  <option value="块">块</option>
                </select>
              ) : (
                <input 
                  type="text" 
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="盘/个"
                  style={styles.input}
                  disabled={isRecognizing}
                />
              )}
            </div>
          </div>
        </div>

        <div style={{display: 'flex', gap: '12px', width: '100%'}}>
          <button onClick={handleCancel} style={styles.secondaryBtn} disabled={isRecognizing}>重拍</button>
          <button onClick={handleAnalyze} style={styles.primaryBtn} disabled={isRecognizing}>
            {isRecognizing ? '正在智能识别...' : '分析'}
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
        <p>手、硬币、常规餐具入镜，将更准确哦～</p>
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
    borderRadius: '16px',
    overflow: 'hidden',
    minHeight: '180px',
    backgroundColor: '#000'
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    zIndex: 1,
    position: 'relative'
  },
  rotateBtn: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    zIndex: 2,
    backdropFilter: 'blur(4px)'
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'var(--card-bg)',
    padding: '16px',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: '20px'
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
    padding: '12px 8px',
    borderRadius: '10px',
    border: '1px solid #ddd',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#fafafa',
    WebkitAppearance: 'none'
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
