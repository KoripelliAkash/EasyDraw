import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 480 }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={styles.container} style={{ maxWidth: `${maxWidth}px` }}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};
