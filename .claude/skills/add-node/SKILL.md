---
description: Add a complete node to Blinkbox — frontend config panel, nodeRegistry entry, and backend handler stub — in one shot.
---

You are adding a new node to the Blinkbox automation platform. Follow these steps in order:

## Step 1: Gather Info

Ask the user for (if not already provided):
1. **Node name** (e.g., "Stripe Refund", "PDF Parser")
2. **What it does** — one sentence description
3. **Config fields** — what options does the user set? (e.g., "amount, currency, reason")
4. **Does it have a brand logo?** — if yes, what's the app name?

## Step 2: Create Frontend Config Panel

Create `apps/frontend/src/pages/Workspace/components/nodes/MyNodeNameNode.jsx`:

- Header block: category-colored icon + node name + subtitle
- Config fields using SmartVariableInput for dynamic values, toggles for booleans, pill buttons for ≤5 options
- Output preview banner at bottom: "Returns: fieldName (type), fieldName2 (type)"
- Follow ALL rules from `.claude/rules/frontend-ui.md`

## Step 3: Register in nodeRegistry.js

Add to `apps/frontend/src/pages/Workspace/nodeRegistry.js`:
1. Import the new ConfigPanel at the top
2. Import Lucide icon (or logoUrl asset) if new
3. Add registry entry with: icon, label, description, category, colorClass, ConfigPanel
4. Run audit mentally: all three imports must exist

## Step 4: Create Backend Handler

Create `apps/backend/src/nodes/myNodeName.node.js`:
- Export: `{ name, type: 'action', inputs, outputs, handler }`
- Handler: async, stateless, try/catch wrapped
- Follow ALL rules from `.claude/rules/backend-nodes.md`

## Step 5: Register Backend Node

Add import + export to `apps/backend/src/nodes/agentTools.registry.js`

## Step 6: Commit & Push

Stage all new/modified files specifically. Commit with message: `Add [NodeName] node — frontend panel + backend handler`. Push.

## Quality Checklist

Before marking done:
- [ ] No undefined icon or ConfigPanel in registry
- [ ] SmartVariableInput used for expression fields
- [ ] No raw JSON editor exposed to user
- [ ] Toggle used instead of checkbox
- [ ] Config panel has output preview banner
- [ ] Backend handler has try/catch
- [ ] Both registry files updated
- [ ] Committed and pushed
