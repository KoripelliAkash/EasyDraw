import { useState, useEffect, useCallback } from 'react';
import {
  getFolders,
  getFlows,
  createFolder,
  renameFolder,
  deleteFolder,
  moveFolder,
  createFlow,
  renameFlow,
  deleteFlow,
  moveFlow,
  saveScene,
  importWorkspace,
  exportWorkspace,
} from '../storage/index.js';
import { WorkspaceContext } from './WorkspaceContextDefinition.js';

export const WorkspaceProvider = ({ children }) => {
  const [folders, setFolders] = useState([]);
  const [flows, setFlows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(() => {
    setFolders(getFolders());
    setFlows(getFlows());
  }, []);

  useEffect(() => {
    refreshData();
    setIsLoading(false);
  }, [refreshData]);

  /* Folder Operations */
  const addFolder = useCallback(
    (name, parentId = null) => {
      const newFolder = createFolder(name, parentId);
      refreshData();
      return newFolder;
    },
    [refreshData]
  );

  const editFolder = useCallback(
    (id, newName) => {
      const updated = renameFolder(id, newName);
      refreshData();
      return updated;
    },
    [refreshData]
  );

  const removeFolder = useCallback(
    async (id) => {
      await deleteFolder(id);
      refreshData();
    },
    [refreshData]
  );

  const relocateFolder = useCallback(
    (id, newParentId) => {
      const res = moveFolder(id, newParentId);
      refreshData();
      return res;
    },
    [refreshData]
  );

  /* Flow Operations */
  const addFlow = useCallback(
    async (name, parentId = 'root') => {
      const newFlow = await createFlow(name, parentId);
      refreshData();
      return newFlow;
    },
    [refreshData]
  );

  const editFlow = useCallback(
    (id, newName) => {
      const updated = renameFlow(id, newName);
      refreshData();
      return updated;
    },
    [refreshData]
  );

  const removeFlow = useCallback(
    async (id) => {
      await deleteFlow(id);
      refreshData();
    },
    [refreshData]
  );

  const relocateFlow = useCallback(
    (id, newParentId) => {
      const res = moveFlow(id, newParentId);
      refreshData();
      return res;
    },
    [refreshData]
  );

  /* Import a .excalidraw JSON file as a new flow in a folder */
  const importFlowFromFile = useCallback(
    async (file, parentId = 'root') => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const content = JSON.parse(e.target.result);
            // Default file name without .excalidraw
            const flowName =
              file.name.replace(/\.excalidraw(\.json)?$/i, '') || 'Imported Diagram';
            const newFlow = await createFlow(flowName, parentId);

            // Save scene data to IndexedDB
            const elements = Array.isArray(content.elements) ? content.elements : [];
            const appState = content.appState || {};
            const files = content.files || {};
            await saveScene(newFlow.id, { elements, appState, files });

            refreshData();
            resolve(newFlow);
          } catch (err) {
            console.error('Failed to parse .excalidraw file:', err);
            reject(new Error('Invalid .excalidraw file format.'));
          }
        };
        reader.onerror = () => reject(new Error('Error reading file.'));
        reader.readAsText(file);
      });
    },
    [refreshData]
  );

  /* Workspace Backup / Restore */
  const restoreWorkspace = useCallback(
    async (data, mode = 'merge') => {
      await importWorkspace(data, mode);
      refreshData();
    },
    [refreshData]
  );

  return (
    <WorkspaceContext.Provider
      value={{
        folders,
        flows,
        isLoading,
        refreshData,
        addFolder,
        editFolder,
        removeFolder,
        relocateFolder,
        addFlow,
        editFlow,
        removeFlow,
        relocateFlow,
        importFlowFromFile,
        exportWorkspace,
        restoreWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
