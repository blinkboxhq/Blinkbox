import { useEffect, useRef } from "react";
import { Settings2, Copy, Trash2, Play, StickyNote, GitFork, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function NodeContextMenu({ x, y, nodeId, nodeLabel, onClose, onConfigure, onDuplicate, onDelete, onTest, onAddNote }) {
  const ref = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Keep menu inside viewport
  const menuW = 200, menuH = 260;
  const vw = window.innerWidth, vh = window.innerHeight;
  const left = x + menuW > vw ? x - menuW : x;
  const top  = y + menuH > vh ? y - menuH : y;

  const items = [
    { icon: Settings2,    label: "Configure",    action: onConfigure, accent: "" },
    { icon: Play,         label: "Test Node",    action: onTest,      accent: "text-emerald-400" },
    null, // separator
    { icon: Copy,         label: "Duplicate",    action: onDuplicate, accent: "" },
    { icon: StickyNote,   label: "Add Note",     action: onAddNote,   accent: "text-amber-400" },
    null,
    { icon: Trash2,       label: "Delete",       action: onDelete,    accent: "text-red-400", danger: true },
  ];

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.1 }}
        className="fixed z-[200] select-none"
        style={{ left, top }}
      >
        <div className="w-[200px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black/70 overflow-hidden py-1">
          {/* Node label header */}
          <div className="px-3 py-2 border-b border-zinc-800/60 mb-1">
            <p className="text-[11px] font-bold text-zinc-300 truncate">{nodeLabel || "Node"}</p>
            <p className="text-[9px] text-zinc-600 font-mono truncate">{nodeId}</p>
          </div>

          {items.map((item, i) => {
            if (item === null) return <div key={i} className="h-px bg-zinc-800/60 my-1 mx-2" />;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => { item.action?.(); onClose(); }}
                className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors
                  ${item.danger
                    ? "hover:bg-red-500/10 text-zinc-400 hover:text-red-400"
                    : "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100"
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${item.accent || ""}`} strokeWidth={2} />
                <span className={`text-[12px] font-medium ${item.accent || ""}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
