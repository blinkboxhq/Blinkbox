import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Plus } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import { playNodeLand } from "../../../lib/sounds";

const TRIGGERS = Object.entries(TRIGGER_VARIANTS).map(([key, v]) => ({ id: key, ...v }));

export default function TriggerPicker() {
  const [search, setSearch] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef(null);

  const addNode               = useWorkspaceStore((s) => s.addNode);
  const nodes                 = useWorkspaceStore((s) => s.nodes);
  const setTriggerPickerOpen  = useWorkspaceStore((s) => s.setTriggerPickerOpen);
  const setSelectedNodeId     = useWorkspaceStore((s) => s.setSelectedNodeId);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const close = useCallback(() => setTriggerPickerOpen(false), [setTriggerPickerOpen]);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? TRIGGERS.filter((t) => t.label.toLowerCase().includes(query) || (t.backendType || "").includes(query))
    : TRIGGERS;

  useEffect(() => { setFocusIdx(0); }, [search]);

  const commit = useCallback((trigger) => {
    const existingTriggers = nodes.filter((n) => n.data?.type === "trigger");
    const position = existingTriggers.length > 0
      ? { x: existingTriggers[existingTriggers.length - 1].position.x, y: existingTriggers[existingTriggers.length - 1].position.y + 220 }
      : { x: 400, y: 300 };
    const newId = `${trigger.id}-${crypto.randomUUID()}`;
    addNode({
      id: newId,
      type: "custom",
      position,
      data: {
        backendType: trigger.backendType,
        label: trigger.label,
        type: "trigger",
        config: { triggerVariant: trigger.id },
      },
    });
    playNodeLand();
    close();
    setSelectedNodeId(newId);
  }, [addNode, nodes, close, setSelectedNodeId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && filtered[focusIdx]) { commit(filtered[focusIdx]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, filtered, focusIdx, commit]);

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
          <div className="flex-1 flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 focus-within:border-white/20 transition-colors">
            <Search size={14} className="text-white/40 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search triggers..."
              className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
            />
          </div>
          <button
            onClick={close}
            className="p-2 text-white/40 hover:text-white hover:bg-white/[0.07] rounded-xl transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Search size={26} className="text-white/20" />
              <p className="text-[12px] text-white/35">No triggers match "{search}"</p>
            </div>
          ) : (
            filtered.map((t, i) => (
              <TriggerRow
                key={t.id}
                trigger={t}
                focused={i === focusIdx}
                onHover={() => setFocusIdx(i)}
                onSelect={() => commit(t)}
              />
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="shrink-0 px-4 py-2.5 border-t border-white/[0.06] flex items-center gap-3">
          <span className="text-[10px] text-white/25">↑↓ navigate</span>
          <span className="text-[10px] text-white/25">↵ select</span>
          <span className="text-[10px] text-white/25">ESC close</span>
          <span className="text-[10px] text-white/20 ml-auto">{filtered.length} trigger{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

function TriggerRow({ trigger, focused, onHover, onSelect }) {
  const rowRef = useRef(null);
  useEffect(() => {
    if (focused) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  const Icon = trigger.icon;
  return (
    <button
      ref={rowRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-100 text-left group ${
        focused ? "bg-white/[0.07]" : "hover:bg-white/[0.05]"
      }`}
    >
      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
        {trigger.logoUrl ? (
          <img
            src={trigger.logoUrl}
            alt={trigger.label}
            className="w-6 h-6 object-contain"
            style={trigger.imgFilter ? { filter: trigger.imgFilter } : undefined}
          />
        ) : (
          <Icon size={18} strokeWidth={1.8} className="text-white/70" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white leading-tight">{trigger.label}</div>
        {trigger.description && (
          <div className="text-[11px] text-white/40 mt-0.5 truncate">{trigger.description}</div>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-white hover:bg-white/[0.1] rounded-lg transition-all shrink-0">
        <Plus size={12} />
      </div>
    </button>
  );
}
