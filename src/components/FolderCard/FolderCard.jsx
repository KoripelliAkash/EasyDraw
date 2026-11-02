import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder as FolderIcon,
  MoreVertical,
  Edit2,
  Trash2,
  FolderInput,
} from 'lucide-react';
import styles from './FolderCard.module.css';

export const FolderCard = ({ folder, itemCount = 0, onRename, onMove, onDelete }) => {
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
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={`${styles.card} ${menuOpen ? styles.cardActive : ''}`}
      onClick={() => navigate(`/folder/${folder.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/folder/${folder.id}`);
      }}
    >
      <div className={styles.topRow}>
        <div className={styles.iconWrapper}>
          <FolderIcon size={20} className={styles.icon} />
        </div>

        <div className={styles.menuContainer} ref={menuRef}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            title="Folder actions"
            aria-label="Folder actions"
          >
            <MoreVertical size={15} />
          </button>

          {menuOpen && (
            <div className={styles.menuDropdown} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onRename(folder);
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
                  onMove(folder);
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
                  onDelete(folder);
                }}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <h4 className={styles.name} title={folder.name}>
          {folder.name}
        </h4>
        <div className={styles.metaRow}>
          <span>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
          <span className={styles.dot}>•</span>
          <span>{formatDate(folder.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};
