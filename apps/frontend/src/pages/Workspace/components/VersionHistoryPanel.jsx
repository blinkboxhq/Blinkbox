import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, RotateCcw, Clock, ChevronRight, Loader2 } from "lucide-react";
import api from "../../../lib/api";
import useWorkspaceStore from "../../../store/workspaceStore";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function VersionHistoryPanel({ automationId, isOpen, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const setGraph = useWorkspaceStore((s) => s.setGraph);

  useEffect(() => {
    if (!isOpen || !automationId) return;
    setLoading(true);
    api.get(`/api/automation/${automationId}/versions`)
      .then((res) => setVersions(res.data.versions ?? []))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [isOpen, automationId]);

  const handleRestore = async (versionId) => {
    setRestoring(versionId);
    try {
      const res = await api.post(`/api/automation/${automationId}/versions/${versionId}/restore`);
      if (res.data.automation) {
        const { nodes, edges } = res.data.automation;
        setGraph(nodes ?? [], edges ?? []);
      }
      onClose();
    } catch {
      /* silently fail */
    } finally {
      setRestoring(null);
      setConfirmId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="version-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
            onClick={onClose}
          />
          <motion.aside
            key="version-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-[340px] z-50 flex flex-col bg-zinc-950 border-l border-zinc-800 shadow-[-20px_0_60px_rgba(0,0,0,0.7)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-bold text-zinc-100">Version History</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-3 px-3">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-zinc-600 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-600 text-xs">
                  <Clock className="w-6 h-6 opacity-30" />
                  <p>No versions yet.</p>
                  <p className="text-[10px] text-zinc-700">Versions are saved automatically each time you save.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {versions.map((v) => (
                    <div
                      key={v._id}
                      className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-zinc-500 tabular-nums">v{v.version}</span>
                            {v.description && (
                              <span className="text-[10px] text-zinc-600 truncate">· {v.description}</span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-zinc-300 mt-0.5 truncate">{v.name || "Untitled"}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{formatDate(v.createdAt)}</p>
                        </div>
                        <div className="shrink-0">
                          {confirmId === v._id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleRestore(v._id)}
                                disabled={!!restoring}
                                className="text-[10px] font-semibold text-white bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded transition-colors disabled:opacity-50"
                              >
                                {restoring === v._id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmId(v._id)}
                              className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800/80">
              <p className="text-[10px] text-zinc-700">Versions are auto-saved on each save. Up to 50 kept.</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
