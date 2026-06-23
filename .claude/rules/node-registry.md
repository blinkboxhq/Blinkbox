# Node Registry Rules

Apply these rules whenever touching `apps/frontend/src/pages/Workspace/nodeRegistry.js`.

---

## Registry Entry Shape

Every node in `NodeRegistry` must have these fields:

```js
myNode: {
  icon: SomeLucideIcon,       // REQUIRED — Lucide component. Never undefined.
  label: 'My Node',           // REQUIRED — human-readable name
  description: 'Does X',      // REQUIRED — one sentence
  category: 'data',           // REQUIRED — must match a CATEGORIES entry id
  colorClass: 'text-blue-400',// REQUIRED — Tailwind text color for the icon
  ConfigPanel: MyNodePanel,   // REQUIRED — import from components/nodes/. Never undefined.
  // Optional brand logo fields:
  logoUrl: imgMyApp,          // imported SVG/PNG asset
  imgFilter: 'invert(1)',     // CSS filter if logo is dark and needs inverting for dark bg
},
```

**If ConfigPanel isn't built yet:** use `GenericActionNode` as a temporary stub, but flag it with a TODO comment.

## Import Checklist Before Adding

Before adding a new node, verify all three references are imported at the top of the file:
1. `icon` — is the Lucide icon imported? Check the `import { ... } from 'lucide-react'` block.
2. `logoUrl` — is the asset imported? e.g. `import imgMyApp from '../../assets/myapp.svg'`
3. `ConfigPanel` — is the component imported? e.g. `import MyNodePanel from './components/nodes/MyNode.jsx'`

Missing any of these = runtime `undefined` error = white screen.

## Lucide Icon Gotchas

These icons do NOT exist in lucide-react — use the alternatives:

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `CloudUpload` | `UploadCloud` |
| `CloudDownload` | `DownloadCloud` |
| `ClipboardIcon` | `Clipboard` |
| `StopCircle` | use `XCircle` or `OctagonX` |

When in doubt: `grep -r "export.*Icon" node_modules/lucide-react/dist/lucide-react.js | grep MyIcon`

## Categories

The `CATEGORIES` array defines all valid category ids and their display properties. When adding a new category:

```js
{ id: 'mycat', label: 'My Category', icon: SomeIcon, shape: 'rounded' }
```

Shape values: `sharp` | `pill` | `rounded` | (omit for default `rounded-2xl`)

## Audit Script

After making changes, run this to catch any undefined references:

```bash
node -e "
const r = require('./apps/frontend/src/pages/Workspace/nodeRegistry.js');
// If it runs without throwing, imports are clean
console.log('Registry OK —', Object.keys(r.NodeRegistry).length, 'nodes');
"
```

## Trigger Variants

Trigger apps also need an entry in `triggerVariants.js`:

```js
myApp: {
  id: 'myApp',
  label: 'My App',
  logoUrl: imgMyApp,
  accentColor: '#FF5700',
  ConfigPanel: MyAppTriggerNode,
},
```

Both files must stay in sync for apps that appear in the trigger picker.
