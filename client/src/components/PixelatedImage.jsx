import React, { useRef, useEffect, useState } from 'react';

export default function PixelatedImage({ 
  src, 
  alt, 
  style, 
  className, 
  blocksCount = 30, // 初始像素块尺寸（横/向最大块数，越小像素化越重）
  allowHoverReveal = true // 是否允许悬停/触摸时过渡平滑复原为原图
}) {
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentBlocks, setCurrentBlocks] = useState(blocksCount);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous'; // 解决跨域 Canvas 污染
    img.src = src;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      
      // 使用 CSS 实际渲染尺寸，保证像素方块比例协调
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || img.width;
      const h = rect.height || img.height;
      
      // 设置画布画布的高分物理分辨率，防止渲染模糊
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      const render = () => {
        if (!canvasRef.current) return;
        ctx.clearRect(0, 0, w, h);

        const targetBlocks = isHovered && allowHoverReveal ? 400 : blocksCount;
        
        // 丝滑阻尼插值动画 (Lerp)
        const diff = targetBlocks - currentBlocks;
        let nextBlocks = currentBlocks + diff * 0.12;

        if (Math.abs(diff) < 0.5) {
          nextBlocks = targetBlocks;
        }
        
        setCurrentBlocks(nextBlocks);

        if (nextBlocks >= 300) {
          // 彻底恢复为高清原始图像
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, 0, 0, w, h);
        } else {
          // 像素插值滤镜逻辑
          const scale = nextBlocks / Math.max(img.width, img.height);
          const scaledW = Math.max(1, img.width * scale);
          const scaledH = Math.max(1, img.height * scale);

          // 在内存中创建一个极小的临时 canvas，将图片缩放
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = scaledW;
          tempCanvas.height = scaledH;
          tempCtx.drawImage(img, 0, 0, scaledW, scaledH);

          // 关键：关闭抗锯齿，使拉伸放大回原尺寸时，色块边界清晰锐利
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, 0, 0, scaledW, scaledH, 0, 0, w, h);
        }

        if (nextBlocks !== targetBlocks) {
          animationRef.current = requestAnimationFrame(render);
        }
      };

      // 每次变化触发重绘
      render();
    };

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [src, isHovered, currentBlocks, blocksCount, allowHoverReveal]);

  return (
    <div 
      onMouseEnter={() => allowHoverReveal && setIsHovered(true)}
      onMouseLeave={() => allowHoverReveal && setIsHovered(false)}
      onTouchStart={() => allowHoverReveal && setIsHovered(true)}
      onTouchEnd={() => allowHoverReveal && setIsHovered(false)}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden',
        cursor: allowHoverReveal ? 'pointer' : 'default',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className={className}
    >
      <canvas 
        ref={canvasRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block',
          objectFit: 'cover'
        }} 
      />
    </div>
  );
}
