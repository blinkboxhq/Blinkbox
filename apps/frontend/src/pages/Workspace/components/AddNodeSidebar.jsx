import { useState } from "react";
import { Search, X } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry, CATEGORIES } from "../nodeRegistry";

// All non-trigger nodes, each with its registry key attached
const ALL_NODES = Object.entries(NodeRegistry)
  .filter(([, def]) => def.category !== "trigger")
  .map(([key, def]) => ({ key, ...def }));

export default function AddNodeSidebar() {
  const [search, setSearch] = useState("");
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setAddNodeOpen = useWorkspaceStore((s) => s.setAddNodeOpen);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const nodes = useWorkspaceStore((s) => s.nodes);

  const handleAdd = (nodeDef) => {
    // Place new node roughly to the right of the last node on canvas
    const lastNode = nodes[nodes.length - 1];
    const position = lastNode
      ? { x: lastNode.position.x + 280, y: lastNode.position.y }
      : { x: 400, y: 300 };

    const newId = `${nodeDef.key}-${crypto.randomUUID()}`;
    addNode({
      id: newId,
      type: "custom",
      position,
      data: {
        backendType: nodeDef.key,
        label: nodeDef.label,
        type: "action",
        config: {},
      },
    });
    setAddNodeOpen(false);
    setSelectedNodeId(newId);
  };

  const query = search.toLowerCase();
  const filtered = query
    ? ALL_NODES.filter(
        (n) =>
          n.label.toLowerCase().includes(query) ||
          n.key.toLowerCase().includes(query),
      )
    : null;

  // Non-trigger categories in order
  const visibleCategories = CATEGORIES.filter((c) => c.id !== "trigger");

  const renderNode = (nodeDef) => {
    const Icon = nodeDef.icon;
    return (
      <button
        key={nodeDef.key}
        onClick={() => handleAdd(nodeDef)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800/60 transition-all duration-150 text-left group border border-transparent hover:border-zinc-700/40 w-full"
      >
        <div className="w-6 h-6 shrink-0 flex items-center justify-center">
          {nodeDef.logoUrl ? (
            <img src={nodeDef.logoUrl} alt={nodeDef.label} className="w-5 h-5 object-contain" />
          ) : (
            <Icon className={`w-5 h-5 ${nodeDef.colorClass}`} />
          )}
        </div>
        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors truncate">
          {nodeDef.label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
            Add a step
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Click any node to add it to the canvas
          </p>
        </div>
        <button
          onClick={() => setAddNodeOpen(false)}
          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-3 shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-zinc-900 border border-zinc-700/60 rounded-xl focus-within:border-zinc-500 transition-colors">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
            autoFocus
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {filtered !== null ? (
          // Search results — flat list
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="w-7 h-7 text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-600">No nodes found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map(renderNode)}
            </div>
          )
        ) : (
          // Grouped view
          <div className="flex flex-col gap-4">
            {visibleCategories.map((cat) => {
              const catNodes = ALL_NODES.filter((n) => n.category === cat.id);
              if (catNodes.length === 0) return null;
              const CatIcon = cat.icon;
              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-1.5 px-3 pb-1.5">
                    <CatIcon className="w-3 h-3 text-zinc-600" strokeWidth={2} />
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                      {cat.label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {catNodes.map(renderNode)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
