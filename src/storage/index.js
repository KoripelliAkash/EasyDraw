import { openDB } from 'idb';
import { STORAGE_KEYS, THEMES } from '../types/index.js';

const DB_NAME = 'easydraw-db';
const DB_VERSION = 1;
const SCENES_STORE = 'scenes';

/**
 * Initialize and get IndexedDB database instance
 */
let dbPromise = null;
export const getDatabase = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SCENES_STORE)) {
          db.createObjectStore(SCENES_STORE);
        }
      },
    });
  }
  return dbPromise;
};

/* ==========================================================================
   IndexedDB Scene Storage (Large Canvas Elements, AppState, Binary Files)
   ========================================================================== */

/**
 * Retrieve scene for a specific flow
 * @param {string} flowId
 * @returns {Promise<{elements: Array, appState: Object, files: Object}|null>}
 */
export const getScene = async (flowId) => {
  try {
    const db = await getDatabase();
    const data = await db.get(SCENES_STORE, `${STORAGE_KEYS.SCENE_PREFIX}${flowId}`);
    return data || null;
  } catch (error) {
    console.error(`Failed to read scene for flow ${flowId} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Save scene for a flow into IndexedDB
 * @param {string} flowId
 * @param {{elements: Array, appState: Object, files: Object}} scene
 */
export const saveScene = async (flowId, scene) => {
  try {
    const db = await getDatabase();
    // Sanitize elements & appState before saving
    const sanitizedScene = {
      elements: scene?.elements || [],
      appState: scene?.appState || {},
      files: scene?.files || {},
    };
    await db.put(SCENES_STORE, sanitizedScene, `${STORAGE_KEYS.SCENE_PREFIX}${flowId}`);
  } catch (error) {
    console.error(`Failed to save scene for flow ${flowId} to IndexedDB:`, error);
    throw error;
  }
};

/**
 * Delete a scene from IndexedDB
 * @param {string} flowId
 */
export const deleteScene = async (flowId) => {
  try {
    const db = await getDatabase();
    await db.delete(SCENES_STORE, `${STORAGE_KEYS.SCENE_PREFIX}${flowId}`);
  } catch (error) {
    console.error(`Failed to delete scene for flow ${flowId} from IndexedDB:`, error);
  }
};

/**
 * Get all saved scenes for workspace export
 * @returns {Promise<Record<string, {elements: Array, appState: Object, files: Object}>>}
 */
export const getAllScenes = async () => {
  try {
    const db = await getDatabase();
    const keys = await db.getAllKeys(SCENES_STORE);
    const scenes = {};
    for (const key of keys) {
      if (typeof key === 'string' && key.startsWith(STORAGE_KEYS.SCENE_PREFIX)) {
        const flowId = key.replace(STORAGE_KEYS.SCENE_PREFIX, '');
        scenes[flowId] = await db.get(SCENES_STORE, key);
      }
    }
    return scenes;
  } catch (error) {
    console.error('Failed to get all scenes from IndexedDB:', error);
    return {};
  }
};

/**
 * Bulk save scenes into IndexedDB
 * @param {Record<string, {elements: Array, appState: Object, files: Object}>} scenesMap
 */
export const saveAllScenes = async (scenesMap) => {
  try {
    const db = await getDatabase();
    const tx = db.transaction(SCENES_STORE, 'readwrite');
    for (const [flowId, scene] of Object.entries(scenesMap)) {
      await tx.store.put(scene, `${STORAGE_KEYS.SCENE_PREFIX}${flowId}`);
    }
    await tx.done;
  } catch (error) {
    console.error('Failed to save scenes bulk to IndexedDB:', error);
    throw error;
  }
};

/**
 * Clear all scenes from IndexedDB
 */
export const clearAllScenes = async () => {
  try {
    const db = await getDatabase();
    await db.clear(SCENES_STORE);
  } catch (error) {
    console.error('Failed to clear IndexedDB scenes:', error);
  }
};

/* ==========================================================================
   LocalStorage Helpers for Folders & Flows
   ========================================================================== */

/**
 * Generate a unique ID (RFC4122 v4)
 * @returns {string}
 */
export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
};

/* --- Folders --- */

export const getFolders = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse folders from localStorage:', e);
    return [];
  }
};

export const saveFolders = (folders) => {
  localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
};

export const getFolderById = (id) => {
  if (!id || id === 'root') return null;
  const folders = getFolders();
  return folders.find((f) => f.id === id) || null;
};

/**
 * Returns ancestor path from root down to the given folder
 * @param {string|null} folderId
 * @returns {Array<{id: string, name: string}>}
 */
export const getFolderAncestors = (folderId, allFolders = null) => {
  if (!folderId || folderId === 'root') return [];
  const folders = allFolders || getFolders();
  const folderMap = new Map(folders.map((f) => [f.id, f]));
  const ancestors = [];
  let current = folderMap.get(folderId);

  while (current) {
    ancestors.unshift({ id: current.id, name: current.name });
    current = current.parentId ? folderMap.get(current.parentId) : null;
  }
  return ancestors;
};

export const createFolder = (name, parentId = null) => {
  const folders = getFolders();
  const now = Date.now();
  const cleanName = (name || '').trim() || 'Untitled Folder';
  const newFolder = {
    id: generateId(),
    name: cleanName,
    parentId: parentId === 'root' ? null : parentId,
    createdAt: now,
    updatedAt: now,
  };
  folders.push(newFolder);
  saveFolders(folders);
  return newFolder;
};

export const renameFolder = (id, newName) => {
  const folders = getFolders();
  const folder = folders.find((f) => f.id === id);
  if (!folder) return null;
  folder.name = (newName || '').trim() || folder.name;
  folder.updatedAt = Date.now();
  saveFolders(folders);
  return folder;
};

export const moveFolder = (id, newParentId) => {
  const folders = getFolders();
  const folder = folders.find((f) => f.id === id);
  if (!folder) return null;

  // Prevent moving into itself or into its own descendants
  if (id === newParentId) return null;
  const descendants = getDescendantFolderIds(id, folders);
  if (descendants.has(newParentId)) return null;

  folder.parentId = newParentId === 'root' ? null : newParentId;
  folder.updatedAt = Date.now();
  saveFolders(folders);
  return folder;
};

/**
 * Recursively find all child folder IDs of a folder
 */
export const getDescendantFolderIds = (folderId, allFolders) => {
  const descendantIds = new Set();
  const queue = [folderId];
  while (queue.length > 0) {
    const parent = queue.shift();
    const children = allFolders.filter((f) => f.parentId === parent);
    for (const child of children) {
      descendantIds.add(child.id);
      queue.push(child.id);
    }
  }
  return descendantIds;
};

/**
 * Delete a folder, all its descendant subfolders, and all contained flows + scenes
 * @param {string} id
 */
export const deleteFolder = async (id) => {
  const folders = getFolders();
  const descendants = getDescendantFolderIds(id, folders);
  descendants.add(id);

  // Remaining folders
  const remainingFolders = folders.filter((f) => !descendants.has(f.id));
  saveFolders(remainingFolders);

  // Delete all flows in these folders
  const flows = getFlows();
  const remainingFlows = [];
  const flowsToDelete = [];

  for (const flow of flows) {
    if (descendants.has(flow.parentId)) {
      flowsToDelete.push(flow.id);
    } else {
      remainingFlows.push(flow);
    }
  }

  saveFlows(remainingFlows);

  // Clean scenes from IndexedDB
  for (const flowId of flowsToDelete) {
    await deleteScene(flowId);
  }
};

/* --- Flows --- */

export const getFlows = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FLOWS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse flows from localStorage:', e);
    return [];
  }
};

export const saveFlows = (flows) => {
  localStorage.setItem(STORAGE_KEYS.FLOWS, JSON.stringify(flows));
};

export const getFlowById = (id) => {
  const flows = getFlows();
  return flows.find((f) => f.id === id) || null;
};

export const createFlow = async (name, parentId = 'root') => {
  const flows = getFlows();
  const now = Date.now();
  const cleanName = (name || '').trim() || 'Untitled Flow';
  const newFlow = {
    id: generateId(),
    name: cleanName,
    parentId: parentId || 'root',
    createdAt: now,
    updatedAt: now,
  };
  flows.push(newFlow);
  saveFlows(flows);

  // Initialize an empty scene in IndexedDB
  await saveScene(newFlow.id, {
    elements: [],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  });

  return newFlow;
};

export const renameFlow = (id, newName) => {
  const flows = getFlows();
  const flow = flows.find((f) => f.id === id);
  if (!flow) return null;
  flow.name = (newName || '').trim() || flow.name;
  flow.updatedAt = Date.now();
  saveFlows(flows);
  return flow;
};

export const updateFlowTimestamp = (id, thumbnail) => {
  const flows = getFlows();
  const flow = flows.find((f) => f.id === id);
  if (!flow) return;
  flow.updatedAt = Date.now();
  if (thumbnail) {
    flow.thumbnail = thumbnail;
  }
  saveFlows(flows);
};

export const moveFlow = (id, newParentId) => {
  const flows = getFlows();
  const flow = flows.find((f) => f.id === id);
  if (!flow) return null;
  flow.parentId = newParentId || 'root';
  flow.updatedAt = Date.now();
  saveFlows(flows);
  return flow;
};

export const deleteFlow = async (id) => {
  const flows = getFlows();
  const remaining = flows.filter((f) => f.id !== id);
  saveFlows(remaining);
  await deleteScene(id);
};

/* ==========================================================================
   Workspace Export / Import
   ========================================================================== */

/**
 * Export full workspace into a single JSON object
 * @returns {Promise<import('../types/index.js').WorkspaceExportData>}
 */
export const exportWorkspace = async () => {
  const folders = getFolders();
  const flows = getFlows();
  const scenes = await getAllScenes();

  return {
    version: 1,
    app: 'easydraw',
    exportedAt: Date.now(),
    folders,
    flows,
    scenes,
  };
};

/**
 * Import full workspace from parsed JSON
 * @param {import('../types/index.js').WorkspaceExportData} data
 * @param {'merge' | 'replace'} mode
 */
export const importWorkspace = async (data, mode = 'merge') => {
  if (
    !data ||
    data.app !== 'easydraw' ||
    !Array.isArray(data.folders) ||
    !Array.isArray(data.flows)
  ) {
    throw new Error('Invalid easydraw workspace backup file.');
  }

  if (mode === 'replace') {
    saveFolders(data.folders);
    saveFlows(data.flows);
    await clearAllScenes();
    if (data.scenes) {
      await saveAllScenes(data.scenes);
    }
  } else {
    // Merge mode: append non-existing or create with fresh IDs
    const currentFolders = getFolders();
    const currentFolderIds = new Set(currentFolders.map((f) => f.id));
    const mergedFolders = [...currentFolders];

    for (const f of data.folders) {
      if (!currentFolderIds.has(f.id)) {
        mergedFolders.push(f);
      }
    }
    saveFolders(mergedFolders);

    const currentFlows = getFlows();
    const currentFlowIds = new Set(currentFlows.map((fl) => fl.id));
    const mergedFlows = [...currentFlows];

    for (const fl of data.flows) {
      if (!currentFlowIds.has(fl.id)) {
        mergedFlows.push(fl);
      }
    }
    saveFlows(mergedFlows);

    if (data.scenes) {
      await saveAllScenes(data.scenes);
    }
  }
};

/* ==========================================================================
   Theme Preference
   ========================================================================== */

export const getThemePreference = () => {
  return localStorage.getItem(STORAGE_KEYS.THEME) || THEMES.SYSTEM;
};

export const setThemePreference = (theme) => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
};
