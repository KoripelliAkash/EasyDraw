/**
 * @typedef {Object} Folder
 * @property {string} id - Unique identifier (e.g., crypto.randomUUID())
 * @property {string} name - Display name of the folder
 * @property {string|null} parentId - ID of parent folder, or null for root
 * @property {number} createdAt - Epoch timestamp
 * @property {number} updatedAt - Epoch timestamp
 */

/**
 * @typedef {Object} Flow
 * @property {string} id - Unique identifier
 * @property {string} name - Display name of the flow diagram
 * @property {string} parentId - ID of containing folder (or 'root')
 * @property {number} createdAt - Epoch timestamp
 * @property {number} updatedAt - Epoch timestamp
 * @property {string} [thumbnail] - Optional thumbnail data URL
 */

/**
 * @typedef {Object} FlowScene
 * @property {Array<Object>} elements - Excalidraw element array
 * @property {Object} appState - Excalidraw app state settings
 * @property {Object} files - Binary files / image map
 */

/**
 * @typedef {Object} WorkspaceExportData
 * @property {1} version
 * @property {'easydraw'} app
 * @property {number} exportedAt
 * @property {Folder[]} folders
 * @property {Flow[]} flows
 * @property {Record<string, FlowScene>} scenes
 */

export const STORAGE_KEYS = {
  FOLDERS: 'easydraw:folders',
  FLOWS: 'easydraw:flows',
  THEME: 'easydraw:theme',
  SCENE_PREFIX: 'easydraw:scene:',
  LIBRARY: 'easydraw:library',
};

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};
