import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  {
    group: "Workflow",
    items: [
      { keys: ["⌘", "S"], label: "Save workflow" },
      { keys: ["⌘", "↵"], label: "Run test" },
      { keys: ["?"], label: "Toggle shortcuts panel" },
    ],
  },
  {
    group: "Canvas",
    items: [
      { keys: ["⌘", "Z"], label: "Undo" },
      { keys: ["⌘", "⇧", "Z"], label: "Redo" },
      { keys: ["⌘", "D"], label: "Duplicate selected node" },
      { keys: ["Del"], label: "Delete selected nodes" },
      { keys: ["L"], label: "Auto-layout" },
    ],
  },
  {
    group: "Selection",
    items: [
      { keys: ["Click"], label: "Select node" },
      { keys: ["Shift", "Click"], label: "Add to selection" },
      { keys: ["Drag"], label: "Pan canvas" },
    ],
  },
];

export default function KeyboardShortcutsPanel({ isOpen, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="shortcuts-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.15 }}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <Keyboard className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-bold text-zinc-100">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcuts */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {SHORTCUTS.map((section) => (
                <div key={section.group}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2.5">
                    {section.group}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between py-1.5"
                      >
                        <span className="text-xs text-zinc-400">{item.label}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-zinc-800 border border-zinc-700/50 text-[10px] font-mono font-semibold text-zinc-400"
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800/80">
              <p className="text-[10px] text-zinc-700">Press <kbd className="font-mono text-zinc-600">?</kbd> anywhere in the workspace to toggle this panel.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
