import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCode,
  MoreVertical,
  Edit2,
  Trash2,
  FolderInput,
  Download,
} from 'lucide-react';
import { getScene } from '../../storage/index.js';
import { sound } from '../../utils/audio.js';
import styles from './FlowCard.module.css';

export const FlowCard = ({ flow, onRename, onMove, onDelete }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `Edited ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `Edited ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  };

  const handleExport = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      const scene = await getScene(flow.id);
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const sanitizedName = flow.name.replace(/[^a-z0-9_-]/gi, '_');
      a.href = url;
      a.download = `${sanitizedName || 'diagram'}.excalidraw`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export flow:', err);
      alert('Could not export diagram.');
    }
  };

  return (
    <div
      className={`${styles.card} ${menuOpen ? styles.cardActive : ''}`}
      onClick={() => {
        sound.playClick();
        navigate(`/flow/${flow.id}`);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          sound.playClick();
          navigate(`/flow/${flow.id}`);
        }
      }}
    >
      <div className={styles.previewContainer}>
        {flow.thumbnail ? (
          <img src={flow.thumbnail} alt="" className={styles.thumbnail} />
        ) : (
          <div className={styles.fallbackIcon}>
            <FileCode size={22} className={styles.icon} />
            <span className={styles.schematicTag}>SCHEMATIC</span>
          </div>
        )}

        <div className={styles.menuContainer} ref={menuRef}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={(e) => {
              e.stopPropagation();
              sound.playClick();
              setMenuOpen(!menuOpen);
            }}
            title="Flow actions"
            aria-label="Flow actions"
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <div className={styles.menuDropdown} onClick={(e) => e.stopPropagation()}>
              <button type="button" className={styles.menuItem} onClick={handleExport}>
                <Download size={13} />
                <span>Export .excalidraw</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onRename(flow);
                }}
              >
                <Edit2 size={13} />
                <span>Rename</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onMove(flow);
                }}
              >
                <FolderInput size={13} />
                <span>Move to...</span>
              </button>
              <button
                type="button"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(flow);
                }}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.details}>
        <h4 className={styles.title} title={flow.name}>
          {flow.name}
        </h4>
        <div className={styles.date}>{formatDate(flow.updatedAt)}</div>
      </div>
    </div>
  );
};
