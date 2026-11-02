import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Excalidraw, exportToBlob, exportToSvg, useHandleLibrary } from '@excalidraw/excalidraw';
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
import styles from './FlowEditorPage.module.css';

export const FlowEditorPage = () => {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const { flows, folders, editFlow, removeFlow } = useWorkspace();
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Active Flow metadata
  const flow = flows.find((f) => f.id === flowId);

  // Parent folder for back navigation
  const parentFolder = folders.find((f) => f.id === flow?.parentId);

  // States
  const [initialScene, setInitialScene] = useState(null);
  const [isLoadingScene, setIsLoadingScene] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'dirty'
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(flow?.name || '');
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const excalidrawAPIRef = useRef(null);
  const isLoadedRef = useRef(false);
  const latestSceneRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const exportMenuRef = useRef(null);
  const importFileRef = useRef(null);
  const resolvedThemeRef = useRef(resolvedTheme);

  useEffect(() => {
    resolvedThemeRef.current = resolvedTheme;
  }, [resolvedTheme]);

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
    };
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

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
        setIsLibraryModalOpen(true);
      }
    };

    document.addEventListener('click', handleInterceptBrowseLibraries, true);
    return () => {
      document.removeEventListener('click', handleInterceptBrowseLibraries, true);
    };
  }, []);

  /* ==========================================================================
     CRITICAL: Lazy load saved scene ONCE on mount
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

          // Set initial data
          setInitialScene({
            elements,
            appState: {
              ...appState,
              theme: resolvedThemeRef.current,
              isLoading: false,
            },
            files,
          });

          latestSceneRef.current = { elements, appState, files };
          setIsLoadingScene(false);
          // Mark as loaded so subsequent onChange calls can safely autosave
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
      // Flush unsaved changes on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (latestSceneRef.current && flowId) {
        saveScene(flowId, latestSceneRef.current).catch(console.error);
        updateFlowTimestamp(flowId);
      }
    };
  }, [flowId]);

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
      // Ignore initial render changes before saved scene is loaded
      if (!isLoadedRef.current) return;

      const currentScene = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
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
      editFlow(flow.id, titleValue.trim());
    } else {
      setTitleValue(flow?.name || '');
    }
  };

  /* Navigation Back */
  const handleBack = () => {
    // Flush any pending save
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
    } catch (err) {
      console.error('Failed to export SVG:', err);
      alert('Could not export diagram as SVG.');
    }
  };

  /* ==========================================================================
     Import Handler (Replace current scene with confirmation)
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
      } catch (err) {
        console.error('Failed to parse imported excalidraw file:', err);
        alert('Invalid .excalidraw file format.');
      } finally {
        if (importFileRef.current) importFileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteFlow = () => {
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
    <div className={styles.editorContainer}>
      {/* Top Bar Chrome */}
      <header className={styles.topBar}>
        {/* Left: Back & Breadcrumb info */}
        <div className={styles.leftGroup}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleBack}
            title={`Back to ${parentFolder ? parentFolder.name : 'Workspace'}`}
          >
            <ArrowLeft size={16} />
            <span className={styles.backLabel}>
              {parentFolder ? parentFolder.name : 'Workspace'}
            </span>
          </button>

          <span className={styles.divider}>/</span>

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
              onClick={() => setTitleEditing(true)}
              title="Click to rename"
            >
              {flow?.name || 'Untitled Flow'}
            </h1>
          )}
        </div>

        {/* Right: Autosave status & Actions */}
        <div className={styles.rightGroup}>
          {/* Autosave Indicator */}
          <div className={styles.saveIndicator}>
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={13} className={styles.spinningIcon} />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check size={13} className={styles.savedIcon} />
                <span>Saved locally</span>
              </>
            )}
            {saveStatus === 'dirty' && (
              <>
                <span className={styles.dirtyDot}></span>
                <span>Unsaved</span>
              </>
            )}
          </div>

          {/* In-App Library Browser */}
          <button
            type="button"
            className={styles.topBtn}
            onClick={() => setIsLibraryModalOpen(true)}
            title="Browse and add Excalidraw libraries"
          >
            <LibraryIcon size={14} />
            <span>Libraries</span>
          </button>

          {/* Import file into current scene */}
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
            onClick={() => importFileRef.current?.click()}
            title="Import .excalidraw file into this diagram"
          >
            <Upload size={14} />
            <span>Import</span>
          </button>

          {/* Export Dropdown Menu */}
          <div className={styles.dropdownContainer} ref={exportMenuRef}>
            <button
              type="button"
              className={`${styles.topBtn} ${styles.exportBtn}`}
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              title="Export diagram in various formats"
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={12} />
            </button>

            {exportMenuOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleExportExcalidraw}
                >
                  <FileCode size={14} />
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>Excalidraw (.excalidraw)</span>
                    <span className={styles.itemDesc}>Lossless, editable format</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleExportPNG}
                >
                  <ImageIcon size={14} />
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>PNG Image</span>
                    <span className={styles.itemDesc}>High-res raster for docs</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleExportSVG}
                >
                  <SvgIcon size={14} />
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>SVG Vector</span>
                    <span className={styles.itemDesc}>Scalable vector graphic</span>
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
            <Trash2 size={14} />
          </button>

          {/* Theme Quick Switcher */}
          <div className={styles.themeToggleGroup}>
            <button
              type="button"
              className={`${styles.themeMiniBtn} ${theme === THEMES.LIGHT ? styles.activeThemeMini : ''}`}
              onClick={() => setTheme(THEMES.LIGHT)}
              title="Light canvas"
            >
              <Sun size={13} />
            </button>
            <button
              type="button"
              className={`${styles.themeMiniBtn} ${theme === THEMES.DARK ? styles.activeThemeMini : ''}`}
              onClick={() => setTheme(THEMES.DARK)}
              title="Dark canvas"
            >
              <Moon size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Excalidraw Canvas Area */}
      <main className={styles.canvasArea}>
        {isLoadingScene || !initialScene ? (
          <div className={styles.loadingArea}>
            <Loader2 size={24} className={styles.spinningIcon} />
            <span>Loading diagram...</span>
          </div>
        ) : (
          <div className={styles.excalidrawWrapper}>
            <Excalidraw
              excalidrawAPI={(api) => {
                excalidrawAPIRef.current = api;
                setExcalidrawAPI(api);
              }}
              libraryReturnUrl={
                typeof window !== 'undefined'
                  ? `${window.location.origin}/flow/${flowId}`
                  : undefined
              }
              initialData={initialScene}
              onChange={handleCanvasChange}
              theme={resolvedTheme}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  saveToActiveFile: false,
                  export: false,
                  theme: false,
                },
              }}
            />
          </div>
        )}
      </main>

      {/* In-app Library Browser Modal */}
      <LibraryBrowserModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        flowId={flowId}
        excalidrawAPI={excalidrawAPI}
        resolvedTheme={resolvedTheme}
        onNotification={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toast} role="status">
          <Check size={16} className={styles.toastSuccessIcon} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
