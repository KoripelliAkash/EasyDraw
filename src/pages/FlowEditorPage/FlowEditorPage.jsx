import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Excalidraw,
  exportToBlob,
  exportToSvg,
  exportToClipboard,
  useHandleLibrary,
} from '@excalidraw/excalidraw';
import {
  ArrowLeft,
  Download,
  Upload,
  Check,
  Loader2,
  FileCode,
  Image as ImageIcon,
  Code as SvgIcon,
  ChevronDown,
  Sun,
  Moon,
  Trash2,
  Library as LibraryIcon,
  Copy,
  Command,
  Grid,
  Square,
} from 'lucide-react';
import { useWorkspace } from '../../context/useWorkspace.js';
import { useTheme } from '../../context/useTheme.js';
import {
  getScene,
  saveScene,
  updateFlowTimestamp,
  libraryAdapter,
} from '../../storage/index.js';
import { THEMES } from '../../types/index.js';
import { LibraryBrowserModal } from '../../components/Modals/LibraryBrowserModal.jsx';
import { CommandPalette } from '../../components/CommandPalette/CommandPalette.jsx';
import { Minimap } from '../../components/Minimap/Minimap.jsx';
import { CanvasStatusBar } from '../../components/CanvasStatusBar/CanvasStatusBar.jsx';
import { sound } from '../../utils/audio.js';
import styles from './FlowEditorPage.module.css';

const PRESET_CONFIGS = {
  grid: {
    label: 'Grid',
    desc: 'Technical drafting grid',
    hasGrid: true,
  },
  nogrid: {
    label: 'No Grid',
    desc: 'Clean blank canvas',
    hasGrid: false,
  },
};

const PRESETS = Object.entries(PRESET_CONFIGS).map(([id, cfg]) => ({
  id,
  label: cfg.label,
  desc: cfg.desc,
  hasGrid: cfg.hasGrid,
}));

const DEFAULT_DARK_BG = '#000000';
const DEFAULT_LIGHT_BG = '#ffffff';

/**
 * Checks if a canvas background color is the default/neutral theme color.
 * If the user has not changed to a custom color, it returns true so we match the active theme:
 * black in dark mode, white in light mode.
 */
const isDefaultCanvasBg = (color) => {
  if (!color || typeof color !== 'string') return true;
  const c = color.trim().toLowerCase();
  return (
    c === '' ||
    c === 'transparent' ||
    c === '#000000' ||
    c === '#000' ||
    c === 'rgb(0,0,0)' ||
    c === 'rgb(0, 0, 0)' ||
    c === '#121212' ||
    c === '#ffffff' ||
    c === '#fff' ||
    c === 'rgb(255,255,255)' ||
    c === 'rgb(255, 255, 255)'
  );
};

export const FlowEditorPage = () => {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const { flows, folders, editFlow, removeFlow } = useWorkspace();
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Active Flow metadata
  const flow = flows.find((f) => f.id === flowId);

  // Parent folder for back navigation
  const parentFolder = folders.find((f) => f.id === flow?.parentId);

  // Canvas States
  const [initialScene, setInitialScene] = useState(null);
  const [isLoadingScene, setIsLoadingScene] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'dirty'
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(flow?.name || '');
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMinimapVisible, setIsMinimapVisible] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(sound.isEnabled());
  const [toastMessage, setToastMessage] = useState(null);

  // Live Canvas Telemetry States
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [elementCount, setElementCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [activeTool, setActiveTool] = useState('selection');

  // Canvas Style (grid | nogrid)
  const [currentPreset, setCurrentPreset] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('easydraw:canvas_preset');
      if (saved === 'grid' || saved === 'nogrid') return saved;
      return 'grid';
    }
    return 'grid';
  });

  const excalidrawAPIRef = useRef(null);
  const isLoadedRef = useRef(false);
  const latestSceneRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const exportMenuRef = useRef(null);
  const presetMenuRef = useRef(null);
  const importFileRef = useRef(null);
  const resolvedThemeRef = useRef(resolvedTheme);
  const currentPresetRef = useRef(currentPreset);

  useEffect(() => {
    resolvedThemeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    currentPresetRef.current = currentPreset;
  }, [currentPreset]);

  // Sync title when flow changes
  useEffect(() => {
    if (flow) {
      setTitleValue(flow.name);
    }
  }, [flow]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target)) {
        setPresetMenuOpen(false);
      }
    };
    if (exportMenuOpen || presetMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen, presetMenuOpen]);

  /* ==========================================================================
     Excalidraw Library Management & Cross-session Sync
     ========================================================================== */
  useHandleLibrary({
    excalidrawAPI,
    adapter: libraryAdapter,
  });

  // Intercept clicking "Browse libraries" in Excalidraw's built-in library menu
  // so the user stays in the same tab in our in-app modal
  useEffect(() => {
    const handleInterceptBrowseLibraries = (e) => {
      const browseBtn = e.target.closest?.('.library-menu-browse-button');
      if (browseBtn) {
        e.preventDefault();
        e.stopPropagation();
        sound.playSwitch();
        setIsLibraryModalOpen(true);
      }
    };

    document.addEventListener('click', handleInterceptBrowseLibraries, true);
    return () => {
      document.removeEventListener('click', handleInterceptBrowseLibraries, true);
    };
  }, []);

  /* Soften dotted canvas grid lines & guarantee dark/light background fill */
  useEffect(() => {
    const originalStroke = CanvasRenderingContext2D.prototype.stroke;

    CanvasRenderingContext2D.prototype.stroke = function (...args) {
      const strokeStyle =
        typeof this.strokeStyle === 'string'
          ? this.strokeStyle.toLowerCase().replace(/\s+/g, '')
          : '';
      if (
        strokeStyle === '#e5e5e5' ||
        strokeStyle === '#dddddd' ||
        strokeStyle === 'rgb(229,229,229)' ||
        strokeStyle === 'rgb(221,221,221)'
      ) {
        const prevAlpha = this.globalAlpha;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.globalAlpha = prevAlpha * (isDark ? 0.2 : 0.4);
        const res = originalStroke.apply(this, args);
        this.globalAlpha = prevAlpha;
        return res;
      }
      return originalStroke.apply(this, args);
    };

    return () => {
      CanvasRenderingContext2D.prototype.stroke = originalStroke;
    };
  }, []);

  /* ==========================================================================
     Global Keyboard Shortcuts: ⌘K, M, S, ⇧1, ⇧0
     ========================================================================== */
  useEffect(() => {
    const handleGlobalKey = (e) => {
      // Don't trigger if user is actively typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        sound.playClick();
        setIsMinimapVisible((prev) => !prev);
      } else if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const next = !isSoundEnabled;
        setIsSoundEnabled(next);
        sound.setEnabled(next);
        setToastMessage(next ? 'Audio Haptics: ON' : 'Audio Haptics: MUTED');
        setTimeout(() => setToastMessage(null), 2000);
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isSoundEnabled]);

  /* ==========================================================================
     Lazy load saved scene ONCE on mount
     ========================================================================== */
  useEffect(() => {
    let isCancelled = false;

    const loadFlowScene = async () => {
      setIsLoadingScene(true);
      isLoadedRef.current = false;

      try {
        const saved = await getScene(flowId);
        if (!isCancelled) {
          const elements = Array.isArray(saved?.elements) ? saved.elements : [];
          const appState = saved?.appState || {};
          const files = saved?.files || {};

          // Determine initial background and grid from current style and theme
          const isDark = resolvedThemeRef.current === THEMES.DARK;
          const defaultTargetBg = isDark ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG;
          const isGrid = currentPresetRef.current === 'grid';

          let initialBg = appState.viewBackgroundColor;
          // In dark mode default to black (#000000), in light mode default to white (#ffffff),
          // unless the user customized the background color themselves.
          if (isDefaultCanvasBg(initialBg)) {
            initialBg = defaultTargetBg;
          }

          setInitialScene({
            elements,
            appState: {
              ...appState,
              viewBackgroundColor: initialBg,
              theme: resolvedThemeRef.current,
              gridModeEnabled: isGrid,
              gridSize: isGrid ? 20 : null,
              isLoading: false,
            },
            files,
          });

          latestSceneRef.current = { elements, appState, files };
          setElementCount(elements.filter((el) => !el.isDeleted).length);
          setIsLoadingScene(false);

          setTimeout(() => {
            isLoadedRef.current = true;
          }, 300);
        }
      } catch (err) {
        console.error('Error loading scene:', err);
        if (!isCancelled) {
          setInitialScene({
            elements: [],
            appState: { theme: resolvedThemeRef.current },
            files: {},
          });
          setIsLoadingScene(false);
          isLoadedRef.current = true;
        }
      }
    };

    loadFlowScene();

    return () => {
      isCancelled = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (latestSceneRef.current && flowId) {
        saveScene(flowId, latestSceneRef.current).catch(console.error);
        updateFlowTimestamp(flowId);
      }
    };
  }, [flowId]);

  /* Synchronize canvas background whenever user changes theme */
  useEffect(() => {
    if (excalidrawAPIRef.current) {
      const isDark = resolvedTheme === THEMES.DARK;
      const currentBg = excalidrawAPIRef.current.getAppState()?.viewBackgroundColor;
      if (isDefaultCanvasBg(currentBg)) {
        excalidrawAPIRef.current.updateScene({
          appState: {
            theme: resolvedTheme,
            viewBackgroundColor: isDark ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG,
          },
        });
      } else {
        excalidrawAPIRef.current.updateScene({
          appState: {
            theme: resolvedTheme,
          },
        });
      }
    }
  }, [resolvedTheme]);

  /* Synchronize grid whenever user toggles preset (grid / nogrid) */
  useEffect(() => {
    if (excalidrawAPIRef.current) {
      const isGrid = currentPreset === 'grid';
      excalidrawAPIRef.current.updateScene({
        appState: {
          gridModeEnabled: isGrid,
          gridSize: isGrid ? 20 : null,
        },
      });
    }
  }, [currentPreset]);

  /* ==========================================================================
     Autosave with Debouncing (~700ms)
     ========================================================================== */
  const triggerSave = useCallback(
    (sceneToSave) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus('dirty');

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setSaveStatus('saving');
          await saveScene(flowId, sceneToSave);
          updateFlowTimestamp(flowId);
          setSaveStatus('saved');
        } catch (err) {
          console.error('Autosave failed:', err);
          setSaveStatus('dirty');
        }
      }, 700);
    },
    [flowId]
  );

  const handleCanvasChange = useCallback(
    (elements, appState, files) => {
      if (!isLoadedRef.current) return;

      const nonDeleted = elements.filter((el) => !el.isDeleted);
      setElementCount(nonDeleted.length);
      setSelectedCount(Object.keys(appState?.selectedElementIds || {}).length);
      setZoomLevel(appState?.zoom?.value || 1);
      if (appState?.activeTool?.type) {
        setActiveTool(appState.activeTool.type);
      }

      const isDark = resolvedTheme === THEMES.DARK;
      let bg = appState?.viewBackgroundColor;
      // In dark mode default to black (#000000), in light mode default to white (#ffffff),
      // unless the user customized the background color themselves.
      if (isDefaultCanvasBg(bg)) {
        bg = isDark ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG;
      }

      const currentScene = {
        elements,
        appState: {
          viewBackgroundColor: bg,
          currentItemFontFamily: appState.currentItemFontFamily,
          theme: resolvedTheme,
        },
        files: files || {},
      };

      latestSceneRef.current = currentScene;
      triggerSave(currentScene);
    },
    [triggerSave, resolvedTheme]
  );

  /* Title Editing */
  const handleTitleSubmit = () => {
    setTitleEditing(false);
    if (titleValue.trim() && titleValue.trim() !== flow?.name) {
      sound.playClick();
      editFlow(flow.id, titleValue.trim());
      setToastMessage(`Renamed diagram to "${titleValue.trim()}"`);
      setTimeout(() => setToastMessage(null), 2500);
    } else {
      setTitleValue(flow?.name || '');
    }
  };

  /* Navigation Back */
  const handleBack = () => {
    sound.playClick();
    if (latestSceneRef.current) {
      saveScene(flowId, latestSceneRef.current);
      updateFlowTimestamp(flowId);
    }
    if (flow?.parentId && flow.parentId !== 'root') {
      navigate(`/folder/${flow.parentId}`);
    } else {
      navigate('/');
    }
  };

  /* ==========================================================================
     Preset Switching (Grid vs No Grid)
     ========================================================================== */
  const handleSelectPreset = (presetId) => {
    setPresetMenuOpen(false);
    setCurrentPreset(presetId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('easydraw:canvas_preset', presetId);
    }
    sound.playSwitch();
    const cfg = PRESET_CONFIGS[presetId] || PRESET_CONFIGS.grid;
    const isGrid = presetId === 'grid';
    if (excalidrawAPIRef.current) {
      excalidrawAPIRef.current.updateScene({
        appState: {
          gridModeEnabled: isGrid,
          gridSize: isGrid ? 20 : null,
        },
      });
    }
    setToastMessage(`Canvas: ${cfg.label}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleThemeChange = (newTheme) => {
    sound.playSwitch();
    setTheme(newTheme);
    const isDark = newTheme === THEMES.DARK;
    if (excalidrawAPIRef.current) {
      const currentBg = excalidrawAPIRef.current.getAppState()?.viewBackgroundColor;
      if (isDefaultCanvasBg(currentBg)) {
        excalidrawAPIRef.current.updateScene({
          appState: {
            viewBackgroundColor: isDark ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG,
            theme: newTheme,
          },
        });
      } else {
        excalidrawAPIRef.current.updateScene({
          appState: {
            theme: newTheme,
          },
        });
      }
    }
  };

  const handleCyclePreset = () => {
    const nextPreset = currentPreset === 'grid' ? 'nogrid' : 'grid';
    handleSelectPreset(nextPreset);
  };

  /* Reset Zoom to 100% */
  const handleResetZoom = () => {
    if (excalidrawAPIRef.current) {
      excalidrawAPIRef.current.updateScene({
        appState: { zoom: { value: 1 } },
      });
      sound.playClick();
    }
  };

  /* ==========================================================================
     Export Handlers
     ========================================================================== */
  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    sound.playChime();
  };

  const getCleanFilename = (ext) => {
    const base = (flow?.name || 'diagram').replace(/[^a-z0-9_-]/gi, '_');
    return `${base}.${ext}`;
  };

  const handleExportExcalidraw = () => {
    setExportMenuOpen(false);
    const scene = latestSceneRef.current || initialScene;
    const data = {
      type: 'excalidraw',
      version: 2,
      source: 'easydraw',
      elements: scene?.elements || [],
      appState: scene?.appState || {},
      files: scene?.files || {},
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    downloadFile(blob, getCleanFilename('excalidraw'));
    setToastMessage('Exported raw .excalidraw file');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportPNG = async () => {
    setExportMenuOpen(false);
    if (!excalidrawAPIRef.current) return;
    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      const files = excalidrawAPIRef.current.getFiles();

      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: resolvedTheme === THEMES.DARK,
          exportBackground: true,
        },
        files,
        mimeType: 'image/png',
      });
      downloadFile(blob, getCleanFilename('png'));
      setToastMessage('Exported diagram PNG');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Could not export diagram as PNG.');
    }
  };

  const handleExportSVG = async () => {
    setExportMenuOpen(false);
    if (!excalidrawAPIRef.current) return;
    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      const files = excalidrawAPIRef.current.getFiles();

      const svg = await exportToSvg({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: resolvedTheme === THEMES.DARK,
          exportBackground: true,
        },
        files,
      });

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      downloadFile(blob, getCleanFilename('svg'));
      setToastMessage('Exported diagram SVG vector');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export SVG:', err);
      alert('Could not export diagram as SVG.');
    }
  };

  const handleCopyClipboard = async () => {
    setExportMenuOpen(false);
    if (!excalidrawAPIRef.current) return;
    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      const files = excalidrawAPIRef.current.getFiles();

      await exportToClipboard({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: resolvedTheme === THEMES.DARK,
          exportBackground: true,
        },
        files,
        mimeType: 'image/png',
      });
      sound.playChime();
      setToastMessage('Diagram copied to clipboard (PNG)');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.warn('Clipboard API error, downloading PNG fallback:', err);
      handleExportPNG();
    }
  };

  /* ==========================================================================
     Import Handler
     ========================================================================== */
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'Importing will replace the elements in your current diagram with the file contents. Do you want to continue?'
    );
    if (!confirmed) {
      if (importFileRef.current) importFileRef.current.value = '';
      return;
    }

    sound.playSwitch();
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = JSON.parse(evt.target.result);
        const elements = Array.isArray(content.elements) ? content.elements : [];
        const appState = content.appState || {};
        const files = content.files || {};

        if (excalidrawAPIRef.current) {
          excalidrawAPIRef.current.updateScene({
            elements,
            appState: { ...appState, theme: resolvedTheme },
          });
          if (files && excalidrawAPIRef.current.addFiles) {
            excalidrawAPIRef.current.addFiles(Object.values(files));
          }
        }

        const sceneObj = { elements, appState, files };
        latestSceneRef.current = sceneObj;
        await saveScene(flowId, sceneObj);
        updateFlowTimestamp(flowId);
        setSaveStatus('saved');
        sound.playChime();
        setToastMessage(`Imported ${file.name}`);
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err) {
        console.error('Failed to parse imported excalidraw file:', err);
        alert('Invalid .excalidraw file format.');
      } finally {
        if (importFileRef.current) importFileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearCanvas = () => {
    if (!excalidrawAPIRef.current) return;
    const confirmed = window.confirm('Are you sure you want to clear all elements from this canvas?');
    if (!confirmed) return;
    sound.playSwitch();
    excalidrawAPIRef.current.updateScene({ elements: [] });
    setToastMessage('Canvas cleared');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDeleteFlow = () => {
    sound.playClick();
    const confirmed = window.confirm(
      `Are you sure you want to delete "${flow?.name || 'this diagram'}"? This action cannot be undone.`
    );
    if (confirmed) {
      removeFlow(flowId);
      if (flow?.parentId && flow.parentId !== 'root') {
        navigate(`/folder/${flow.parentId}`);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className={styles.editorContainer} data-preset={currentPreset}>
      {/* Floating Tactical Top HUD Dock */}
      <header className={styles.topBar}>
        {/* Left: Back & Breadcrumb info */}
        <div className={styles.leftGroup}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleBack}
            title={`Back to ${parentFolder ? parentFolder.name : 'Workspace'} [B]`}
          >
            <ArrowLeft size={13} />
            <span className={styles.backLabel}>
              {parentFolder ? parentFolder.name : 'Workspace'}
            </span>
            <span className="keycap">B</span>
          </button>

          <span className={styles.divider}>{'//'}</span>

          {/* Editable Title */}
          {titleEditing ? (
            <input
              type="text"
              className={styles.titleInput}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleEditing(false);
                  setTitleValue(flow?.name || '');
                }
              }}
              autoFocus
            />
          ) : (
            <h1
              className={styles.flowTitle}
              onClick={() => {
                sound.playClick();
                setTitleEditing(true);
              }}
              title="Click to rename"
            >
              {flow?.name || 'Untitled Flow'}
            </h1>
          )}
        </div>

        {/* Right: Tactical Actions Dock */}
        <div className={styles.rightGroup}>
          {/* Command Palette Trigger */}
          <button
            type="button"
            className={styles.topBtn}
            onClick={() => {
              setIsCommandPaletteOpen(true);
            }}
            title="Open Command Palette (Cmd/Ctrl + K)"
          >
            <Command size={13} />
            <span>Commands</span>
            <span className="keycap">⌘K</span>
          </button>

          {/* Canvas Style Selector Dropdown (Grid / No Grid) */}
          <div className={styles.dropdownContainer} ref={presetMenuRef}>
            <button
              type="button"
              className={`${styles.topBtn} ${styles.presetBtn}`}
              onClick={() => {
                sound.playClick();
                setPresetMenuOpen(!presetMenuOpen);
              }}
              title="Change canvas style (Grid / No Grid)"
            >
              {currentPreset === 'grid' ? <Grid size={13} /> : <Square size={13} />}
              <span>{currentPreset === 'grid' ? 'GRID' : 'NO GRID'}</span>
              <ChevronDown size={11} />
            </button>

            {presetMenuOpen && (
              <div className={styles.dropdownMenu}>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.dropdownItem} ${currentPreset === p.id ? styles.activeDropdownItem : ''}`}
                    onClick={() => handleSelectPreset(p.id)}
                  >
                    {p.id === 'grid' ? <Grid size={13} /> : <Square size={13} />}
                    <div className={styles.itemContent}>
                      <span className={styles.itemTitle}>{p.label}</span>
                      <span className={styles.itemDesc}>{p.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* In-App Library Browser */}
          <button
            type="button"
            className={styles.topBtn}
            onClick={() => {
              sound.playSwitch();
              setIsLibraryModalOpen(true);
            }}
            title="Browse and add Excalidraw libraries"
          >
            <LibraryIcon size={13} />
            <span>Libraries</span>
          </button>

          {/* Import file */}
          <input
            type="file"
            accept=".excalidraw,.json"
            ref={importFileRef}
            className={styles.hiddenInput}
            onChange={handleImportFile}
          />
          <button
            type="button"
            className={styles.topBtn}
            onClick={() => {
              sound.playClick();
              importFileRef.current?.click();
            }}
            title="Import .excalidraw file into this diagram"
          >
            <Upload size={13} />
            <span>Import</span>
          </button>

          {/* Export Dropdown Menu */}
          <div className={styles.dropdownContainer} ref={exportMenuRef}>
            <button
              type="button"
              className={styles.topBtn}
              onClick={() => {
                sound.playClick();
                setExportMenuOpen(!exportMenuOpen);
              }}
              title="Export or copy diagram"
            >
              <Download size={13} />
              <span>Export</span>
              <ChevronDown size={11} />
            </button>

            {exportMenuOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleCopyClipboard}
                >
                  <Copy size={14} />
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>Copy PNG to Clipboard</span>
                    <span className={styles.itemDesc}>Quick paste into Notion, Slack, docs</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleExportPNG}
                >
                  <ImageIcon size={14} />
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>Download PNG Image</span>
                    <span className={styles.itemDesc}>High-res raster file</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleExportSVG}
                >
                  <SvgIcon size={14} />
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>Download SVG Vector</span>
                    <span className={styles.itemDesc}>Scalable vector graphics</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleExportExcalidraw}
                >
                  <FileCode size={14} />
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>Raw .excalidraw</span>
                    <span className={styles.itemDesc}>Lossless diagram schema</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Delete Diagram */}
          <button
            type="button"
            className={`${styles.topBtn} ${styles.deleteTopBtn}`}
            onClick={handleDeleteFlow}
            title="Delete this diagram"
            aria-label="Delete diagram"
          >
            <Trash2 size={13} />
          </button>

          {/* Theme Switcher */}
          <div className={styles.themeToggleGroup}>
            <button
              type="button"
              className={`${styles.themeMiniBtn} ${
                theme === THEMES.LIGHT ? styles.activeThemeMini : ''
              }`}
              onClick={() => handleThemeChange(THEMES.LIGHT)}
              title="Light Mode"
            >
              <Sun size={12} />
            </button>
            <button
              type="button"
              className={`${styles.themeMiniBtn} ${
                theme === THEMES.DARK ? styles.activeThemeMini : ''
              }`}
              onClick={() => handleThemeChange(THEMES.DARK)}
              title="Dark Mode"
            >
              <Moon size={12} />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Excalidraw Canvas Workspace */}
      <main className={styles.canvasArea}>
        {isLoadingScene || !initialScene ? (
          <div className={styles.loadingArea}>
            <Loader2 size={24} className={styles.spinningIcon} />
            <span>INITIALIZING ENGINE & SCHEMATICS...</span>
          </div>
        ) : (
          <div className={styles.excalidrawWrapper}>
            <Excalidraw
              theme={resolvedTheme}
              excalidrawAPI={(api) => {
                excalidrawAPIRef.current = api;
                setExcalidrawAPI(api);
                const isDark = resolvedTheme === THEMES.DARK;
                const curBg = api.getAppState()?.viewBackgroundColor;
                if (isDefaultCanvasBg(curBg)) {
                  api.updateScene({
                    appState: {
                      theme: resolvedTheme,
                      viewBackgroundColor: isDark ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG,
                      gridModeEnabled: currentPreset === 'grid',
                      gridSize: currentPreset === 'grid' ? 20 : null,
                    },
                  });
                }
              }}
              libraryReturnUrl={
                typeof window !== 'undefined'
                  ? `${window.location.origin}/flow/${flowId}`
                  : undefined
              }
              initialData={initialScene}
              onChange={handleCanvasChange}
              onPointerUpdate={(payload) => {
                if (payload?.pointer) {
                  setCursorCoords({
                    x: Math.round(payload.pointer.x),
                    y: Math.round(payload.pointer.y),
                  });
                }
              }}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  saveToActiveFile: false,
                  export: false,
                  theme: false,
                },
              }}
            />

            {/* Minimap & Coordinate Radar HUD */}
            <Minimap
              excalidrawAPI={excalidrawAPI}
              isVisible={isMinimapVisible}
              onToggleVisible={() => setIsMinimapVisible((v) => !v)}
            />
          </div>
        )}
      </main>

      {/* Monospace Telemetry Status Bar HUD */}
      <CanvasStatusBar
        cursorCoords={cursorCoords}
        zoom={zoomLevel}
        elementCount={elementCount}
        selectedCount={selectedCount}
        activeTool={activeTool}
        saveStatus={saveStatus}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={() => {
          const next = !isSoundEnabled;
          setIsSoundEnabled(next);
          sound.setEnabled(next);
          setToastMessage(next ? 'Audio Haptics: ON' : 'Audio Haptics: MUTED');
          setTimeout(() => setToastMessage(null), 2000);
        }}
        isMinimapVisible={isMinimapVisible}
        onToggleMinimap={() => {
          sound.playClick();
          setIsMinimapVisible((v) => !v);
        }}
        currentPreset={currentPreset}
        onCyclePreset={handleCyclePreset}
        onResetZoom={handleResetZoom}
      />

      {/* Command Palette Overlay (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        excalidrawAPI={excalidrawAPI}
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        isMinimapVisible={isMinimapVisible}
        onToggleMinimap={() => setIsMinimapVisible((v) => !v)}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={() => {
          const next = !isSoundEnabled;
          setIsSoundEnabled(next);
          sound.setEnabled(next);
        }}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportExcalidraw={handleExportExcalidraw}
        onCopyClipboard={handleCopyClipboard}
        flows={flows}
        currentFlowId={flowId}
        onNavigateFlow={(id) => navigate(`/flow/${id}`)}
        onClearCanvas={handleClearCanvas}
      />

      {/* In-app Library Browser Modal */}
      <LibraryBrowserModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        flowId={flowId}
        excalidrawAPI={excalidrawAPI}
        resolvedTheme={resolvedTheme}
        onNotification={(msg) => {
          sound.playChime();
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      {/* Mechanical Toast Notification */}
      {toastMessage && (
        <div className={styles.toast} role="status">
          <Check size={14} className={styles.toastSuccessIcon} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
