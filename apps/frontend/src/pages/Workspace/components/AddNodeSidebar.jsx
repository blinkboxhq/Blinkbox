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

const CAT_COLORS = {
  ai:   { accent: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
  apps: { accent: "#38bdf8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.2)"  },
  flow: { accent: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
};

export default function AddNodeSidebar() {
  const [search, setSearch]       = useState("");
  const [catPage, setCatPage]     = useState(null);
  const [pendingNode, setPending] = useState(null);
  const [selected, setSelected]   = useState(new Set());
  const [focusIdx, setFocusIdx]   = useState(0);
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
    const pos   = basePosition();
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

  const cat = catPage ? ACTION_CATEGORIES.find((c) => c.id === catPage) : null;
  const catColor = catPage ? CAT_COLORS[catPage] : null;

  // ── Action picker phase ────────────────────────────────────────────────────
  if (pendingNode) {
    const actions = NODE_ACTIONS[pendingNode.key] || [];
    const Icon = pendingNode.icon;
    const nodeColor = CAT_COLORS[pendingNode.category];
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={() => setPending(null)} />
        <div className="fixed top-0 right-0 h-full z-50 flex flex-col bg-[#0e0e10] border-l border-white/[0.07] shadow-2xl"
          style={{ width: "clamp(300px, 28vw, 420px)" }}>
          {/* Search bar flush at top */}
          <div className="flex items-center gap-0 border-b border-white/[0.07] shrink-0">
            <button onClick={() => setPending(null)}
              className="flex items-center justify-center w-12 h-14 text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 flex items-center gap-3 h-14 px-3">
              {pendingNode.logoUrl ? (
                <img src={pendingNode.logoUrl} alt={pendingNode.label} className="w-6 h-6 object-contain shrink-0"
                  style={pendingNode.imgFilter ? { filter: pendingNode.imgFilter } : undefined} />
              ) : (
                <Icon size={22} strokeWidth={1.8} className="shrink-0" style={{ color: nodeColor?.accent || "rgba(255,255,255,0.7)" }} />
              )}
              <span className="text-[15px] font-semibold text-white truncate flex-1">{pendingNode.label}</span>
            </div>
            <button onClick={close}
              className="flex items-center justify-center w-12 h-14 text-white/30 hover:text-white hover:bg-white/[0.05] transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
          <div className="px-3 py-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">{actions.length} actions</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
            {actions.map((action, i) => (
              <button key={i} onClick={() => commitOne(pendingNode, action.name)}
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-white/[0.05] transition-colors text-left group border-b border-white/[0.04] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-white leading-tight">{action.name}</div>
                  {action.description && <div className="text-[12px] text-white/40 mt-0.5">{action.description}</div>}
                </div>
                <ChevronRight size={15} className="text-white/20 shrink-0 group-hover:text-white/60 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* backdrop — click outside to close */}
      <div className="fixed inset-0 z-40" onClick={close} />

      {/* Sidebar panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-[#0e0e10] border-l border-white/[0.07] shadow-2xl"
        style={{ width: "clamp(300px, 28vw, 420px)" }}
      >
        {/* Search bar — flush at top, full width, zero margin */}
        <div className="flex items-center gap-0 border-b border-white/[0.07] shrink-0">
          {catPage && (
            <button
              onClick={() => { setCatPage(null); setSearch(""); }}
              className="flex items-center justify-center w-12 h-14 text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex-1 flex items-center gap-3 h-14 px-4">
            <Search size={16} className="text-white/30 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (catPage) setCatPage(null); }}
              placeholder={catPage ? `Search in ${cat?.label || catPage}…` : "Search nodes…"}
              className="flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/25 font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/25 hover:text-white transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={close}
            className="flex items-center justify-center w-12 h-14 text-white/30 hover:text-white hover:bg-white/[0.05] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Category accent bar */}
        {catPage && cat && catColor && !query && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] shrink-0"
            style={{ background: catColor.bg }}>
            <cat.icon size={16} style={{ color: catColor.accent }} />
            <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: catColor.accent }}>
              {cat.label}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
          {query ? (
            visibleNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search size={28} className="text-white/15" />
                <p className="text-[13px] text-white/30">No nodes match "{search}"</p>
              </div>
            ) : (
              visibleNodes.map((n, i) => (
                <NodeRow key={n.key} nodeDef={n} focused={i === focusIdx}
                  onHover={() => setFocusIdx(i)} onSelect={() => handleNodeClick(n)}
                  selected={selected.has(n.key)} hasActions={NODE_ACTIONS[n.key]?.length > 0} />
              ))
            )
          ) : catPage ? (
            visibleNodes.map((n, i) => (
              <NodeRow key={n.key} nodeDef={n} focused={i === focusIdx}
                onHover={() => setFocusIdx(i)} onSelect={() => handleNodeClick(n)}
                selected={selected.has(n.key)} hasActions={NODE_ACTIONS[n.key]?.length > 0} />
            ))
          ) : (
            ACTION_CATEGORIES.map((c) => {
              const count = ALL_NODES.filter((n) => n.category === c.id).length;
              if (count === 0) return null;
              const CatIcon = c.icon;
              const cc = CAT_COLORS[c.id];
              return (
                <button key={c.id} onClick={() => setCatPage(c.id)}
                  className="flex items-center gap-4 w-full px-4 py-4 transition-colors text-left group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04]">
                  <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                    style={{ background: cc?.bg, border: `1px solid ${cc?.border}` }}>
                    <CatIcon size={20} strokeWidth={1.8} style={{ color: cc?.accent || "rgba(255,255,255,0.6)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-white leading-tight">{c.label}</div>
                    <div className="text-[12px] text-white/30 mt-0.5">{count} nodes</div>
                  </div>
                  <ChevronRight size={15} className="text-white/20 shrink-0 group-hover:text-white/60 transition-colors" />
                </button>
              );
            })
          )}
        </div>

        {/* Selection footer */}
        {selected.size > 0 && (
          <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] flex items-center gap-3">
            <button onClick={() => setSelected(new Set())}
              className="p-2 text-white/35 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors shrink-0">
              <X size={14} />
            </button>
            <span className="text-[13px] text-white/40 flex-1">{selected.size} selected</span>
            <button onClick={commitAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-[13px] font-bold hover:bg-white/90 transition-colors">
              <Plus size={14} /> Add {selected.size}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function NodeRow({ nodeDef, focused, onHover, onSelect, selected, hasActions }) {
  const rowRef = useRef(null);
  useEffect(() => { if (focused) rowRef.current?.scrollIntoView({ block: "nearest" }); }, [focused]);

  const Icon = nodeDef.icon;
  const cc   = CAT_COLORS[nodeDef.category];

  return (
    <button
      ref={rowRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex items-center gap-4 w-full px-4 py-3.5 transition-all duration-100 text-left group border-b border-white/[0.04] last:border-0 ${
        selected ? "bg-white/[0.08]" : focused ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
      }`}
    >
      <div className="w-9 h-9 shrink-0 flex items-center justify-center">
        {nodeDef.logoUrl ? (
          <img src={nodeDef.logoUrl} alt={nodeDef.label} className="w-7 h-7 object-contain"
            style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />
        ) : (
          <Icon size={22} strokeWidth={1.8} style={{ color: cc?.accent || "rgba(255,255,255,0.6)" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white leading-tight">{nodeDef.label}</div>
        {nodeDef.description && (
          <div className="text-[12px] text-white/35 mt-0.5 truncate">{nodeDef.description}</div>
        )}
      </div>
      {selected ? (
        <CheckCircle2 size={16} className="text-white shrink-0" />
      ) : hasActions ? (
        <ChevronRight size={15} className="text-white/20 shrink-0 group-hover:text-white/60 transition-colors" />
      ) : null}
    </button>
  );
}
