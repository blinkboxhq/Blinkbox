import { useState } from "react";
import { Search, X, ArrowLeft } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry, CATEGORIES } from "../nodeRegistry";

const ACTION_CATEGORIES = CATEGORIES.filter((c) => c.id !== "trigger");

const ALL_NODES = Object.entries(NodeRegistry)
  .filter(([, def]) => def.category !== "trigger")
  .map(([key, def]) => ({ key, ...def }));

const ALL_SEARCHABLE = [
  ...ALL_NODES,
  ...ALL_NODES, // dedupe below
].filter((v, i, a) => a.findIndex((n) => n.key === v.key) === i);

export default function AddNodeSidebar() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState("home"); // "home" | category id

  const addNode        = useWorkspaceStore((s) => s.addNode);
  const addNodeSource  = useWorkspaceStore((s) => s.addNodeSource);
  const nodes          = useWorkspaceStore((s) => s.nodes);
  const edges          = useWorkspaceStore((s) => s.edges);
  const setAddNodeOpen = useWorkspaceStore((s) => s.setAddNodeOpen);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const clearAddNodeModal = useWorkspaceStore((s) => s.clearAddNodeModal);
  const addEdge        = useWorkspaceStore((s) => s.onConnect);

  const handleClose = () => {
    setAddNodeOpen(false);
    clearAddNodeModal();
    setPage("home");
    setSearch("");
  };

  const handleAdd = (nodeDef) => {
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
      data: { backendType: nodeDef.key, label: nodeDef.label, type: "action", config: {} },
    });

    // Auto-connect from source node
    if (addNodeSource && addNodeSource !== "__edge__") {
      const alreadyConnected = edges.some((e) => e.source === addNodeSource && e.sourceHandle === "output");
      if (!alreadyConnected) {
        addEdge({ source: addNodeSource, target: newId, sourceHandle: "output", targetHandle: null });
      }
    }

    handleClose();
    setSelectedNodeId(newId);
  };

  const query = search.toLowerCase();
  const filtered = query
    ? ALL_SEARCHABLE.filter(
        (n) => n.label.toLowerCase().includes(query) || n.key.toLowerCase().includes(query)
      )
    : null;

  const NodeRow = ({ nodeDef }) => {
    const Icon = nodeDef.icon;
    return (
      <button
        onClick={() => handleAdd(nodeDef)}
        className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group"
      >
        <div className="w-8 h-8 shrink-0 flex items-center justify-center">
          {nodeDef.logoUrl ? (
            <img
              src={nodeDef.logoUrl}
              alt={nodeDef.label}
              className="w-6 h-6 object-contain"
              style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined}
            />
          ) : (
            <Icon className={`w-6 h-6 ${nodeDef.colorClass}`} strokeWidth={1.6} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{nodeDef.label}</div>
          {nodeDef.description && (
            <div className="text-[12px] text-zinc-500 mt-0.5 group-hover:text-zinc-400 truncate">{nodeDef.description}</div>
          )}
        </div>
      </button>
    );
  };

  const CategoryCard = ({ cat }) => {
    const catNodes = ALL_NODES.filter((n) => n.category === cat.id);
    if (catNodes.length === 0) return null;
    const CatIcon = cat.icon;
    return (
      <button
        onClick={() => setPage(cat.id)}
        className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/30 transition-all duration-150 text-left group"
      >
        <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0 group-hover:bg-zinc-700/80 transition-colors">
          <CatIcon className="w-4.5 h-4.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white leading-tight">{cat.label}</div>
          <div className="text-[12px] text-zinc-500 mt-0.5">{catNodes.length} node{catNodes.length !== 1 ? "s" : ""}</div>
        </div>
        <span className="text-zinc-600 group-hover:text-zinc-400 text-lg leading-none">›</span>
      </button>
    );
  };

  // Sub-page: category drill-down
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
          {catNodes.map((n) => <NodeRow key={n.key} nodeDef={n} />)}
        </div>
      </div>
    );
  }

  // Home page
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
        <div>
          <h2 className="text-[16px] font-bold text-zinc-100 tracking-tight">Add next step</h2>
          <p className="text-[13px] text-zinc-500 mt-1">Choose what happens after this node</p>
        </div>
        <button onClick={handleClose} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
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

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-0.5">
        {filtered !== null ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Search className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="text-[13px] text-zinc-600">No nodes found</p>
            </div>
          ) : (
            filtered.map((n) => <NodeRow key={n.key} nodeDef={n} />)
          )
        ) : (
          ACTION_CATEGORIES.map((cat) => <CategoryCard key={cat.id} cat={cat} />)
        )}
      </div>
    </div>
  );
}
