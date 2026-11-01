import { useState, useEffect } from 'react';
import { Modal } from '../Modal/Modal.jsx';
import { AlertTriangle, Upload } from 'lucide-react';
import styles from './Modals.module.css';

/* --- Create Folder Modal --- */
export const CreateFolderModal = ({
  isOpen,
  onClose,
  onSubmit,
  defaultParentName = '',
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Folder">
      <form onSubmit={handleSubmit} className={styles.form}>
        {defaultParentName && (
          <div className={styles.helperText}>
            Creating inside folder: <strong>{defaultParentName}</strong>
          </div>
        )}
        <label className={styles.label}>
          <span>Folder Name</span>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g., Backend Architecture"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={!name.trim()}>
            Create Folder
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* --- Create Flow Modal --- */
export const CreateFlowModal = ({
  isOpen,
  onClose,
  onSubmit,
  defaultParentName = '',
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Flow">
      <form onSubmit={handleSubmit} className={styles.form}>
        {defaultParentName && (
          <div className={styles.helperText}>
            Creating inside: <strong>{defaultParentName}</strong>
          </div>
        )}
        <label className={styles.label}>
          <span>Flow Diagram Name</span>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g., Auth Flow & Token Lifecycle"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={!name.trim()}>
            Create Flow
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* --- Rename Item Modal --- */
export const RenameModal = ({ isOpen, onClose, item, onSubmit }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (item) setName(item.name || '');
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(item.id, name.trim());
    onClose();
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rename ${item.name}`}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          <span>New Name</span>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={!name.trim()}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* --- Move Item Modal --- */
export const MoveModal = ({ isOpen, onClose, item, isFolder, folders, onSubmit }) => {
  const [targetParentId, setTargetParentId] = useState('root');

  useEffect(() => {
    if (item) {
      setTargetParentId(item.parentId || 'root');
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(item.id, targetParentId);
    onClose();
  };

  if (!item) return null;

  // Filter out the folder itself and its descendants to avoid cycles
  const eligibleFolders = folders.filter((f) => {
    if (isFolder && f.id === item.id) return false;
    return true;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Move "${item.name}"`}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          <span>Destination Folder</span>
          <select
            className={styles.select}
            value={targetParentId}
            onChange={(e) => setTargetParentId(e.target.value)}
          >
            <option value="root">Workspace Root (Top level)</option>
            {eligibleFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn}>
            Move
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* --- Delete Confirmation Modal --- */
export const DeleteConfirmModal = ({ isOpen, onClose, item, isFolder, onConfirm }) => {
  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion">
      <div className={styles.deleteDialog}>
        <div className={styles.dangerNotice}>
          <AlertTriangle size={18} className={styles.dangerIcon} />
          <div>
            <div className={styles.dangerTitle}>
              Are you sure you want to delete {item.name}?
            </div>
            {isFolder ? (
              <div className={styles.dangerDesc}>
                This will permanently delete this folder, all nested subfolders, and all
                diagram flows inside it. This action cannot be undone.
              </div>
            ) : (
              <div className={styles.dangerDesc}>
                This diagram and its saved canvas history will be permanently deleted from
                local browser storage.
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => {
              onConfirm(item.id);
              onClose();
            }}
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* --- Import Workspace Modal --- */
export const ImportWorkspaceModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('merge');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setError('');
      setMode('merge');
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.app !== 'easydraw') {
          throw new Error('Not a valid easydraw backup file.');
        }
        await onImport(data, mode);
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to read workspace backup.');
      }
    };
    reader.onerror = () => setError('Error reading selected file.');
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Restore Workspace (.easydraw)">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fileDropArea}>
          <Upload size={24} className={styles.fileDropIcon} />
          <label className={styles.fileInputLabel}>
            <span>{file ? file.name : 'Choose a .easydraw file'}</span>
            <input
              type="file"
              accept=".easydraw,.json"
              className={styles.hiddenFileInput}
              onChange={handleFileChange}
            />
          </label>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.optionGroup}>
          <span className={styles.labelSpan}>Restore Method</span>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="mode"
              value="merge"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
            />
            <span>
              <strong>Merge</strong> — add items without deleting existing data
            </span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="mode"
              value="replace"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
            />
            <span>
              <strong>Replace</strong> — overwrite current workspace with backup
            </span>
          </label>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={!file}>
            Restore Workspace
          </button>
        </div>
      </form>
    </Modal>
  );
};
