import { useState } from "react";
import { Search, X, ArrowLeft, ChevronRight, CheckCircle2, Plus } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry, CATEGORIES } from "../nodeRegistry";
import { NODE_ACTIONS } from "../nodeActions";
import { playNodeLand } from "../../../lib/sounds";

const ACTION_CATEGORIES = CATEGORIES.filter((c) => c.id !== "trigger");

const ALL_NODES = Object.entries(NodeRegistry)
  .filter(([, def]) => def.category !== "trigger" && !def.agentOnly)
  .map(([key, def]) => ({ key, ...def }));

const ALL_SEARCHABLE = ALL_NODES.filter((v, i, a) => a.findIndex((n) => n.key === v.key) === i);

export default function AddNodeSidebar() {
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState("home");
  const [pendingNode, setPending] = useState(null);
  const [selected, setSelected]   = useState(new Set()); // Set of node keys

  const addNode           = useWorkspaceStore((s) => s.addNode);
  const addNodeSource     = useWorkspaceStore((s) => s.addNodeSource);
  const nodes             = useWorkspaceStore((s) => s.nodes);
  const edges             = useWorkspaceStore((s) => s.edges);
  const setAddNodeOpen    = useWorkspaceStore((s) => s.setAddNodeOpen);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const clearAddNodeModal = useWorkspaceStore((s) => s.clearAddNodeModal);
  const onConnect         = useWorkspaceStore((s) => s.onConnect);

  const handleClose = () => {
    setAddNodeOpen(false);
    clearAddNodeModal();
    setPage("home");
    setSearch("");
    setPending(null);
    setSelected(new Set());
  };

  const basePosition = () => {
    const sourceNode = nodes.find((n) => n.id === addNodeSource);
    return sourceNode
      ? { x: sourceNode.position.x + 300, y: sourceNode.position.y }
      : nodes.length > 0
      ? { x: nodes[nodes.length - 1].position.x + 300, y: nodes[nodes.length - 1].position.y }
      : { x: 400, y: 300 };
  };

  const commitNode = (nodeDef, selectedAction = null) => {
    const pos = basePosition();
    const newId = `${nodeDef.key}-${crypto.randomUUID()}`;
    addNode({
      id: newId,
      type: "custom",
      position: pos,
      data: {
        backendType: nodeDef.key,
        label: selectedAction || nodeDef.label,
        type: "action",
        config: selectedAction ? { selectedAction } : {},
      },
    });
    if (addNodeSource && addNodeSource !== "__edge__") {
      const alreadyConnected = edges.some((e) => e.source === addNodeSource && e.sourceHandle === "output");
      if (!alreadyConnected) {
        onConnect({ source: addNodeSource, target: newId, sourceHandle: "output", targetHandle: null });
      }
    }
    playNodeLand();
    handleClose();
    setSelectedNodeId(newId);
  };

  const commitAll = () => {
    if (selected.size === 0) return;
    const base = basePosition();
    let lastId = null;
    let i = 0;
    for (const key of selected) {
      const def = NodeRegistry[key];
      if (!def) continue;
      const pos = { x: base.x + i * 320, y: base.y };
      const newId = `${key}-${crypto.randomUUID()}`;
      addNode({ id: newId, type: "custom", position: pos, data: { backendType: key, label: def.label, type: "action", config: {} } });
      if (i === 0 && addNodeSource && addNodeSource !== "__edge__") {
        const alreadyConnected = edges.some((e) => e.source === addNodeSource && e.sourceHandle === "output");
        if (!alreadyConnected) onConnect({ source: addNodeSource, target: newId, sourceHandle: "output", targetHandle: null });
      }
      lastId = newId;
      i++;
    }
    playNodeLand();
    handleClose();
    if (lastId) setSelectedNodeId(lastId);
  };

  const toggleNode = (nodeDef) => {
    const actions = NODE_ACTIONS[nodeDef.key];
    if (actions && actions.length > 0 && !selected.has(nodeDef.key)) {
      setPending(nodeDef);
      setPage("actions");
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(nodeDef.key) ? next.delete(nodeDef.key) : next.add(nodeDef.key);
      return next;
    });
  };

  const query = search.toLowerCase();
  const filtered = query
    ? ALL_SEARCHABLE.filter(
        (n) => n.label.toLowerCase().includes(query) || n.key.toLowerCase().includes(query)
      )
    : null;

  // ── Action picker page ─────────────────────────────────────────────────────
  if (page === "actions" && pendingNode) {
    const actions = NODE_ACTIONS[pendingNode.key] || [];
    const Icon = pendingNode.icon;
    const prevPage = ACTION_CATEGORIES.find((c) => c.id === pendingNode.category) ? pendingNode.category : "home";

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4 shrink-0">
          <button
            onClick={() => { setPending(null); setPage(prevPage); }}
            className="p-1.5 text-white/50 hover:text-neutral-200 hover:bg-white/[0.07] rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {/* Node logo or icon */}
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            {pendingNode.logoUrl ? (
              <img
                src={pendingNode.logoUrl}
                alt={pendingNode.label}
                className="w-7 h-7 object-contain"
                style={pendingNode.imgFilter ? { filter: pendingNode.imgFilter } : undefined}
              />
            ) : (
              <Icon className="w-7 h-7 text-white" strokeWidth={1.6} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-white leading-tight">{pendingNode.label}</div>
            <div className="text-[11px] text-white/50 mt-0.5">{actions.length} actions available</div>
          </div>
          <button onClick={handleClose} className="ml-auto p-1.5 text-white/40 hover:text-neutral-300 hover:bg-white/[0.07] rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => commitNode(pendingNode, action.name)}
              className="flex items-start gap-3 w-full py-3 px-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/20 transition-all duration-150 text-left group mb-0.5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-neutral-200 group-hover:text-white leading-snug">
                  {action.name}
                </div>
                <div className="text-[11px] text-white/50 mt-0.5 group-hover:text-white/70 leading-relaxed">
                  {action.description}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 shrink-0 mt-1 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const SelectionFooter = () => selected.size === 0 ? null : (
    <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-[#0d0d10] flex items-center gap-2">
      <button
        onClick={() => setSelected(new Set())}
        className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg transition-colors shrink-0"
        title="Clear selection"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <span className="text-[12px] text-white/50 flex-1">{selected.size} node{selected.size !== 1 ? "s" : ""} selected</span>
      <button
        onClick={commitAll}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-bold transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add {selected.size}
      </button>
    </div>
  );

  // ── Category drill-down page ───────────────────────────────────────────────
  if (page !== "home") {
    const cat = ACTION_CATEGORIES.find((c) => c.id === page);
    const catNodes = ALL_NODES.filter((n) => n.category === page);
    const CatIcon = cat?.icon;
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5 shrink-0">
          <button
            onClick={() => setPage("home")}
            className="p-1.5 text-white/50 hover:text-neutral-200 hover:bg-white/[0.07] rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {CatIcon && <CatIcon className="w-5 h-5 text-white/70 shrink-0" strokeWidth={1.6} />}
          <div>
            <div className="text-[15px] font-bold text-white leading-tight">{cat?.label}</div>
            <div className="text-[11px] text-white/50 mt-0.5">{catNodes.length} nodes available</div>
          </div>
          <button onClick={handleClose} className="ml-auto p-1.5 text-white/40 hover:text-neutral-300 hover:bg-white/[0.07] rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
          {catNodes.map((n) => <NodeRow key={n.key} nodeDef={n} onSelect={toggleNode} selected={selected.has(n.key)} />)}
        </div>
        <SelectionFooter />
      </div>
    );
  }

  // ── Home page ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
        <div>
          <h2 className="text-[16px] font-bold text-white tracking-tight">Add next step</h2>
          <p className="text-[13px] text-white/50 mt-1">Choose what happens after this node</p>
        </div>
        <button onClick={handleClose} className="p-1.5 text-white/40 hover:text-neutral-300 hover:bg-white/[0.07] rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 pb-4 shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-white/[0.04] border border-white/15 rounded-xl focus-within:border-white/30 transition-colors">
          <Search className="w-4 h-4 text-white/50 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="flex-1 bg-transparent text-[13px] text-neutral-200 outline-none placeholder:text-white/40"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-0.5">
        {filtered !== null ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Search className="w-8 h-8 text-neutral-700 mb-3" />
              <p className="text-[13px] text-white/40">No nodes found</p>
            </div>
          ) : (
            filtered.map((n) => <NodeRow key={n.key} nodeDef={n} onSelect={toggleNode} selected={selected.has(n.key)} />)
          )
        ) : (
          ACTION_CATEGORIES.map((cat) => <CategoryCard key={cat.id} cat={cat} setPage={setPage} />)
        )}
      </div>
      <SelectionFooter />
    </div>
  );
}

function NodeRow({ nodeDef, onSelect, selected }) {
  const Icon = nodeDef.icon;
  const hasActions = NODE_ACTIONS[nodeDef.key]?.length > 0;
  const onDragStart = (e) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify({
      backendType: nodeDef.key,
      label: nodeDef.label,
      type: "action",
    }));
  };
  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={() => onSelect(nodeDef)}
      className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl border transition-all duration-150 text-left group cursor-grab active:cursor-grabbing ${selected ? "bg-violet-500/10 border-violet-500/40" : "hover:bg-white/[0.04] border-transparent hover:border-white/20"}`}
    >
      <div className="w-8 h-8 shrink-0 flex items-center justify-center" style={{ minWidth: 32 }}>
        {nodeDef.logoUrl ? (
          <img
            src={nodeDef.logoUrl}
            alt={nodeDef.label}
            className="w-7 h-7 object-contain"
            style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined}
          />
        ) : (
          <Icon className="w-7 h-7 text-white" strokeWidth={1.6} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white group-hover:text-white leading-tight">{nodeDef.label}</div>
        {nodeDef.description && (
          <div className="text-[12px] text-white/50 mt-0.5 group-hover:text-white/70 truncate">{nodeDef.description}</div>
        )}
      </div>
      {selected ? (
        <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
      ) : hasActions ? (
        <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 shrink-0 transition-colors" />
      ) : null}
    </button>
  );
}

function CategoryCard({ cat, setPage }) {
  const catNodes = ALL_NODES.filter((n) => n.category === cat.id);
  if (catNodes.length === 0) return null;
  const CatIcon = cat.icon;
  return (
    <button
      onClick={() => setPage(cat.id)}
      className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-white/20 transition-all duration-150 text-left group"
    >
      <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ minWidth: 32 }}>
        <CatIcon className="w-7 h-7 text-white/70 group-hover:text-white transition-colors" strokeWidth={1.6} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white group-hover:text-white leading-tight">{cat.label}</div>
        <div className="text-[12px] text-white/50 mt-0.5">{catNodes.length} node{catNodes.length !== 1 ? "s" : ""}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 shrink-0 transition-colors" />
    </button>
  );
}
