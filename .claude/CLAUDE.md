# Blinkbox — AI Architect Directive

> Automation platform replacing n8n/Make/Zapier. Ship fast, clean, polished.

## Stack
- Frontend: React+Vite+Tailwind @ port 5174 → `apps/frontend/src/`
- Backend: Node+Express @ port 3000 → `apps/backend/src/`
- DB: MongoDB Atlas + Redis + Puppeteer

## Critical Files (read these first when relevant)
| File | Role |
|------|------|
| `apps/frontend/src/pages/Workspace/nodeRegistry.js` | ALL 251+ nodes registered here |
| `apps/frontend/src/pages/Workspace/triggerVariants.js` | Trigger app configs |
| `apps/frontend/src/pages/Workspace/components/nodes/CustomNode.jsx` | Canvas node renderer |
| `apps/frontend/src/pages/Workspace/components/NodeConfigModal.jsx` | 3-panel config modal |
| `apps/backend/src/nodes/index.js` | Backend node registry |
| `apps/backend/src/modules/workers/cursor.executor.js` | Core execution engine |
| `apps/backend/src/config/env.js` | All env vars (loads dotenv) |

## Node Rules
- Frontend key = backendType = backend registry key (must match exactly)
- Registry entry needs: `icon, label, description, category, colorClass, ConfigPanel`
- Logo: `logoUrl: imgX, imgFilter: 'invert(1)'` if dark on dark bg
- Trigger nodes → also add to `triggerVariants.js`
- Dual-output nodes (condition, success_failed) → use `ConditionOutputHandles` / `SuccessFailedOutputHandles` in CustomNode

## Code Rules
- **No comments** unless WHY is non-obvious
- **No hardcoded secrets** — use `apps/backend/src/config/env.js`
- **Tailwind only** — no custom CSS
- **SmartVariableInput** for any dynamic field
- **No `git add .` or `git add -A`** — stage specific files only
- After every task: `git add <files> && git commit -m "..." && git push`

## UX Philosophy
Toggles over textboxes. No raw JSON editors. Users never see JSON.

## Icon/Logo ("No Membrane" Rule)
Raw SVG/icon only — no background rects or circles. Ever.
If dark logo on dark bg: `imgFilter: 'invert(1)'` in registry.

## Canvas
- `panOnDrag=false` / `panOnScroll=true` / `selectionOnDrag=true` — NEVER change these
- Condition true handle: `id="true"` green @ 33% height
- Condition false handle: `id="false"` red @ 67% height
- success_failed: `id="success"` green @ 33%, `id="failed"` red @ 67%

## Execution Engine
- `node.type` in executor → looks up `nodeRegistry[node.type]` in backend
- Condition false path: return `{ __conditionResult: false }` → executor routes to `onFailure` edges without marking execution failed
- Loop fan-out: return `{ __loopFanOut: true, items: [...] }`
- Delay: return `{ __delay: true, resumeAfter: ISO_string }`

## Security Hard Rules (never violate)
- SSRF guard on all outbound URLs (httpRequest, webScraper)
- Shell tools gated behind `ENABLE_SHELL_TOOLS=true` env flag (off in prod)
- OAuth popup: HTML-encode errors, postMessage to explicit origins only
- Strip `collaborators/_id/__v` from req.body before automation updates

## Gotchas
- `CloudUpload/CloudDownload` don't exist → `UploadCloud/DownloadCloud`
- `ClipboardIcon` → `Clipboard`
- Duplicate imports in nodeRegistry.js crash the build
- `setAddNodeSource` must also set `isAddNodeOpen: true`
- `EmailTriggerNode/ImapTriggerNode/ErrorTriggerNode` need explicit named imports in nodeRegistry
