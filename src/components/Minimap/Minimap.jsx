import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { sound } from '../../utils/audio.js';
import styles from './Minimap.module.css';

export const Minimap = ({
  excalidrawAPI,
  isVisible = true,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const boundsRef = useRef({ minX: 0, minY: 0, maxX: 1000, maxY: 1000, scale: 1 });

  // Update & draw minimap
  const drawMinimap = useCallback(() => {
    if (!canvasRef.current || !excalidrawAPI || collapsed) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const elements = (excalidrawAPI.getSceneElements?.() || []).filter((el) => !el.isDeleted);
    const appState = excalidrawAPI.getAppState?.() || {};

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 220;
    const height = canvas.clientHeight || 130;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Calculate elements bounding box
    let minX = 0;
    let minY = 0;
    let maxX = 800;
    let maxY = 600;

    if (elements.length > 0) {
      minX = Math.min(...elements.map((el) => el.x));
      minY = Math.min(...elements.map((el) => el.y));
      maxX = Math.max(...elements.map((el) => el.x + (el.width || 0)));
      maxY = Math.max(...elements.map((el) => el.y + (el.height || 0)));
    }

    // Include current camera viewport into bounds calculation
    const zoom = appState.zoom?.value || 1;
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;
    const vpWidth = (appState.width || window.innerWidth) / zoom;
    const vpHeight = (appState.height || window.innerHeight) / zoom;
    const vpLeft = -scrollX;
    const vpTop = -scrollY;

    minX = Math.min(minX, vpLeft) - 200;
    minY = Math.min(minY, vpTop) - 200;
    maxX = Math.max(maxX, vpLeft + vpWidth) + 200;
    maxY = Math.max(maxY, vpTop + vpHeight) + 200;

    const worldWidth = Math.max(maxX - minX, 100);
    const worldHeight = Math.max(maxY - minY, 100);

    const scaleX = (width - 16) / worldWidth;
    const scaleY = (height - 16) / worldHeight;
    const scale = Math.min(scaleX, scaleY);
    boundsRef.current = { minX, minY, maxX, maxY, scale };

    const offsetX = (width - worldWidth * scale) / 2;
    const offsetY = (height - worldHeight * scale) / 2;

    // Draw subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw element outlines
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1;

    elements.forEach((el) => {
      const ex = offsetX + (el.x - minX) * scale;
      const ey = offsetY + (el.y - minY) * scale;
      const ew = Math.max((el.width || 4) * scale, 2);
      const eh = Math.max((el.height || 4) * scale, 2);

      ctx.fillRect(ex, ey, ew, eh);
      ctx.strokeRect(ex, ey, ew, eh);
    });

    // Draw active viewport rectangle
    const vx = offsetX + (vpLeft - minX) * scale;
    const vy = offsetY + (vpTop - minY) * scale;
    const vw = vpWidth * scale;
    const vh = vpHeight * scale;

    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.fillRect(vx, vy, vw, vh);

    ctx.restore();
  }, [excalidrawAPI, collapsed]);

  // Handle click & drag navigation on minimap
  const handlePointerNav = (e) => {
    if (!canvasRef.current || !excalidrawAPI) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { minX, minY, scale } = boundsRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const appState = excalidrawAPI.getAppState?.() || {};
    const zoom = appState.zoom?.value || 1;
    const vpWidth = (appState.width || window.innerWidth) / zoom;
    const vpHeight = (appState.height || window.innerHeight) / zoom;

    const worldWidth = boundsRef.current.maxX - minX;
    const worldHeight = boundsRef.current.maxY - minY;
    const offsetX = (width - worldWidth * scale) / 2;
    const offsetY = (height - worldHeight * scale) / 2;

    const targetWorldX = minX + (clickX - offsetX) / scale;
    const targetWorldY = minY + (clickY - offsetY) / scale;

    const newScrollX = -(targetWorldX - vpWidth / 2);
    const newScrollY = -(targetWorldY - vpHeight / 2);

    excalidrawAPI.updateScene({
      appState: {
        scrollX: newScrollX,
        scrollY: newScrollY,
      },
    });
  };

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    sound.playClick();
    handlePointerNav(e);
  };

  const handleMouseMove = (e) => {
    if (isDraggingRef.current) {
      handlePointerNav(e);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Sync animation loop on frame
  useEffect(() => {
    let animId;
    const loop = () => {
      drawMinimap();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [drawMinimap]);

  if (!isVisible) return null;

  return (
    <div className={`${styles.minimapContainer} ${collapsed ? styles.collapsedContainer : ''}`}>
      {/* Header */}
      <div
        className={styles.header}
        onClick={() => {
          sound.playSwitch();
          setCollapsed(!collapsed);
        }}
        title="Click to minimize/maximize radar minimap"
      >
        <div className={styles.titleGroup}>
          <div className={styles.radarDot} />
          <span className={styles.headerLabel}>RADAR HUD</span>
        </div>
        <button type="button" className={styles.toggleBtn} aria-label="Toggle Minimap">
          {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Canvas Viewport */}
      {!collapsed && (
        <>
          <div
            className={styles.canvasWrapper}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
            <canvas ref={canvasRef} className={styles.radarCanvas} />
            <div className={styles.crosshairCornerTL} />
            <div className={styles.crosshairCornerTR} />
            <div className={styles.crosshairCornerBL} />
            <div className={styles.crosshairCornerBR} />
          </div>

          <div className={styles.footer}>
            <span>DRAG TO PAN</span>
            <span>CLICK TO JUMP</span>
          </div>
        </>
      )}
    </div>
  );
};
