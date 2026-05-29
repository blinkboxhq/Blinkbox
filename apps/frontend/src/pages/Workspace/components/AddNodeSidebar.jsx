import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowLeft, ChevronRight, CheckCircle2, Plus } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry, CATEGORIES } from "../nodeRegistry";
import { NODE_ACTIONS } from "../nodeActions";
import { playNodeLand } from "../../../lib/sounds";

const ACTION_CATEGORIES = CATEGORIES.filter((c) => c.id !== "trigger");

const ALL_NODES = Object.entries(NodeRegistry)
  .filter(([, def]) => def.category !== "trigger" && !def.agentOnly)
  .map(([key, def]) => ({ key, ...def }));

export default function AddNodeSidebar() {
  const [search, setSearch]     = useState("");
  const [catPage, setCatPage]   = useState(null); // null = home, string = category id
  const [pendingNode, setPending] = useState(null); // node awaiting action pick
  const [selected, setSelected] = useState(new Set());
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef(null);

  const addNode           = useWorkspaceStore((s) => s.addNode);
  const addNodeSource     = useWorkspaceStore((s) => s.addNodeSource);
  const nodes             = useWorkspaceStore((s) => s.nodes);
  const edges             = useWorkspaceStore((s) => s.edges);
  const clearAddNodeModal = useWorkspaceStore((s) => s.clearAddNodeModal);
  const onConnect         = useWorkspaceStore((s) => s.onConnect);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  useEffect(() => { inputRef.current?.focus(); }, [catPage, pendingNode]);

  const close = useCallback(() => {
    clearAddNodeModal();
    setSearch("");
    setCatPage(null);
    setPending(null);
    setSelected(new Set());
  }, [clearAddNodeModal]);

  const basePosition = useCallback(() => {
    const src = nodes.find((n) => n.id === addNodeSource);
    if (src) return { x: src.position.x + 300, y: src.position.y };
    if (nodes.length > 0) return { x: nodes[nodes.length - 1].position.x + 300, y: nodes[nodes.length - 1].position.y };
    return { x: 400, y: 300 };
  }, [nodes, addNodeSource]);

  const commitOne = useCallback((nodeDef, selectedAction = null) => {
    const pos  = basePosition();
    const newId = `${nodeDef.key}-${crypto.randomUUID()}`;
    addNode({ id: newId, type: "custom", position: pos, data: { backendType: nodeDef.key, label: selectedAction || nodeDef.label, type: "action", config: selectedAction ? { selectedAction } : {} } });
    if (addNodeSource && addNodeSource !== "__edge__") {
      const already = edges.some((e) => e.source === addNodeSource && e.sourceHandle === "output");
      if (!already) onConnect({ source: addNodeSource, target: newId, sourceHandle: "output", targetHandle: null });
    }
    playNodeLand();
    close();
    setSelectedNodeId(newId);
  }, [addNode, addNodeSource, edges, onConnect, basePosition, close, setSelectedNodeId]);

  const commitAll = useCallback(() => {
    if (selected.size === 0) return;
    const base = basePosition();
    let lastId = null;
    let i = 0;
    for (const key of selected) {
      const def = NodeRegistry[key];
      if (!def) continue;
      const newId = `${key}-${crypto.randomUUID()}`;
      addNode({ id: newId, type: "custom", position: { x: base.x + i * 320, y: base.y }, data: { backendType: key, label: def.label, type: "action", config: {} } });
      if (i === 0 && addNodeSource && addNodeSource !== "__edge__") {
        const already = edges.some((e) => e.source === addNodeSource && e.sourceHandle === "output");
        if (!already) onConnect({ source: addNodeSource, target: newId, sourceHandle: "output", targetHandle: null });
      }
      lastId = newId;
      i++;
    }
    playNodeLand();
    close();
    if (lastId) setSelectedNodeId(lastId);
  }, [selected, addNode, addNodeSource, edges, onConnect, basePosition, close, setSelectedNodeId]);

  const toggleSelect = (nodeDef) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(nodeDef.key) ? next.delete(nodeDef.key) : next.add(nodeDef.key);
      return next;
    });
  };

  const handleNodeClick = (nodeDef) => {
    const actions = NODE_ACTIONS[nodeDef.key];
    if (actions?.length > 0) { setPending(nodeDef); return; }
    if (selected.size > 0) { toggleSelect(nodeDef); return; }
    commitOne(nodeDef);
  };

  const query = search.trim().toLowerCase();

  // Derive visible nodes
  const visibleNodes = query
    ? ALL_NODES.filter((n) => n.label.toLowerCase().includes(query) || n.key.toLowerCase().includes(query))
    : catPage
    ? ALL_NODES.filter((n) => n.category === catPage)
    : null;

  useEffect(() => { setFocusIdx(0); }, [search, catPage]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (pendingNode) { setPending(null); return; }
        if (catPage) { setCatPage(null); return; }
        if (search) { setSearch(""); return; }
        close();
        return;
      }
      if (!visibleNodes) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, visibleNodes.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && visibleNodes[focusIdx]) handleNodeClick(visibleNodes[focusIdx]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, visibleNodes, focusIdx, pendingNode, catPage, search]); // eslint-disable-line

  // ── Action picker phase ────────────────────────────────────────────────────
  if (pendingNode) {
    const actions = NODE_ACTIONS[pendingNode.key] || [];
    const Icon = pendingNode.icon;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setPending(null)}
      >
        <div
          className="w-full max-w-[460px] mx-4 bg-[#111113] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "68vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-white/[0.06]">
            <button
              onClick={() => setPending(null)}
              className="p-2 text-white/40 hover:text-white hover:bg-white/[0.07] rounded-xl transition-colors shrink-0"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="w-7 h-7 shrink-0 flex items-center justify-center">
              {pendingNode.logoUrl ? (
                <img src={pendingNode.logoUrl} alt={pendingNode.label} className="w-6 h-6 object-contain"
                  style={pendingNode.imgFilter ? { filter: pendingNode.imgFilter } : undefined} />
              ) : (
                <Icon size={18} strokeWidth={1.8} className="text-white/80" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">{pendingNode.label}</div>
              <div className="text-[10px] text-white/35">{actions.length} actions</div>
            </div>
            <button onClick={close} className="p-2 text-white/30 hover:text-white hover:bg-white/[0.07] rounded-xl transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => commitOne(pendingNode, action.name)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white leading-tight">{action.name}</div>
                  {action.description && <div className="text-[11px] text-white/40 mt-0.5 truncate">{action.description}</div>}
                </div>
                <ChevronRight size={13} className="text-white/25 shrink-0 group-hover:text-white/50 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const cat = catPage ? ACTION_CATEGORIES.find((c) => c.id === catPage) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-[460px] mx-4 bg-[#111113] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "68vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
          {catPage && (
            <button
              onClick={() => { setCatPage(null); setSearch(""); }}
              className="p-2 text-white/40 hover:text-white hover:bg-white/[0.07] rounded-xl transition-colors shrink-0"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <div className="flex-1 flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 focus-within:border-white/20 transition-colors">
            <Search size={14} className="text-white/40 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (catPage) setCatPage(null); }}
              placeholder={catPage ? `Search in ${cat?.label || catPage}…` : "Search nodes…"}
              className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/70 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={close}
            className="p-2 text-white/40 hover:text-white hover:bg-white/[0.07] rounded-xl transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Title when in category */}
        {catPage && cat && !query && (
          <div className="px-4 pb-2 shrink-0">
            <div className="text-[11px] text-white/35 uppercase tracking-wider font-semibold">{cat.label}</div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
          {/* Search results */}
          {query ? (
            visibleNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Search size={26} className="text-white/20" />
                <p className="text-[12px] text-white/35">No nodes match "{search}"</p>
              </div>
            ) : (
              visibleNodes.map((n, i) => (
                <NodeRow
                  key={n.key}
                  nodeDef={n}
                  focused={i === focusIdx}
                  onHover={() => setFocusIdx(i)}
                  onSelect={() => handleNodeClick(n)}
                  selected={selected.has(n.key)}
                  hasActions={NODE_ACTIONS[n.key]?.length > 0}
                />
              ))
            )
          ) : catPage ? (
            /* Category node list */
            visibleNodes.map((n, i) => (
              <NodeRow
                key={n.key}
                nodeDef={n}
                focused={i === focusIdx}
                onHover={() => setFocusIdx(i)}
                onSelect={() => handleNodeClick(n)}
                selected={selected.has(n.key)}
                hasActions={NODE_ACTIONS[n.key]?.length > 0}
              />
            ))
          ) : (
            /* Category home list */
            ACTION_CATEGORIES.map((c) => {
              const count = ALL_NODES.filter((n) => n.category === c.id).length;
              if (count === 0) return null;
              const CatIcon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => setCatPage(c.id)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors text-left group"
                >
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    <CatIcon size={18} strokeWidth={1.8} className="text-white/60 group-hover:text-white/90 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white leading-tight">{c.label}</div>
                    <div className="text-[11px] text-white/35 mt-0.5">{count} node{count !== 1 ? "s" : ""}</div>
                  </div>
                  <ChevronRight size={13} className="text-white/25 shrink-0 group-hover:text-white/50 transition-colors" />
                </button>
              );
            })
          )}
        </div>

        {/* Selection footer */}
        {selected.size > 0 && (
          <div className="shrink-0 px-3 py-2.5 border-t border-white/[0.06] flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="p-1.5 text-white/35 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors shrink-0">
              <X size={13} />
            </button>
            <span className="text-[12px] text-white/45 flex-1">{selected.size} selected</span>
            <button
              onClick={commitAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black text-[12px] font-bold transition-colors hover:bg-white/90"
            >
              <Plus size={13} />
              Add {selected.size}
            </button>
          </div>
        )}

        {/* Footer hint */}
        <div className="shrink-0 px-4 py-2.5 border-t border-white/[0.06] flex items-center gap-3">
          <span className="text-[10px] text-white/25">↑↓ navigate</span>
          <span className="text-[10px] text-white/25">↵ select</span>
          <span className="text-[10px] text-white/25">ESC {catPage ? "back" : "close"}</span>
        </div>
      </div>
    </div>
  );
}

function NodeRow({ nodeDef, focused, onHover, onSelect, selected, hasActions }) {
  const rowRef = useRef(null);
  useEffect(() => {
    if (focused) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const Icon = nodeDef.icon;
  return (
    <button
      ref={rowRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-100 text-left group ${
        selected ? "bg-white/[0.09]" : focused ? "bg-white/[0.07]" : "hover:bg-white/[0.05]"
      }`}
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
          <Icon size={18} strokeWidth={1.8} className="text-white/70" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white leading-tight">{nodeDef.label}</div>
        {nodeDef.description && (
          <div className="text-[11px] text-white/40 mt-0.5 truncate">{nodeDef.description}</div>
        )}
      </div>
      {selected ? (
        <CheckCircle2 size={14} className="text-white shrink-0" />
      ) : hasActions ? (
        <ChevronRight size={13} className="text-white/25 shrink-0 group-hover:text-white/50 transition-colors" />
      ) : null}
    </button>
  );
}
