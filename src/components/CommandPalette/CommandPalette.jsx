import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Compass,
  FileCode,
  Image as ImageIcon,
  Code as SvgIcon,
  Copy,
  Trash2,
  Grid,
  Square,
  FileText,
  CornerDownLeft,
} from 'lucide-react';
import { sound } from '../../utils/audio.js';
import styles from './CommandPalette.module.css';

export const CommandPalette = ({
  isOpen,
  onClose,
  excalidrawAPI,
  currentPreset = 'grid',
  onSelectPreset,
  isMinimapVisible = true,
  onToggleMinimap,
  isSoundEnabled = true,
  onToggleSound,
  onExportPNG,
  onExportSVG,
  onExportExcalidraw,
  onCopyClipboard,
  flows = [],
  currentFlowId,
  onNavigateFlow,
  onClearCanvas,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      sound.playSwitch();
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Define commands
  const allCommands = useMemo(() => {
    const list = [
      // Viewport & Zoom
      {
        id: 'zoom-fit',
        category: 'Canvas Viewport',
        title: 'Zoom to Fit All Elements',
        desc: 'Centers and scales camera to fit all active elements',
        icon: <Maximize2 size={15} />,
        shortcut: ['⇧', '1'],
        action: () => {
          if (excalidrawAPI) {
            const elements = excalidrawAPI.getSceneElements();
            if (elements.length > 0) {
              excalidrawAPI.scrollToContent(elements, { fitToViewport: true });
            }
          }
        },
      },
      {
        id: 'zoom-reset',
        category: 'Canvas Viewport',
        title: 'Reset Zoom to 100%',
        desc: 'Reset scale to default 1:1 pixel grid',
        icon: <Minimize2 size={15} />,
        shortcut: ['⇧', '0'],
        action: () => {
          if (excalidrawAPI) {
            excalidrawAPI.updateScene({ appState: { zoom: { value: 1 } } });
          }
        },
      },
      {
        id: 'zoom-in',
        category: 'Canvas Viewport',
        title: 'Zoom In',
        desc: 'Increase camera magnification',
        icon: <ZoomIn size={15} />,
        shortcut: ['+'],
        action: () => {
          if (excalidrawAPI) {
            const current = excalidrawAPI.getAppState()?.zoom?.value || 1;
            excalidrawAPI.updateScene({ appState: { zoom: { value: Math.min(current * 1.25, 30) } } });
          }
        },
      },
      {
        id: 'zoom-out',
        category: 'Canvas Viewport',
        title: 'Zoom Out',
        desc: 'Decrease camera magnification',
        icon: <ZoomOut size={15} />,
        shortcut: ['-'],
        action: () => {
          if (excalidrawAPI) {
            const current = excalidrawAPI.getAppState()?.zoom?.value || 1;
            excalidrawAPI.updateScene({ appState: { zoom: { value: Math.max(current / 1.25, 0.1) } } });
          }
        },
      },

      // Canvas Styles (Grid / No Grid)
      {
        id: 'canvas-grid',
        category: 'Canvas Style',
        title: 'Canvas: Grid Mode',
        desc: 'Enable technical drafting grid',
        icon: <Grid size={15} />,
        shortcut: currentPreset === 'grid' ? ['ACTIVE'] : undefined,
        action: () => onSelectPreset?.('grid'),
      },
      {
        id: 'canvas-nogrid',
        category: 'Canvas Style',
        title: 'Canvas: No Grid Mode',
        desc: 'Clean blank distraction-free canvas',
        icon: <Square size={15} />,
        shortcut: currentPreset === 'nogrid' ? ['ACTIVE'] : undefined,
        action: () => onSelectPreset?.('nogrid'),
      },

      // Canvas Exports & Clipboard
      {
        id: 'copy-clipboard',
        category: 'Export & Sharing',
        title: 'Copy Diagram Image to Clipboard',
        desc: 'Rasterizes current diagram directly to system clipboard as PNG',
        icon: <Copy size={15} />,
        shortcut: ['⌘', 'C'],
        action: () => onCopyClipboard?.(),
      },
      {
        id: 'export-png',
        category: 'Export & Sharing',
        title: 'Export as High-Res PNG',
        desc: 'Download transparent or background raster image',
        icon: <ImageIcon size={15} />,
        action: () => onExportPNG?.(),
      },
      {
        id: 'export-svg',
        category: 'Export & Sharing',
        title: 'Export as Scalable SVG Vector',
        desc: 'Vector format ideal for docs, READMEs, and Figma import',
        icon: <SvgIcon size={15} />,
        action: () => onExportSVG?.(),
      },
      {
        id: 'export-excalidraw',
        category: 'Export & Sharing',
        title: 'Export Raw .excalidraw File',
        desc: 'Lossless editable schema backup',
        icon: <FileCode size={15} />,
        action: () => onExportExcalidraw?.(),
      },

      // HUD & Feedback Controls
      {
        id: 'toggle-minimap',
        category: 'HUD Controls',
        title: isMinimapVisible ? 'Hide Minimap Radar' : 'Show Minimap Radar',
        desc: 'Toggle spatial navigation minimap in bottom-right corner',
        icon: <Compass size={15} />,
        shortcut: ['M'],
        action: () => onToggleMinimap?.(),
      },
      {
        id: 'toggle-sound',
        category: 'HUD Controls',
        title: isSoundEnabled ? 'Disable Mechanical Audio Haptics' : 'Enable Mechanical Audio Haptics',
        desc: 'Zero-latency synthetic physical switch audio feedback',
        icon: isSoundEnabled ? <VolumeX size={15} /> : <Volume2 size={15} />,
        shortcut: ['S'],
        action: () => onToggleSound?.(),
      },
      {
        id: 'toggle-grid',
        category: 'HUD Controls',
        title: 'Toggle Canvas Grid Snapping',
        desc: 'Toggle Excalidraw native coordinate grid snapping',
        icon: <Grid size={15} />,
        shortcut: ['G'],
        action: () => {
          if (excalidrawAPI) {
            const currentGrid = excalidrawAPI.getAppState()?.gridModeEnabled;
            excalidrawAPI.updateScene({ appState: { gridModeEnabled: !currentGrid } });
          }
        },
      },
      {
        id: 'clear-canvas',
        category: 'Canvas Operations',
        title: 'Clear Entire Canvas',
        desc: 'Wipe all elements from this diagram (with prompt)',
        icon: <Trash2 size={15} />,
        action: () => onClearCanvas?.(),
      },
    ];

    // Other flows to jump to
    const otherFlows = flows.filter((f) => f.id !== currentFlowId).slice(0, 5);
    otherFlows.forEach((f) => {
      list.push({
        id: `flow-${f.id}`,
        category: 'Jump to Diagram',
        title: f.name || 'Untitled Flow',
        desc: `Switch active diagram session`,
        icon: <FileText size={15} />,
        action: () => onNavigateFlow?.(f.id),
      });
    });

    return list;
  }, [
    excalidrawAPI,
    currentPreset,
    onSelectPreset,
    isMinimapVisible,
    onToggleMinimap,
    isSoundEnabled,
    onToggleSound,
    onExportPNG,
    onExportSVG,
    onExportExcalidraw,
    onCopyClipboard,
    flows,
    currentFlowId,
    onNavigateFlow,
    onClearCanvas,
  ]);

  // Filter commands by query
  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.desc.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        sound.playClick();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        sound.playClick();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          sound.playChime();
          selected.action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.querySelector(`.${styles.activeItem}`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.paletteOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.paletteBox}>
        {/* Search header */}
        <div className={styles.searchHeader}>
          <Search size={16} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Type a command or jump to diagram..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className={styles.escBadge}>ESC</span>
        </div>

        {/* Results */}
        <div className={styles.resultsList} ref={resultsRef}>
          {filtered.length === 0 ? (
            <div className={styles.emptyResults}>No matching commands or diagrams</div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const prevCategory = idx > 0 ? filtered[idx - 1].category : null;
              const isFirstInCategory = item.category !== prevCategory;

              return (
                <div key={item.id}>
                  {isFirstInCategory && (
                    <div className={styles.categoryLabel}>{item.category}</div>
                  )}
                  <div
                    className={`${styles.resultItem} ${isSelected ? styles.activeItem : ''}`}
                    onClick={() => {
                      sound.playChime();
                      item.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className={styles.itemLeft}>
                      <span className={styles.itemIcon}>{item.icon}</span>
                      <div className={styles.itemLabelGroup}>
                        <span className={styles.itemTitle}>{item.title}</span>
                        <span className={styles.itemDesc}>{item.desc}</span>
                      </div>
                    </div>

                    {item.shortcut && (
                      <div className={styles.itemShortcut}>
                        {item.shortcut.map((key, kIdx) => (
                          <span key={kIdx} className="keycap">
                            {key}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts tip */}
        <div className={styles.footerBar}>
          <div className={styles.footerTips}>
            <span className={styles.footerTip}>
              <span className="keycap">↑</span>
              <span className="keycap">↓</span> Navigate
            </span>
            <span className={styles.footerTip}>
              <span className="keycap">
                <CornerDownLeft size={10} />
              </span>{' '}
              Select
            </span>
            <span className={styles.footerTip}>
              <span className="keycap">ESC</span> Close
            </span>
          </div>
          <div>EasyDraw Studio Command HUD</div>
        </div>
      </div>
    </div>
  );
};
