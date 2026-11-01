# easydraw

A fast, clean, local-first diagram and visual flow editor built for system architecture diagrams, planning boards, and thought flows. 

- **Tech Stack**: React + Vite + JavaScript (no TypeScript)
- **No login, no accounts, no auth wall.**
- **No backend of any kind.** Everything is stored locally in your browser.
- **Folder-based organization**: Nestable folders and individual flows with live canvas editors.
- **Excalidraw canvas**: Powered by `@excalidraw/excalidraw` with instant autosave.
- **Export & Import**: Flow export (`.excalidraw`, PNG, SVG) and complete workspace backups (`.easydraw`).

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### Installation & Run

```bash
# Navigate to the project directory
cd EasyDraw

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint check
npm run lint

# Format code
npm run format
```

The app runs at `http://localhost:3000`.

---

## Storage Model

`easydraw` uses a hybrid browser storage strategy designed for fast metadata queries and reliable binary storage:

1. **`localStorage`**:
   - `easydraw:folders`: Array of Folder objects (`{ id, name, parentId, createdAt, updatedAt }`).
   - `easydraw:flows`: Array of Flow metadata objects (`{ id, name, parentId, createdAt, updatedAt, thumbnail }`).
   - `easydraw:theme`: Selected theme preference (`"light"` | `"dark"` | `"system"`).

2. **IndexedDB** (`easydraw-db`):
   - Stores diagram scenes (`elements`, `appState`, and binary image `files`) in the `scenes` object store under key `easydraw:scene:{flowId}`.
   - Prevents hitting browser storage limits when diagramming with screenshots, images, or large element counts.

---

## File Formats & Interoperability

### 1. Flow `.excalidraw` File
- Standard Excalidraw JSON format (`elements`, `appState`, `files`).
- Compatible with [excalidraw.com](https://excalidraw.com) and any Excalidraw-compatible viewer.
- Lossless, re-importable into `easydraw` to resume editing.

### 2. Workspace `.easydraw` File
- A single JSON file containing the entire workspace:
  ```json
  {
    "version": 1,
    "app": "easydraw",
    "exportedAt": 1730000000000,
    "folders": [...],
    "flows": [...],
    "scenes": {
      "flow-id-1": { "elements": [...], "appState": {...}, "files": {...} }
    }
  }
  ```
- Allows full backup, restore, or migration across browsers and devices without any server involvement.

---

## Design Decisions (Avoiding the "AI-Generated" Look)

To make `easydraw` feel like an intentional, high-craft productivity application (similar to Linear, Notion, or Obsidian):
- **Restrained Neutral Palette**: Warm slate and neutral tones instead of generic purple-to-cyan gradient meshes.
- **Subtle Surface Elevation**: Flat planes and 1px crisp borders (`#e2e8f0` / `#262938`) instead of heavy blurry drop shadows and neon glows.
- **Zero Glassmorphism**: Clean opaque surfaces with high legibility.
- **Typography First**: Strict typographic scale using Inter and JetBrains Mono for metadata and timestamps.
- **No Marketing Fluff**: Direct entry into the workspace without onboarding carousels, "✨ AI powered" badges, or account prompts.
