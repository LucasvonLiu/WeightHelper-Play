import React, { useRef } from 'react';

export default function CameraCapture({ onCapture }) {
  const fileInputRef = useRef(null);

  const handleAreaClick = () => {
    // 触发隐藏的 file input 点击事件
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 校验文件类型是否为图片
    if (!file.type.startsWith('image/')) {
      alert('请选择一张图片文件！');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      // 读取成功后，将图片的 Base64 数据传回给父组件
      onCapture(reader.result);
    };
    reader.onerror = () => {
      alert('图片读取失败，请重试。');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="capture-container fade-in" style={styles.container}>
      <header style={{ textAlign: 'center', marginBottom: '32px', padding: '0 12px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '500', color: 'var(--accent-green)', letterSpacing: '1px' }}>
          祝你们健康，我的家人！<br />
          <span style={{ fontSize: '14px', opacity: 0.8, display: 'inline-block', marginTop: '8px' }}>——刘钟泽</span>
        </h1>
      </header>

      {/* 隐藏的真实文件输入框 */}
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
        <p>💡 提示：尽量从正上方拍摄，保证光线充足。</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '40px 24px 88px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '60px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'var(--accent-green)',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '15px',
  },
  uploadArea: {
    width: '100%',
    aspectRatio: '1',
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
    marginBottom: '20px',
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
  }
};
