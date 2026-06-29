import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowLeft, ChevronRight, CheckCircle2, Plus, Layers } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry, CATEGORIES } from "../nodeRegistry";
import { NODE_ACTIONS } from "../nodeActions";
import { playNodeLand } from "../../../lib/sounds";

const ACTION_CATEGORIES = CATEGORIES.filter((c) => c.id !== "trigger");

const ALL_NODES = Object.entries(NodeRegistry)
  .filter(([, def]) => def.category !== "trigger" && !def.agentOnly)
  .map(([key, def]) => ({ key, ...def }));

const CAT_DESC = {
  ai_models: "Chat models, code & assistants",
  ai_agent:  "Agents, memory, tools & integrations",
  apps:      "SaaS & platform actions",
  logic:     "Conditions, loops & flow control",
  data:      "Databases, transforms & variables",
  infra:     "Files, network & system ops",
};

const CAT_COLORS = {
  ai_models: { accent: "#a78bfa" },
  ai_agent:  { accent: "#e879f9" },
  apps:      { accent: "#38bdf8" },
  logic:     { accent: "#34d399" },
  data:      { accent: "#60a5fa" },
  infra:     { accent: "#7dd3fc" },
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
    if (actions?.length > 0) { setPending(nodeDef); setSearch(""); return; }
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
        if (catPage) { setCatPage(null); setSearch(""); return; }
        if (search) { setSearch(""); return; }
        close();
        return;
      }
      if (pendingNode || !visibleNodes) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, visibleNodes.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && visibleNodes[focusIdx]) handleNodeClick(visibleNodes[focusIdx]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, visibleNodes, focusIdx, pendingNode, catPage, search]); // eslint-disable-line

  const cat = catPage ? ACTION_CATEGORIES.find((c) => c.id === catPage) : null;
  const catColor = catPage ? CAT_COLORS[catPage] : null;
  const actions = pendingNode ? (NODE_ACTIONS[pendingNode.key] || []) : null;

  const headerTitle = pendingNode
    ? pendingNode.label
    : cat
    ? cat.label
    : "What should this step do?";
  const headerSub = pendingNode
    ? "Pick the action to run"
    : cat
    ? (CAT_DESC[cat.id] || `${visibleNodes?.length ?? 0} nodes`)
    : "An action is a step that does something in your workflow";

  const goBack = () => {
    if (pendingNode) { setPending(null); return; }
    setCatPage(null); setSearch("");
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={close} />
      <div
        className="bb-liquid bb-edge-left fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{ width: "clamp(360px, 32vw, 480px)" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-start gap-3">
            {(catPage || pendingNode) && (
              <button onClick={goBack}
                className="flex items-center justify-center w-7 h-7 -ml-1 rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0">
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-semibold text-white leading-tight truncate">{headerTitle}</h2>
              <p className="text-[12px] text-neutral-500 mt-1 leading-snug">{headerSub}</p>
            </div>
            <button onClick={close}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search bar (hidden on the action drill-down) */}
        {!pendingNode && (
          <div className="px-5 pb-3 shrink-0">
            <div className="bb-input bb-glow-border flex items-center gap-2.5 px-3.5 h-11 rounded-xl focus-within:border-white/[0.22] transition-all">
              <Search size={15} className="text-neutral-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); if (catPage) setCatPage(null); }}
                placeholder={cat ? `Search in ${cat.label}…` : "Search actions…"}
                className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-neutral-600 font-medium"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-neutral-600 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-0.5" style={{ scrollbarWidth: "thin", scrollbarColor: "#222 transparent" }}>
          {pendingNode ? (
            actions.map((action, i) => (
              <ActionRow key={i} action={action} subject={pendingNode}
                onSelect={() => commitOne(pendingNode, action.name)} />
            ))
          ) : query ? (
            visibleNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search size={24} className="text-neutral-700" />
                <p className="text-[12px] text-neutral-600">No actions match "{search}"</p>
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
              return (
                <button key={c.id} onClick={() => setCatPage(c.id)}
                  className="bb-nav-item flex items-center gap-3.5 w-full px-3.5 py-3.5 transition-colors text-left group rounded-xl">
                  <span className="w-7 h-7 shrink-0 flex items-center justify-center">
                    <CatIcon size={24} strokeWidth={1.7} className="text-neutral-300 group-hover:text-white transition-colors" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-white leading-tight">{c.label}</div>
                    <div className="text-[12px] text-neutral-500 mt-0.5 truncate">{CAT_DESC[c.id] || ""} · {count}</div>
                  </div>
                  <ChevronRight size={16} className="text-neutral-600 shrink-0 group-hover:text-neutral-300 transition-colors" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {selected.size > 0 ? (
          <div className="shrink-0 px-5 py-3.5 border-t border-white/[0.06] flex items-center gap-3">
            <button onClick={() => setSelected(new Set())}
              className="p-1.5 text-neutral-600 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors shrink-0">
              <X size={13} />
            </button>
            <span className="text-[12px] text-neutral-500 flex-1">{selected.size} selected</span>
            <button onClick={commitAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black text-[12px] font-bold hover:bg-neutral-200 transition-colors">
              <Plus size={13} /> Add {selected.size}
            </button>
          </div>
        ) : (
          <div className="shrink-0 px-5 py-3.5 border-t border-white/[0.06] flex items-center gap-2">
            <Layers size={12} className="text-neutral-600" />
            <span className="text-[12px] text-neutral-600">{ALL_NODES.length} actions</span>
            <span className="text-[11px] text-neutral-700 ml-auto">ESC {catPage || pendingNode ? "back" : "close"}</span>
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
  return (
    <button
      ref={rowRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`bb-nav-item rounded-xl flex items-center gap-3.5 w-full px-3.5 py-3.5 transition-colors text-left group ${
        selected ? "bg-white/[0.07]" : focused ? "bg-white/[0.05]" : ""
      }`}
    >
      <span className="w-7 h-7 shrink-0 flex items-center justify-center">
        {nodeDef.logoUrl ? (
          <img src={nodeDef.logoUrl} alt={nodeDef.label} className="w-[26px] h-[26px] object-contain"
            style={nodeDef.imgFilter ? { filter: nodeDef.imgFilter } : undefined} />
        ) : (
          <Icon size={24} strokeWidth={1.7} className="text-neutral-300 group-hover:text-white transition-colors" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-white leading-tight">{nodeDef.label}</div>
        {nodeDef.description && (
          <div className="text-[12px] text-neutral-500 mt-0.5 truncate">{nodeDef.description}</div>
        )}
      </div>
      {selected ? (
        <CheckCircle2 size={16} className="text-white shrink-0" />
      ) : hasActions ? (
        <ChevronRight size={16} className="text-neutral-700 shrink-0 group-hover:text-neutral-400 transition-colors" />
      ) : (
        <ChevronRight size={16} className="text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100 group-hover:text-neutral-400 transition-all" />
      )}
    </button>
  );
}

function ActionRow({ action, subject, onSelect }) {
  const Icon = subject?.icon;
  return (
    <button
      onClick={onSelect}
      className="bb-nav-item rounded-xl flex items-center gap-3.5 w-full px-3.5 py-3 transition-colors text-left group"
    >
      <span className="w-7 h-7 shrink-0 flex items-center justify-center">
        {subject?.logoUrl ? (
          <img src={subject.logoUrl} alt={subject.label} className="w-[24px] h-[24px] object-contain"
            style={subject.imgFilter ? { filter: subject.imgFilter } : undefined} />
        ) : (
          Icon && <Icon size={22} strokeWidth={1.7} className="text-neutral-300" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-white leading-tight">{action.name}</div>
        {action.description && (
          <div className="text-[11.5px] text-neutral-500 mt-0.5 truncate">{action.description}</div>
        )}
      </div>
      <ChevronRight size={16} className="text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100 group-hover:text-neutral-400 transition-all" />
    </button>
  );
}
