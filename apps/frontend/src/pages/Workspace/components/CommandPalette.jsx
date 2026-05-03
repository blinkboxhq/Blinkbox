import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Zap, ArrowRight, Command, CornerDownLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NodeRegistry, CATEGORIES } from "../nodeRegistry";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NODE_ACTIONS } from "../nodeActions";
import { playPanelOpen, playNodeLand } from "../../../lib/sounds";

const ALL_NODES = Object.entries(NodeRegistry)
  .filter(([, def]) => def.category !== "trigger" && !def.agentOnly)
  .map(([key, def]) => ({ key, ...def }))
  .filter((v, i, a) => a.findIndex((n) => n.key === v.key) === i);

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export default function CommandPalette() {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [cursor, setCursor]     = useState(0);
  const [pendingNode, setPending] = useState(null);
  const inputRef = useRef(null);

  const addNode           = useWorkspaceStore((s) => s.addNode);
  const addNodeSource     = useWorkspaceStore((s) => s.addNodeSource);
  const nodes             = useWorkspaceStore((s) => s.nodes);
  const edges             = useWorkspaceStore((s) => s.edges);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const onConnect         = useWorkspaceStore((s) => s.onConnect);
  const runEngine         = useWorkspaceStore((s) => s.runEngine);
  const saveEngine        = useWorkspaceStore((s) => s.saveEngine);

  // Open/close with Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) playPanelOpen();
          return !v;
        });
        setQuery("");
        setPending(null);
        setCursor(0);
      }
      if (e.key === "Escape") {
        if (pendingNode) { setPending(null); setQuery(""); }
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pendingNode]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const q = query.toLowerCase();

  // When viewing actions for a pending node, filter its actions
  const actionItems = pendingNode
    ? (NODE_ACTIONS[pendingNode.key] || []).filter((a) =>
        !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      ).map((a, i) => ({ type: "action", ...a, id: `action-${i}`, nodeDef: pendingNode }))
    : [];

  // Node search results
  const nodeItems = !pendingNode
    ? ALL_NODES.filter((n) =>
        !q ||
        n.label.toLowerCase().includes(q) ||
        n.key.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q)
      ).slice(0, 12).map((n) => ({ type: "node", ...n, id: n.key }))
    : [];

  const items = pendingNode ? actionItems : nodeItems;

  // Keyboard navigation
  useEffect(() => { setCursor(0); }, [query, pendingNode]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && items[cursor]) selectItem(items[cursor]);
    if (e.key === "Backspace" && !query && pendingNode) { setPending(null); }
  };

  const commitNode = useCallback((nodeDef, selectedAction = null) => {
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

    playNodeLand();
    setOpen(false);
    setPending(null);
    setQuery("");
    setSelectedNodeId(newId);
  }, [nodes, edges, addNodeSource, addNode, onConnect, setSelectedNodeId]);

  const selectItem = (item) => {
    if (item.type === "node") {
      const actions = NODE_ACTIONS[item.key];
      if (actions?.length > 0) {
        setPending(item);
        setQuery("");
      } else {
        commitNode(item);
      }
    } else if (item.type === "action") {
      commitNode(item.nodeDef, item.name);
    }
  };

  const catLabel = (catId) => CATEGORY_MAP[catId]?.label || catId;

  return (
    <>
      {/* Trigger hint in canvas (shown when no nodes) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            onClick={() => setOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

            {/* Palette */}
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: -12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[560px] mx-4 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden"
              style={{ maxHeight: "70vh" }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800/80">
                {pendingNode ? (
                  <>
                    <div className="flex items-center gap-2 shrink-0">
                      {pendingNode.logoUrl ? (
                        <img src={pendingNode.logoUrl} alt="" className="w-5 h-5 object-contain"
                          style={pendingNode.imgFilter ? { filter: pendingNode.imgFilter } : undefined} />
                      ) : (
                        <pendingNode.icon className={`w-5 h-5 ${pendingNode.colorClass}`} strokeWidth={1.6} />
                      )}
                      <span className="text-[13px] font-semibold text-zinc-300">{pendingNode.label}</span>
                      <span className="text-zinc-700">›</span>
                    </div>
                  </>
                ) : (
                  <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pendingNode ? "Filter actions…" : "Search nodes, actions…"}
                  className="flex-1 bg-transparent text-[14px] text-zinc-100 outline-none placeholder:text-zinc-600"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <kbd className="text-[10px] text-zinc-600 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-md font-mono">esc</kbd>
                </div>
              </div>

              {/* Results */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 60px)" }}>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search className="w-7 h-7 text-zinc-700 mb-2" />
                    <p className="text-[13px] text-zinc-600">No results for "{query}"</p>
                  </div>
                ) : pendingNode ? (
                  // Action list for a pending node
                  <div className="p-2">
                    {items.map((item, i) => (
                      <button
                        key={item.id}
                        onClick={() => selectItem(item)}
                        onMouseEnter={() => setCursor(i)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left ${
                          i === cursor ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800/60"
                        }`}
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-semibold block">{item.name}</span>
                          <span className="text-[11px] text-zinc-500 truncate block">{item.description}</span>
                        </div>
                        {i === cursor && <CornerDownLeft className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  // Node list
                  <div className="p-2">
                    {items.map((item, i) => {
                      const Icon = item.icon;
                      const hasActions = NODE_ACTIONS[item.key]?.length > 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => selectItem(item)}
                          onMouseEnter={() => setCursor(i)}
                          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left ${
                            i === cursor ? "bg-zinc-800" : "hover:bg-zinc-800/60"
                          }`}
                        >
                          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                            {item.logoUrl ? (
                              <img src={item.logoUrl} alt="" className="w-6 h-6 object-contain"
                                style={item.imgFilter ? { filter: item.imgFilter } : undefined} />
                            ) : (
                              <Icon className={`w-6 h-6 ${item.colorClass}`} strokeWidth={1.6} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-zinc-100 block">{item.label}</span>
                            {item.description && (
                              <span className="text-[11px] text-zinc-500 truncate block">{item.description}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                              {catLabel(item.category)}
                            </span>
                            {hasActions && <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />}
                            {!hasActions && i === cursor && <CornerDownLeft className="w-3.5 h-3.5 text-zinc-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-t border-zinc-800/60 bg-zinc-950">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                  <kbd className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-[9px] font-mono">↑↓</kbd>
                  navigate
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                  <kbd className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-[9px] font-mono">↵</kbd>
                  select
                </div>
                {pendingNode && (
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                    <kbd className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-[9px] font-mono">⌫</kbd>
                    back
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-700">
                  <Command className="w-3 h-3" />K to close
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
