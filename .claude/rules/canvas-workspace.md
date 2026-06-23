# Canvas & Workspace Rules

Apply these rules whenever touching the ReactFlow canvas or workspace components.

---

## Canvas Configuration (Canvas.jsx)

Critical ReactFlow props — never change these without explicit user instruction:

```jsx
<ReactFlow
  panOnDrag={false}          // ← pan = two-finger scroll ONLY
  panOnScroll={true}         // ← two-finger trackpad pan
  selectionOnDrag={true}     // ← left-drag = box selection
  selectionMode="partial"    // ← partial overlap selects nodes
  /* ... */
/>
```

Changing `panOnDrag` to `true` breaks the box-selection UX. Do not do this.

## Drag-and-Drop Protocol

Nodes are dragged from TriggerPicker / AddNodeSidebar onto the canvas.

**Drag source side** (picker components):
```js
e.dataTransfer.setData('application/blinkbox-node', JSON.stringify({
  backendType: 'myNode',
  label: 'My Node',
  type: 'action',          // 'trigger' | 'action'
  config: { /* initial config */ },
}));
```

**Drop target side** (Canvas.jsx `onDrop`):
- Convert screen coords to ReactFlow coords via `screenToFlowPosition`
- Create node with `id: nanoid()`, position from drop coords, `data` from payload
- If `type === 'action'` and `addNodeSource` exists, auto-connect via `onConnect`

## Node Positioning

- New trigger nodes: placed below any existing trigger nodes (scan existing nodes, find max Y)
- New action nodes: placed at drop position or auto-layout offset from source node
- Default node size reference: `120×120px` for square nodes, `200×54px` for wide trigger nodes

## Store Slices

Workspace state lives in Zustand slices:

| Action | Slice | Notes |
|--------|-------|-------|
| `setAddNodeSource(nodeId)` | `createUISlice` | Also sets `isAddNodeOpen: true` and clears `selectedNodeId` |
| `clearAddNodeModal()` | `createUISlice` | Also sets `isAddNodeOpen: false` |
| `setSelectedNodeId(id)` | `createUISlice` | Opened by clicking a node |
| `addNode(node)` | `createGraphSlice` | Adds to graph |
| `addEdge(edge)` | `createGraphSlice` | Adds connection |

**Do not call `setSelectedNodeId` inside `setAddNodeSource`** — this race condition caused the plus button to not open the step picker. `setAddNodeSource` clears `selectedNodeId` itself.

## OutputHandle Component

Single-output nodes use `<OutputHandle cardHeight={h} />` where `h` is the pixel height of the card.
- The handle is centered at `top: cardHeight / 2` explicitly (not `top-1/2`) to avoid percentage-of-wrapper miscalculation.

## ConditionOutputHandles Component

Dual-output nodes (Condition, Switch) use `<ConditionOutputHandles cardHeight={h} />`:
- Green handle (true): `top: h * 0.33`
- Red handle (false): `top: h * 0.67`
- Icons: `CheckCheck` (green) and `XCircle` (red)
- **Never use default ReactFlow handle centering for these.**

## Adding New Canvas Features

When adding canvas toolbar buttons:
- Position: bottom-right corner, above the existing toolbar cluster
- Style: `bg-neutral-900 border border-[#333] rounded-lg p-2 text-neutral-500 hover:text-white hover:border-neutral-600`
- Tooltip: use `title` attribute, not a custom component
