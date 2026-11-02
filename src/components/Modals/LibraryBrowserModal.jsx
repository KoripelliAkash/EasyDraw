import { useState, useEffect, useRef } from 'react';
import { Library, Upload, ExternalLink, X, Loader2 } from 'lucide-react';
import styles from './LibraryBrowserModal.module.css';

export const LibraryBrowserModal = ({
  isOpen,
  onClose,
  flowId,
  excalidrawAPI,
  resolvedTheme = 'light',
  onNotification,
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // When a library is added via hash change from the iframe or return URL, close the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleHashChange = () => {
      if (window.location.hash.includes('addLibrary')) {
        onNotification?.('Installing library into your canvas...');
        setTimeout(() => {
          onClose();
        }, 600);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isOpen, onClose, onNotification]);

  // Reset loading state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const returnUrl = typeof window !== 'undefined' ? `${window.location.origin}/flow/${flowId}` : '';
  const token = excalidrawAPI?.id || '';
  const iframeSrc = `https://libraries.excalidraw.com?target=easydraw_app&referrer=${encodeURIComponent(
    returnUrl
  )}&useHash=true&token=${token}&theme=${resolvedTheme}&version=2`;

  const handleManualImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!excalidrawAPI) {
        alert('Canvas is not ready yet. Please try again.');
        return;
      }
      const blob = new Blob([await file.arrayBuffer()], { type: 'application/json' });
      await excalidrawAPI.updateLibrary({
        libraryItems: blob,
        merge: true,
        defaultStatus: 'published',
        openLibraryMenu: true,
      });
      onNotification?.(`Imported library "${file.name}" successfully!`);
      onClose();
    } catch (err) {
      console.error('Failed to import library file:', err);
      alert('Could not import this library file. Please ensure it is a valid .excalidrawlib or JSON file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Browse Excalidraw Libraries"
    >
      <div className={styles.modalWindow}>
        {/* Header */}
        <header className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Library size={20} />
            </div>
            <div className={styles.titleArea}>
              <h2 className={styles.modalTitle}>Excalidraw Libraries</h2>
              <p className={styles.modalSubtitle}>
                Add architecture, cloud, flowchart & design libraries directly to your diagram
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            {/* Import Local File */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".excalidrawlib,.json"
              className={styles.hiddenFileInput}
              onChange={handleManualImport}
            />
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Import .excalidrawlib file from your computer"
            >
              <Upload size={13} />
              <span>Import File</span>
            </button>

            {/* Open in Separate Tab */}
            <a
              href={iframeSrc}
              target="_blank"
              rel="noreferrer"
              className={styles.actionBtn}
              title="Open Excalidraw library marketplace in a new window"
            >
              <ExternalLink size={13} />
              <span>Open in New Window</span>
            </a>

            {/* Close */}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Content / Iframe */}
        <div className={styles.iframeWrapper}>
          {iframeLoading && (
            <div className={styles.loadingSpinner}>
              <Loader2 size={24} className={styles.spinning} />
              <span>Loading Excalidraw library catalog...</span>
            </div>
          )}
          <iframe
            src={iframeSrc}
            title="Excalidraw Library Directory"
            className={styles.libraryFrame}
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      </div>
    </div>
  );
};
