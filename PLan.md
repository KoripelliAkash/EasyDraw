# Project Plan: easydraw

## 1. Project Overview
**easydraw** is a web app where users draw system architecture diagrams, planning boards, and thought/flow diagrams using Excalidraw. Work is organized into **folders**, and each folder can contain **subfolders** or **flows** (the diagram editors). Everything saves locally in the browser. No login, no backend, no accounts.

**Tech stack**: React + Vite + JavaScript, `@excalidraw/excalidraw`, localStorage + IndexedDB for persistence. **No backend of any kind.**

## 2. Core Requirements (Must Have)

### 2.1 No Authentication
- No login, no signup, no accounts. The app opens directly into the workspace.
- No auth walls, no "continue with Google", no account-tied avatars.

### 2.2 Folder-Based Structure
- A single **root workspace** that holds **folders**.
- Each folder can contain:
  - **Subfolders** (nestable to any reasonable depth)
  - **Flows** (individual Excalidraw diagrams)
- Users can create, rename, and delete folders and flows.
- Flows show a name and last-edited timestamp (thumbnail optional).
- Persist the entire folder tree + all flow scenes in browser storage so everything survives reloads.
- Navigation is just: **folder list → open folder → see subfolders and flows → click a flow to open the editor**. No multi-step wizard-style hierarchy.

### 2.3 Excalidraw Editor
- Embed Excalidraw as the canvas for each flow.
- Each flow saves its own `elements`, `appState`, and `files` independently.
- Autosave on change (debounced ~500ms–1s) and on navigation away.
- **Important**: lazy-initialize Excalidraw so it reads saved data exactly once on first mount — never overwrite saved scenes with empty state on mount.
- Images (`files`) go to IndexedDB; JSON metadata stays in localStorage.

### 2.4 Sharing via File Export / Import (No Backend)
- **No share links, no server uploads, no third-party endpoints.**
- Each flow has an **Export** action that downloads a file the user can send manually (email, chat, cloud drive).
- Support both formats:
  - **`.excalidraw` (JSON)** — lossless, recipient can re-import and continue editing.
  - **PNG / SVG** — for quick viewing or embedding in docs.
- Each flow (or the whole folder) also has an **Import** action:
  - User selects a `.excalidraw` file → it opens as a new flow inside the current folder (or as the current flow's scene, with a confirm prompt).
- Optionally, allow exporting/importing the **entire workspace** (folder tree + all flows) as a single `.easydraw` JSON file for backup and migration between browsers/devices.
- Use Excalidraw's built-in `exportToBlob` / `exportToSvg` and `loadFromJSON` / `restore` helpers where possible.

## 3. UI / UX Requirements (Critical)

### 3.1 Must NOT Look AI-Generated
Hard requirement. Avoid the default AI-generated aesthetic:
- **No** purple-to-blue gradients everywhere, no glassmorphism, no generic "✨ AI-powered" copy, no oversized rounded blobs.
- **No** copied shadcn/Tailwind demo look (identical dashboard cards, same shadows).
- Aim for a **restrained, intentional, product-like interface**: neutral base palette, one accent color, consistent spacing scale, real typographic hierarchy (Inter, Geist, or system fonts with proper weights).
- Prefer subtle borders and flat surfaces over heavy shadows/glows.
- Empty states, loading states, and hover states should feel hand-crafted.
- Overall feel: a focused productivity tool (Linear, Notion, Obsidian) — not a SaaS marketing page.

### 3.2 Clean and User-Friendly
- Clear visual hierarchy: sidebar or file tree for folders/flows, main area for the canvas.
- Obvious primary actions (New Folder, New Flow, Import, Export).
- Minimal chrome around Excalidraw so the canvas is the focus.
- Works well on laptop screens; mobile editing not required.
- Confirm destructive actions (delete folder/flow).

### 3.3 Dark and Light Theme
- Full support for both, user-toggleable.
- Respect system preference on first load; remember the choice.
- **Sync Excalidraw's theme** with the app theme (`appState.theme`).
- Both themes must be polished — no unreadable contrast.

### 3.4 Structured Flow
- Simple, predictable navigation: **folder → open folder → subfolders and flows → open a flow in the editor**.
- A persistent "back" affordance or breadcrumb so users never feel lost.
- Consistent layout across views.

## 4. Data Model (Suggested)

    Folder {
      id: string
      name: string
      parentId: string | null   // null = root
      createdAt: number
      updatedAt: number
    }

    Flow {
      id: string
      name: string
      parentId: string          // folder containing this flow
      createdAt: number
      updatedAt: number
      thumbnail?: string
    }

    FlowScene {                 // stored separately, keyed by flowId
      elements: ExcalidrawElement[]
      appState: Partial<AppState>
      files: BinaryFiles
    }

Storage keys: `easydraw:folders`, `easydraw:flows`, `easydraw:scene:{flowId}` (large scenes/files → IndexedDB).

## 5. Out of Scope (v1)
- User accounts / cloud sync
- Real-time collaboration
- Team workspaces / permissions
- Comments, version history
- Share links / server-side storage of any kind

## 6. Deliverables
- Working React + JavaScript app with the structure above.
- README covering how to run, storage model, and the export/import file formats.
- A short README note on design decisions taken to avoid a generic AI look.

## 7. Acceptance Checklist
- [x] App loads with no login screen.
- [x] Can create/rename/delete folders, including nested subfolders.
- [x] Can create flows inside any folder.
- [x] Each flow's diagram persists across reloads.
- [x] Images in diagrams persist (IndexedDB).
- [x] Export flow as `.excalidraw`, PNG, and SVG.
- [x] Import a `.excalidraw` file into a folder.
- [x] Optional: export/import entire workspace as one file.
- [x] Dark/light theme toggle works and syncs Excalidraw theme.
- [x] UI does not resemble a default AI-generated template.
- [x] Navigation is clear: folders → subfolders/flows → editor.