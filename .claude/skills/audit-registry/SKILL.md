---
description: Audit the nodeRegistry.js for undefined icons, missing ConfigPanels, and broken imports. Reports a clean bill of health or a precise fix list.
---

You are auditing the Blinkbox node registry for broken references.

## What to Check

Run this in the terminal to get the full picture fast:

```bash
cd apps/frontend
grep -n "icon:" src/pages/Workspace/nodeRegistry.js | grep -v "//\|logoUrl" | head -60
grep -n "ConfigPanel:" src/pages/Workspace/nodeRegistry.js | head -60
```

Then cross-reference against the import blocks at the top of nodeRegistry.js:
```bash
grep -n "^import" src/pages/Workspace/nodeRegistry.js
```

## Check 1: Lucide Icons

Verify every `icon: SomeName` value appears in the lucide-react import line.

Known non-existent Lucide icons (use alternatives):
- `CloudUpload` → `UploadCloud`
- `CloudDownload` → `DownloadCloud`  
- `ClipboardIcon` → `Clipboard`
- `StopCircle` → `XCircle`

## Check 2: ConfigPanels

Verify every `ConfigPanel: SomeName` is imported at the top. Special cases:
- `EmailTriggerNode`, `ImapTriggerNode`, `ErrorTriggerNode` need explicit named imports
- `GenericActionNode` is the fallback stub — flag all nodes still using it

## Check 3: Logo Assets

Verify every `logoUrl: imgSomeName` has a matching `import imgSomeName from '...'` line.

## Check 4: Category IDs

Verify every `category: 'xyz'` value exists as a CATEGORIES entry `{ id: 'xyz', ... }`.

## Output Format

Report in this format:

### ✅ Clean
- N nodes registered, all imports verified

### ❌ Issues Found
| Node key | Problem | Fix |
|----------|---------|-----|
| myNode | `icon: FooBar` not imported | Add `FooBar` to lucide import |
| anotherNode | `ConfigPanel: MissingPanel` not imported | Add import or use GenericActionNode |

### ⚠️ Stubs (Using GenericActionNode)
List all nodes using GenericActionNode as ConfigPanel — these need real config panels built.

## After Finding Issues

Fix every issue found. Then commit and push.
