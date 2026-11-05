import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderPlus, Plus, Upload, Folder as FolderIcon, LayoutGrid, Edit2, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/useWorkspace.js';
import { getFolderAncestors } from '../../storage/index.js';
import { Breadcrumbs } from '../../components/Breadcrumbs/Breadcrumbs.jsx';
import { FolderCard } from '../../components/FolderCard/FolderCard.jsx';
import { FlowCard } from '../../components/FlowCard/FlowCard.jsx';
import { EmptyState } from '../../components/EmptyState/EmptyState.jsx';
import {
  CreateFolderModal,
  CreateFlowModal,
  RenameModal,
  MoveModal,
  DeleteConfirmModal,
} from '../../components/Modals/index.jsx';
import { sound } from '../../utils/audio.js';
import styles from './WorkspacePage.module.css';

export const WorkspacePage = () => {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const {
    folders,
    flows,
    addFolder,
    editFolder,
    removeFolder,
    relocateFolder,
    addFlow,
    editFlow,
    removeFlow,
    relocateFlow,
    importFlowFromFile,
  } = useWorkspace();

  // Active folder object (null for root)
  const currentFolder = useMemo(() => {
    if (!folderId || folderId === 'root') return null;
    return folders.find((f) => f.id === folderId) || null;
  }, [folderId, folders]);

  // Breadcrumbs path
  const ancestorCrumbs = useMemo(() => {
    if (!folderId || folderId === 'root') return [];
    return getFolderAncestors(folderId, folders);
  }, [folderId, folders]);

  // Subfolders in this view
  const currentSubfolders = useMemo(() => {
    if (!folderId || folderId === 'root') {
      return folders.filter((f) => !f.parentId || f.parentId === 'root');
    }
    return folders.filter((f) => f.parentId === folderId);
  }, [folderId, folders]);

  // Flows in this view
  const currentFlows = useMemo(() => {
    if (!folderId || folderId === 'root') {
      return flows.filter((f) => !f.parentId || f.parentId === 'root');
    }
    return flows.filter((f) => f.parentId === folderId);
  }, [folderId, flows]);

  // Count items inside a folder (subfolders + flows)
  const getItemCount = (fId) => {
    const subFCount = folders.filter((f) => f.parentId === fId).length;
    const flowCount = flows.filter((fl) => fl.parentId === fId).length;
    return subFCount + flowCount;
  };

  /* Modal state */
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFlowOpen, setCreateFlowOpen] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [moveItem, setMoveItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  /* Import flow trigger */
  const handleImportFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const targetParent = folderId || 'root';
      const createdFlow = await importFlowFromFile(file, targetParent);
      navigate(`/flow/${createdFlow.id}`);
    } catch (err) {
      alert(err.message || 'Failed to import .excalidraw file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFlowSubmit = async (name) => {
    const targetParent = folderId || 'root';
    const newFlow = await addFlow(name, targetParent);
    navigate(`/flow/${newFlow.id}`);
  };

  const handleCreateFolderSubmit = (name) => {
    const targetParent = folderId || null;
    addFolder(name, targetParent);
  };

  const hasItems = currentSubfolders.length > 0 || currentFlows.length > 0;

  return (
    <div className={styles.container}>
      {/* Top Bar / Breadcrumb Header */}
      <div className={styles.topBar}>
        <Breadcrumbs
          items={ancestorCrumbs.slice(0, -1)}
          currentTitle={currentFolder ? currentFolder.name : 'All Items'}
        />

          <div className={styles.topActions}>
          <input
            type="file"
            accept=".excalidraw,.json"
            ref={fileInputRef}
            className={styles.hiddenInput}
            onChange={handleImportFileSelect}
          />
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              sound.playClick();
              fileInputRef.current?.click();
            }}
            title="Import an existing .excalidraw diagram"
          >
            <Upload size={13} />
            <span>Import</span>
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              sound.playClick();
              setCreateFolderOpen(true);
            }}
            title="Create a new folder"
          >
            <FolderPlus size={13} />
            <span>New Folder</span>
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              sound.playClick();
              setCreateFlowOpen(true);
            }}
            title="Create a new flow diagram"
          >
            <Plus size={13} />
            <span>New Flow</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <div className={styles.content}>
        {/* Title Heading */}
        <div className={styles.pageHeader}>
          <div className={styles.pageTitleGroup}>
            <h2 className={styles.pageTitle}>
              {currentFolder ? currentFolder.name : 'Workspace'}
            </h2>
            {currentFolder && (
              <div className={styles.folderActions}>
                <button
                  type="button"
                  className={styles.folderActionBtn}
                  onClick={() => {
                    sound.playClick();
                    setRenameItem({ ...currentFolder, isFolder: true });
                  }}
                  title="Rename this folder"
                  aria-label="Rename folder"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  type="button"
                  className={`${styles.folderActionBtn} ${styles.deleteFolderBtn}`}
                  onClick={() => {
                    sound.playClick();
                    setDeleteItem({ ...currentFolder, isFolder: true });
                  }}
                  title="Delete this folder"
                  aria-label="Delete folder"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
          <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
            [{currentSubfolders.length} FOLDERS // {currentFlows.length} SCHEMATICS]
          </span>
        </div>

        {!hasItems && (
          <EmptyState
            icon={currentFolder ? FolderIcon : LayoutGrid}
            title={currentFolder ? 'This folder is empty' : 'No diagrams or folders yet'}
            description="Create a flow diagram to start sketching architecture and thoughts, or organize with folders."
            actionLabel="New Flow"
            onAction={() => setCreateFlowOpen(true)}
            secondaryActionLabel="New Folder"
            onSecondaryAction={() => setCreateFolderOpen(true)}
          />
        )}

        {/* Subfolders Grid */}
        {currentSubfolders.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Folders</h3>
            <div className={styles.folderGrid}>
              {currentSubfolders.map((f) => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  itemCount={getItemCount(f.id)}
                  onRename={(item) => setRenameItem({ ...item, isFolder: true })}
                  onMove={(item) => setMoveItem({ ...item, isFolder: true })}
                  onDelete={(item) => setDeleteItem({ ...item, isFolder: true })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Flows Grid */}
        {currentFlows.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Flow Diagrams</h3>
            <div className={styles.flowGrid}>
              {currentFlows.map((fl) => (
                <FlowCard
                  key={fl.id}
                  flow={fl}
                  onRename={(item) => setRenameItem({ ...item, isFolder: false })}
                  onMove={(item) => setMoveItem({ ...item, isFolder: false })}
                  onDelete={(item) => setDeleteItem({ ...item, isFolder: false })}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Modals */}
      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onSubmit={handleCreateFolderSubmit}
        defaultParentName={currentFolder?.name || 'Workspace Root'}
      />

      <CreateFlowModal
        isOpen={createFlowOpen}
        onClose={() => setCreateFlowOpen(false)}
        onSubmit={handleCreateFlowSubmit}
        defaultParentName={currentFolder?.name || 'Workspace Root'}
      />

      <RenameModal
        isOpen={!!renameItem}
        item={renameItem}
        onClose={() => setRenameItem(null)}
        onSubmit={(id, newName) => {
          if (renameItem?.isFolder) editFolder(id, newName);
          else editFlow(id, newName);
        }}
      />

      <MoveModal
        isOpen={!!moveItem}
        item={moveItem}
        isFolder={moveItem?.isFolder}
        folders={folders}
        onClose={() => setMoveItem(null)}
        onSubmit={(id, newParentId) => {
          if (moveItem?.isFolder) relocateFolder(id, newParentId);
          else relocateFlow(id, newParentId);
        }}
      />

      <DeleteConfirmModal
        isOpen={!!deleteItem}
        item={deleteItem}
        isFolder={deleteItem?.isFolder}
        onClose={() => setDeleteItem(null)}
        onConfirm={(id) => {
          if (deleteItem?.isFolder) {
            removeFolder(id);
            if (currentFolder?.id === id) {
              if (currentFolder.parentId && currentFolder.parentId !== 'root') {
                navigate(`/folder/${currentFolder.parentId}`);
              } else {
                navigate('/');
              }
            }
          } else {
            removeFlow(id);
          }
        }}
      />
    </div>
  );
};
