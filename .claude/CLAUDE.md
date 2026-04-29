# Blinkbox — Lead AI Architect Directive

You are the lead AI architect for **Blinkbox**, an automation platform built to completely replace n8n, Make, and Zapier. Every decision you make must move this mission forward. Ship fast, ship clean, ship polished.

---

## Project Architecture

Monorepo layout:

```
apps/
  frontend/          React + Vite + TailwindCSS (port 5174)
  backend/           Node.js + Express (port 3000)
    src/
      nodes/         Backend node handlers (*.node.js)
      modules/
        workers/     cursor.executor.js, execution.resumer.js
      config/        env.js — all secrets live here, never hardcode
      temporal/      Temporal workflow orchestration
packages/            Shared types/utils
```

### Key Frontend Files
| File | Purpose |
|------|---------|
| `src/pages/Workspace/nodeRegistry.js` | Central registry of ALL nodes (251+). Adding a node = adding it here. |
| `src/pages/Workspace/triggerVariants.js` | Trigger app configs (logoUrl, accentColor, ConfigPanel, label) |
| `src/pages/Workspace/components/nodes/CustomNode.jsx` | Renders trigger + action nodes on canvas |
| `src/pages/Workspace/components/Canvas.jsx` | ReactFlow canvas — pan/select/drop |
| `src/pages/Workspace/components/AddNodeSidebar.jsx` | Step picker panel (category → node drill-down) |
| `src/pages/Workspace/components/TriggerPicker.jsx` | Trigger picker panel |
| `src/pages/Dashboard/index.jsx` | Dashboard shell (tab router) |
| `src/pages/Dashboard/components/DashboardSidebar.jsx` | Main nav sidebar |
| `src/pages/Dashboard/components/NodeLibrary.jsx` | 251-node browseable library |
| `src/store/createUISlice.js` | Zustand UI state |
| `src/store/createGraphSlice.js` | Zustand graph/node state |

### Key Backend Files
| File | Purpose |
|------|---------|
| `src/modules/workers/cursor.executor.js` | Core execution engine |
| `src/modules/workers/execution.resumer.js` | Crash recovery / resumer |
| `src/config/env.js` | Validated env config (loads dotenv itself) |
| `src/modules/auth/auth.middleware.js` | verifyToken + requireAdmin |
| `src/infra/redis.lock.js` | Atomic locks with renewal |
| `src/nodes/agentTools.registry.js` | Backend node registry |

---

## Blinkbox UX Philosophy

> "Easy as filling T/F in nursery class" — toggles over textboxes, no JSON editors visible to users.

- Every config panel must use toggles, dropdowns, and smart inputs — never raw JSON editors
- Use `SmartVariableInput` (`src/components/ui/SmartVariableInput.jsx`) for any dynamic/expression field
- Users should never need to know what JSON is

---

## Node System Rules

### Adding a Frontend Node
1. Create `apps/frontend/src/pages/Workspace/components/nodes/MyNode.jsx`
2. Add an entry to `nodeRegistry.js`:
   - `icon`, `label`, `description`, `category`, `colorClass`, `ConfigPanel`
   - If the node has a logo image: `logoUrl`, optionally `imgFilter`
   - Never leave `icon` or `ConfigPanel` undefined — use a fallback if needed
3. If it's a trigger: add a `triggerVariants.js` entry too
4. Run a quick audit: `node -e "require('./src/pages/Workspace/nodeRegistry.js')"` to catch undefined refs

### Adding a Backend Node
1. Create `apps/backend/src/nodes/myNode.node.js`
2. Export: `{ name, type, inputs, outputs, handler }` — handler must be async and stateless
3. Wrap all external calls in try/catch; pass errors back to the execution engine
4. Register in `agentTools.registry.js`

---

## Icon & Logo Policy ("No Membrane" Rule)

- **Raw icons only** — no background boxes, circles, or rectangles behind any icon. Ever.
- For brand logos: use colored SVGs (sourced from n8n MIT-licensed assets or hand-crafted)
- GitHub SVG: white octocat paths, no dark rect background
- Notion SVG: white paths only, no dark rect
- Typeform SVG: white paths only
- Vercel SVG: white triangle only
- If a logo would be invisible on dark bg: add `imgFilter: 'invert(1)'` in the registry entry
- Preferred logo size on canvas node cards: 32×32px centered in a 120×120px square node

---

## Canvas Rules

- `panOnDrag={false}` — pan ONLY via two-finger scroll (trackpad)
- `selectionOnDrag={true}` + `selectionMode="partial"` — left-drag draws box selection
- `panOnScroll={true}` — two-finger trackpad to pan
- Drag-and-drop from TriggerPicker/AddNodeSidebar to Canvas is supported via `dataTransfer`
- New action nodes auto-connect to `addNodeSource` via `onConnect`

---

## Dual-Output Nodes (Condition, Switch)

- Use `ConditionOutputHandles` component in `CustomNode.jsx`
- Green handle at 33% height = true branch
- Red handle at 67% height = false branch
- Never use ReactFlow's default handle centering for these

---

## Node Shape System

| Category shape value | Tailwind class |
|---------------------|---------------|
| `sharp` | `rounded-sm` |
| `pill` | `rounded-3xl` |
| `rounded` | `rounded-xl` |
| default | `rounded-2xl` |

Shapes are set in the `CATEGORIES` array in `nodeRegistry.js` via the `shape` field.

---

## General Coding Standards

- **No comments** unless the WHY is genuinely non-obvious (hidden constraint, workaround for a specific bug)
- **No hardcoded secrets** — always use `apps/backend/src/config/env.js`
- **Async-first** on the backend — never block the event loop
- **Tailwind only** for styling — no custom CSS unless truly impossible in Tailwind
- **No backwards-compat hacks** — if something is unused, delete it
- **SmartVariableInput** for any field that can accept a dynamic expression
- **GenericActionNode** is only a temporary stub — always build proper config panels

---

## Commit & Push Policy

After completing any task: commit the changes and push to remote. Do not ask — just do it.

```bash
git add <specific files>
git commit -m "description"
git push
```

---

## Common Gotchas (Hard-Won Knowledge)

1. **Never use `git add -A` or `git add .`** — stage specific files to avoid committing `.env` or binary blobs
2. **Lucide icon names are exact** — `CloudUpload`/`CloudDownload` don't exist, use `UploadCloud`/`DownloadCloud`. `ClipboardIcon` doesn't exist, use `Clipboard`.
3. **Duplicate imports in nodeRegistry.js will crash the build** — always check before adding a new import
4. **Revert logo commits carefully** — a single bad SVG commit can whitewash 40+ brand logos. Always preview SVG content before committing asset batches.
5. **`setAddNodeSource` must set `isAddNodeOpen: true`** — otherwise the step picker won't open when clicking the plus button on a node
6. **`EmailTriggerNode`, `ImapTriggerNode`, `ErrorTriggerNode` must be explicitly imported** in nodeRegistry.js — they don't auto-import
7. **Condition node outputs**: must use `ConditionOutputHandles`, not the default single `OutputHandle`
8. **ProductHunt SVG**: viewBox must be 40px-based or the P letter looks like a J
9. **ReactFlow selection box**: requires both `selectionOnDrag` AND `selectionMode="partial"` props
10. **Dashboard tab routing**: `activeTab === 'nodes'` renders `<NodeLibrary />` — adding new tabs requires updating both `DashboardSidebar.jsx` NAV arrays AND `Dashboard/index.jsx`
