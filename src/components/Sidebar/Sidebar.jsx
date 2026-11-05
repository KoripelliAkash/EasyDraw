import { useState, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Sun,
  Moon,
  Laptop,
  Download,
  Upload,
  LayoutGrid,
} from 'lucide-react';
import { useWorkspace } from '../../context/useWorkspace.js';
import { useTheme } from '../../context/useTheme.js';
import { THEMES } from '../../types/index.js';
import { sound } from '../../utils/audio.js';
import styles from './Sidebar.module.css';

export const Sidebar = ({ onOpenNewFolder, onOpenNewFlow, onOpenImportWorkspace }) => {
  const { folders, flows, exportWorkspace } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsed state for folders
  const [collapsed, setCollapsed] = useState({});

  const toggleCollapse = (folderId, e) => {
    e.preventDefault();
    e.stopPropagation();
    sound.playClick();
    setCollapsed((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Build tree: root folders (parentId === null) and their children
  const folderTree = useMemo(() => {
    const map = new Map();
    folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
    const rootNodes = [];

    folders.forEach((f) => {
      const node = map.get(f.id);
      if (!f.parentId || f.parentId === 'root') {
        rootNodes.push(node);
      } else if (map.has(f.parentId)) {
        map.get(f.parentId).children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }, [folders]);

  // Counts of flows per folder
  const flowCountMap = useMemo(() => {
    const counts = {};
    flows.forEach((fl) => {
      counts[fl.parentId] = (counts[fl.parentId] || 0) + 1;
    });
    return counts;
  }, [flows]);

  // Total flows count
  const totalFlows = flows.length;

  const handleExportWorkspace = async () => {
    try {
      const data = await exportWorkspace();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `easydraw-workspace-${dateStr}.easydraw`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export workspace:', err);
      alert('Could not export workspace.');
    }
  };

  // Recursive tree node renderer
  const renderFolderNode = (node, depth = 0) => {
    const isCollapsed = collapsed[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const count = flowCountMap[node.id] || 0;
    const isActive = location.pathname === `/folder/${node.id}`;

    return (
      <div key={node.id} className={styles.treeNode}>
        <div
          className={`${styles.treeItem} ${isActive ? styles.activeTreeItem : ''}`}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          onClick={() => {
            sound.playClick();
            navigate(`/folder/${node.id}`);
          }}
        >
          <button
            type="button"
            className={`${styles.chevronBtn} ${!hasChildren ? styles.chevronHidden : ''}`}
            onClick={(e) => toggleCollapse(node.id, e)}
            tabIndex={hasChildren ? 0 : -1}
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>

          {isCollapsed ? (
            <FolderIcon size={14} className={styles.folderIcon} />
          ) : (
            <FolderOpen size={14} className={styles.folderIcon} />
          )}

          <span className={styles.folderTitle} title={node.name}>
            {node.name}
          </span>

          {count > 0 && <span className={styles.countBadge}>{count}</span>}
        </div>

        {hasChildren && !isCollapsed && (
          <div className={styles.childrenContainer}>
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.header}>
        <div
          className={styles.brand}
          onClick={() => {
            sound.playClick();
            navigate('/');
          }}
        >
          <span className={styles.brandBadge}>ED</span>
          <span className={styles.brandName}>EASYDRAW</span>
          <span className={styles.brandSub}>{'// STUDIO'}</span>
        </div>
      </div>

      {/* Primary Actions */}
      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => {
            sound.playClick();
            onOpenNewFlow();
          }}
          title="Create a new flow diagram"
        >
          <Plus size={13} />
          <span>New Flow</span>
        </button>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
          onClick={() => {
            sound.playClick();
            onOpenNewFolder();
          }}
          title="Create a new folder"
        >
          <FolderIcon size={13} />
          <span>Folder</span>
        </button>
      </div>

      {/* Navigation Tree */}
      <div className={styles.navigationSection}>
        <div className={styles.sectionHeader}>WORKSPACE</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${styles.treeItem} ${styles.rootItem} ${isActive ? styles.activeTreeItem : ''}`
          }
        >
          <LayoutGrid size={14} className={styles.folderIcon} />
          <span className={styles.folderTitle}>All Items</span>
          <span className={styles.countBadge}>{totalFlows}</span>
        </NavLink>

        <div className={styles.folderList}>
          {folderTree.map((node) => renderFolderNode(node, 0))}
        </div>
      </div>

      {/* Footer / Utilities */}
      <div className={styles.footer}>
        {/* Workspace Backup */}
        <div className={styles.backupRow}>
          <button
            type="button"
            className={styles.footerBtn}
            onClick={handleExportWorkspace}
            title="Export workspace backup (.easydraw)"
          >
            <Download size={13} />
            <span>Backup</span>
          </button>
          <button
            type="button"
            className={styles.footerBtn}
            onClick={onOpenImportWorkspace}
            title="Restore workspace from .easydraw file"
          >
            <Upload size={13} />
            <span>Restore</span>
          </button>
        </div>

        {/* Theme Segment Control */}
        <div className={styles.themeSelector} role="group" aria-label="Theme selection">
          <button
            type="button"
            className={`${styles.themeOption} ${theme === THEMES.LIGHT ? styles.activeTheme : ''}`}
            onClick={() => setTheme(THEMES.LIGHT)}
            title="Light theme"
          >
            <Sun size={13} />
          </button>
          <button
            type="button"
            className={`${styles.themeOption} ${theme === THEMES.DARK ? styles.activeTheme : ''}`}
            onClick={() => setTheme(THEMES.DARK)}
            title="Dark theme"
          >
            <Moon size={13} />
          </button>
          <button
            type="button"
            className={`${styles.themeOption} ${theme === THEMES.SYSTEM ? styles.activeTheme : ''}`}
            onClick={() => setTheme(THEMES.SYSTEM)}
            title="System theme"
          >
            <Laptop size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
};
