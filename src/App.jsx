import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { WorkspaceProvider } from './context/WorkspaceContext.jsx';
import { useWorkspace } from './context/useWorkspace.js';
import { Sidebar } from './components/Sidebar/Sidebar.jsx';
import { WorkspacePage } from './pages/WorkspacePage/WorkspacePage.jsx';
import { FlowEditorPage } from './pages/FlowEditorPage/FlowEditorPage.jsx';
import {
  CreateFolderModal,
  CreateFlowModal,
  ImportWorkspaceModal,
} from './components/Modals/index.jsx';
import styles from './App.module.css';

const WorkspaceLayout = () => {
  const navigate = useNavigate();
  const { addFolder, addFlow, restoreWorkspace } = useWorkspace();

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFlowOpen, setNewFlowOpen] = useState(false);
  const [importWorkspaceOpen, setImportWorkspaceOpen] = useState(false);

  const handleCreateFolder = (name) => {
    addFolder(name, null);
  };

  const handleCreateFlow = async (name) => {
    const newFlow = await addFlow(name, 'root');
    navigate(`/flow/${newFlow.id}`);
  };

  const handleRestoreWorkspace = async (data, mode) => {
    await restoreWorkspace(data, mode);
  };

  return (
    <div className={styles.appShell}>
      <Sidebar
        onOpenNewFolder={() => setNewFolderOpen(true)}
        onOpenNewFlow={() => setNewFlowOpen(true)}
        onOpenImportWorkspace={() => setImportWorkspaceOpen(true)}
      />

      <Routes>
        <Route path="/" element={<WorkspacePage />} />
        <Route path="/folder/:folderId" element={<WorkspacePage />} />
      </Routes>

      <CreateFolderModal
        isOpen={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onSubmit={handleCreateFolder}
        defaultParentName="Workspace Root"
      />

      <CreateFlowModal
        isOpen={newFlowOpen}
        onClose={() => setNewFlowOpen(false)}
        onSubmit={handleCreateFlow}
        defaultParentName="Workspace Root"
      />

      <ImportWorkspaceModal
        isOpen={importWorkspaceOpen}
        onClose={() => setImportWorkspaceOpen(false)}
        onImport={handleRestoreWorkspace}
      />
    </div>
  );
};

export const App = () => {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/flow/:flowId" element={<FlowEditorPage />} />
            <Route path="/*" element={<WorkspaceLayout />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </ThemeProvider>
  );
};

export default App;
