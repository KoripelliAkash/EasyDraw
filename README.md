# easydraw

<div align="center">

  **A fast, local-first diagramming canvas and visual thinking workspace.**  
  Organize architectural blueprints, system diagrams, and mental models into nestable folders.

  [![Live Demo](https://img.shields.io/badge/Live%20Demo-easydraw.koripelliakash.workers.dev-2563eb?style=for-the-badge&logo=cloudflare&logoColor=white)](https://easydraw.koripelliakash.workers.dev/)
  [![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Excalidraw](https://img.shields.io/badge/Excalidraw-0.18-orange?style=for-the-badge)](https://excalidraw.com)
  [![Local First](https://img.shields.io/badge/Storage-100%25%20Local--First-10b981?style=for-the-badge)](https://github.com/KoripelliAkash/EasyDraw)

  <br />

  **[🚀 Try the Live Application](https://easydraw.koripelliakash.workers.dev/)** • **[Report Bug](https://github.com/KoripelliAkash/EasyDraw/issues)** • **[Request Feature](https://github.com/KoripelliAkash/EasyDraw/issues)**

</div>

---

## ⚡ Highlights

- 🔒 **Zero Authentication & No Backend**: No signups, no logins, no telemetry, and no third-party cloud uploads. Your diagrams remain completely private in your own browser.
- 📁 **Nestable Folder Hierarchy**: Organize complex thought flows, microservice architectures, and project boards across infinite nested subfolders.
- 🎨 **Excalidraw Canvas**: Powered by `@excalidraw/excalidraw` with full vector tooling, freehand sketching, shapes, text, arrows, and libraries.
- 💾 **Hybrid Local-First Persistence**: Instant metadata indexing in `localStorage` paired with high-capacity `IndexedDB` scene storage to support large diagrams with embedded images.
- ⏱️ **Lazy Initialization & Safe Debounced Autosave**: Prevents canvas state resets and automatically synchronizes drawing changes in the background without lag.
- 🌓 **Dual Theme Engine**: Polished Light, Dark, and System-auto themes that seamlessly synchronize the app chrome and Excalidraw's canvas palette.
- 📦 **Lossless Export & Full Backup**:
  - Export individual diagrams as **`.excalidraw`**, **PNG**, or **SVG**.
  - Backup or restore your entire workspace with a single **`.easydraw`** JSON package.

---

## 🌐 Live Deployment

The latest version is deployed on **Cloudflare's Global Edge Network**:

🔗 **[https://easydraw.koripelliakash.workers.dev/](https://easydraw.koripelliakash.workers.dev/)**

---

## 🗄️ Storage Architecture

`easydraw` implements a partitioned client-side storage model to avoid browser quota errors while providing sub-millisecond navigation:

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Storage                       │
├──────────────────────────────┬──────────────────────────────┤
│      localStorage (Fast)     │     IndexedDB (Large Data)   │
├──────────────────────────────┼──────────────────────────────┤
│ • easydraw:folders           │ • easydraw:scene:{flowId}    │
│   (tree nodes, IDs, names)   │   - canvas elements          │
│ • easydraw:flows             │   - appState view settings   │
│   (titles, timestamps)       │   - binary image files       │
│ • easydraw:theme             │                              │
│   (light / dark / system)    │                              │
└──────────────────────────────┴──────────────────────────────┘
```

| Store | Key | Purpose |
| :--- | :--- | :--- |
| **`localStorage`** | `easydraw:folders` | Stores JSON array of folder metadata (`id`, `name`, `parentId`, `createdAt`, `updatedAt`). |
| **`localStorage`** | `easydraw:flows` | Stores JSON array of flow metadata (`id`, `name`, `parentId`, `updatedAt`). |
| **`localStorage`** | `easydraw:theme` | Persists user appearance choice (`"light"` \| `"dark"` \| `"system"`). |
| **`IndexedDB`** (`easydraw-db`) | `easydraw:scene:{id}` | Stores heavy diagram objects (`elements[]`, `appState`, and image `files`) without 5MB quota limits. |

---

## 📄 File Formats & Portability

### 1. Flow `.excalidraw` File
- Fully compatible with [excalidraw.com](https://excalidraw.com).
- Export any flow to share with teammates via email, Slack, or cloud drive.
- Import any existing `.excalidraw` file directly into a folder or into the current canvas.

### 2. Workspace `.easydraw` Backup
Export the full state of all folders, flows, and canvas diagrams into a portable JSON package for migration between computers or browsers:

```json
{
  "version": 1,
  "app": "easydraw",
  "exportedAt": 1730472000000,
  "folders": [
    {
      "id": "f8a1...",
      "name": "Backend Services",
      "parentId": null,
      "createdAt": 1730471000000,
      "updatedAt": 1730471500000
    }
  ],
  "flows": [
    {
      "id": "e2b4...",
      "name": "Auth Flow & OAuth 2.0",
      "parentId": "f8a1...",
      "createdAt": 1730471100000,
      "updatedAt": 1730471800000
    }
  ],
  "scenes": {
    "e2b4...": {
      "elements": [ ... ],
      "appState": { "viewBackgroundColor": "#ffffff" },
      "files": { ... }
    }
  }
}
```

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/)
- **Bundler**: [Vite 6](https://vitejs.dev/)
- **Language**: JavaScript (ES2022)
- **Canvas Engine**: [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw)
- **Client Routing**: [React Router v6](https://reactrouter.com/)
- **IndexedDB**: [`idb`](https://github.com/jakearchibald/idb)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Hosting**: [Cloudflare](https://workers.cloudflare.com/)

---

## 💻 Local Development

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or pnpm

### Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/KoripelliAkash/EasyDraw.git

# 2. Navigate into the project
cd EasyDraw/EasyDraw

# 3. Install dependencies
npm install

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev`: Starts Vite dev server with instant Hot Module Replacement.
- `npm run build`: Compiles production assets into `dist/`.
- `npm run lint`: Runs ESLint across `.js` and `.jsx` files.
- `npm run format`: Formats source code with Prettier.

---

## 📄 License

This project is licensed under the MIT License.
