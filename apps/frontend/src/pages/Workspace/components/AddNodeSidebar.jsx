import { useState } from "react";
import { Search, X, ArrowLeft, ChevronRight } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry, CATEGORIES } from "../nodeRegistry";
import { NODE_ACTIONS } from "../nodeActions";

const ACTION_CATEGORIES = CATEGORIES.filter((c) => c.id !== "trigger");

const ALL_NODES = Object.entries(NodeRegistry)
  .filter(([, def]) => def.category !== "trigger" && !def.agentOnly)
  .map(([key, def]) => ({ key, ...def }));

const ALL_SEARCHABLE = ALL_NODES.filter((v, i, a) => a.findIndex((n) => n.key === v.key) === i);

export default function AddNodeSidebar() {
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState("home"); // "home" | category id | "actions"
  const [pendingNode, setPending] = useState(null);   // nodeDef waiting for action selection

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
  };

  const commitNode = (nodeDef, selectedAction = null) => {
    const sourceNode = nodes.find((n) => n.id === addNodeSource);
    const position = sourceNode
      ? { x: sourceNode.position.x + 300, y: sourceNode.position.y }
      : nodes.length > 0
      ? { x: nodes[nodes.length - 1].position.x + 300, y: nodes[nodes.length - 1].position.y }
      : { x: 400, y: 300 };

    const newId = `${nodeDef.key}-${crypto.randomUUID()}`;
    addNode({
      id: newId,
      type: "custom",
      position,
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

    handleClose();
    setSelectedNodeId(newId);
  };

  const handleNodeClick = (nodeDef) => {
    const actions = NODE_ACTIONS[nodeDef.key];
    if (actions && actions.length > 0) {
      setPending(nodeDef);
      setPage("actions");
    } else {
      commitNode(nodeDef);
    }
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
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
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
              <Icon className={`w-7 h-7 ${pendingNode.colorClass}`} strokeWidth={1.6} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-zinc-100 leading-tight">{pendingNode.label}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{actions.length} actions available</div>
          </div>
          <button onClick={handleClose} className="ml-auto p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => commitNode(pendingNode, action.name)}
              className="flex items-start gap-3 w-full py-3 px-3 rounded-xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group mb-0.5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-zinc-200 group-hover:text-white leading-snug">
                  {action.name}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 group-hover:text-zinc-400 leading-relaxed">
                  {action.description}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-1 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

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
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {CatIcon && <CatIcon className="w-5 h-5 text-zinc-400 shrink-0" strokeWidth={1.6} />}
          <div>
            <div className="text-[15px] font-bold text-zinc-100 leading-tight">{cat?.label}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{catNodes.length} nodes available</div>
          </div>
          <button onClick={handleClose} className="ml-auto p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
          {catNodes.map((n) => <NodeRow key={n.key} nodeDef={n} onSelect={handleNodeClick} />)}
        </div>
      </div>
    );
  }

  // ── Home page ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
        <div>
          <h2 className="text-[16px] font-bold text-zinc-100 tracking-tight">Add next step</h2>
          <p className="text-[13px] text-zinc-500 mt-1">Choose what happens after this node</p>
        </div>
        <button onClick={handleClose} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 pb-4 shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-900 border border-zinc-700/60 rounded-xl focus-within:border-zinc-600 transition-colors">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="flex-1 bg-transparent text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
        {filtered !== null ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Search className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="text-[13px] text-zinc-600">No nodes found</p>
            </div>
          ) : (
            filtered.map((n) => <NodeRow key={n.key} nodeDef={n} onSelect={handleNodeClick} />)
          )
        ) : (
          ACTION_CATEGORIES.map((cat) => <CategoryCard key={cat.id} cat={cat} setPage={setPage} />)
        )}
      </div>
    </div>
  );
}

function NodeRow({ nodeDef, onSelect }) {
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
      className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group cursor-grab active:cursor-grabbing"
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
          <Icon className={`w-7 h-7 ${nodeDef.colorClass}`} strokeWidth={1.6} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{nodeDef.label}</div>
        {nodeDef.description && (
          <div className="text-[12px] text-zinc-500 mt-0.5 group-hover:text-zinc-400 truncate">{nodeDef.description}</div>
        )}
      </div>
      {hasActions && (
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors" />
      )}
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
      className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group"
    >
      <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ minWidth: 32 }}>
        <CatIcon className="w-7 h-7 text-zinc-400 group-hover:text-zinc-200 transition-colors" strokeWidth={1.6} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{cat.label}</div>
        <div className="text-[12px] text-zinc-500 mt-0.5">{catNodes.length} node{catNodes.length !== 1 ? "s" : ""}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors" />
    </button>
  );
}
