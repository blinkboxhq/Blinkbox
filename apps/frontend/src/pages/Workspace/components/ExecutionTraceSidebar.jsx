import { AnimatePresence, motion } from "framer-motion";
import { X, Activity, CheckCircle2, AlertTriangle, RefreshCw, Square, Loader2 } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import TraceTimeline from "./TraceTimeline";

export default function ExecutionTraceSidebar() {
  const isOpen             = useWorkspaceStore((s) => s.isTraceSidebarOpen);
  const nodes              = useWorkspaceStore((s) => s.nodes);
  const isRunning          = useWorkspaceStore((s) => s.isRunning);
  const isExecutionLive    = useWorkspaceStore((s) => s.isExecutionLive);
  const liveExecutionState = useWorkspaceStore((s) => s.liveExecutionState);
  const executionLogs      = useWorkspaceStore((s) => s.executionLogs);
  const closeTraceSidebar  = useWorkspaceStore((s) => s.closeTraceSidebar);
  const closeLiveExecution = useWorkspaceStore((s) => s.closeLiveExecution);
  const retryExecution     = useWorkspaceStore((s) => s.retryExecution);
  const cancelExecution    = useWorkspaceStore((s) => s.cancelExecution);

  const overallStatus  = liveExecutionState?.status || (isRunning ? "running" : "idle");
  const failedCursors  = liveExecutionState?.cursors?.filter((c) => c.status === "failed") || [];
  const completedCount = liveExecutionState?.cursors?.filter((c) => c.status === "completed").length ?? 0;
  const totalCount     = liveExecutionState?.cursors?.length ?? 0;
  const isFailed       = overallStatus === "failed";
  const isSuccess      = overallStatus === "executed";
  const isActive       = overallStatus === "running" || isRunning;
  const durationMs     = liveExecutionState?.durationMs;
  const startedAt      = liveExecutionState?.startedAt;

  const handleClose = () => {
    closeTraceSidebar();
    if (!isRunning) closeLiveExecution();
  };

  // accent bar color
  const accentColor = isFailed ? "#ef4444" : isSuccess ? "#16a34a" : "#3b82f6";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.9 }}
          className="fixed top-0 right-0 h-full w-[400px] z-30 flex flex-col"
          style={{ background: "#161618", borderLeft: "1px solid #2a2a2a", boxShadow: "-20px 0 60px rgba(0,0,0,0.8)" }}
        >
          {/* Accent bar */}
          <div style={{ height: 3, background: accentColor, opacity: isActive ? 1 : 0.6, flexShrink: 0 }}
            className={isActive ? "animate-pulse" : ""} />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: "1px solid #2a2a2a" }}>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 flex items-center justify-center"
                style={{ background: "#1c1c1e", border: "1px solid #333", borderRadius: 6 }}>
                {isActive
                  ? <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  : isFailed
                  ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  : isSuccess
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  : <Activity className="w-3.5 h-3.5 text-neutral-500" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-white">Execution Trace</span>
                  <StatusBadge status={overallStatus} isRunning={isActive} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {totalCount > 0 && (
                    <span className="text-[10px] font-mono" style={{ color: "#555" }}>
                      {completedCount}/{totalCount} nodes
                    </span>
                  )}
                  {durationMs != null && (
                    <span className="text-[10px] font-mono" style={{ color: "#555" }}>
                      · {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(2)}s`}
                    </span>
                  )}
                  {startedAt && !durationMs && (
                    <span className="text-[10px] font-mono" style={{ color: "#555" }}>
                      · {new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center transition-colors text-neutral-600 hover:text-white"
              style={{ background: "#1c1c1e", border: "1px solid #2a2a2a", borderRadius: 6 }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Error banner */}
          {isFailed && failedCursors.length > 0 && (
            <div className="mx-4 mt-4 shrink-0"
              style={{ background: "#1a0d0d", border: "1px solid #4a1a1a", borderRadius: 6, overflow: "hidden" }}>
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "#ef4444" }}>
                  <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white leading-tight">
                    {failedCursors.length === 1 ? "1 node failed" : `${failedCursors.length} nodes failed`}
                  </p>
                  <p className="text-[11px] text-red-300/70 mt-0.5 leading-relaxed">
                    {failedCursors[0]?.errorMessage?.split(" — ")[0] || "Check the failed nodes below."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            <TraceTimeline
              nodes={nodes}
              liveExecutionState={liveExecutionState}
              isLive={isExecutionLive}
              executionLogs={executionLogs}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-4 shrink-0 space-y-2" style={{ borderTop: "1px solid #2a2a2a" }}>
            {isActive && (
              <button
                onClick={cancelExecution}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold transition-all text-neutral-400 hover:text-white"
                style={{ background: "#1c1c1e", border: "1px solid #2a2a2a", borderRadius: 6 }}
              >
                <Square className="w-3 h-3" /> Stop Execution
              </button>
            )}
            {isFailed && (
              <div className="flex gap-2">
                <button
                  onClick={retryExecution}
                  disabled={isRunning}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: "#ef4444", border: "1px solid #dc2626", borderRadius: 6 }}
                >
                  {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Retry Failed
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 flex items-center justify-center py-2.5 text-[12px] font-semibold text-neutral-400 hover:text-white transition-all"
                  style={{ background: "#1c1c1e", border: "1px solid #2a2a2a", borderRadius: 6 }}
                >
                  Fix & Close
                </button>
              </div>
            )}
            {isSuccess && (
              <button
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold text-white transition-all"
                style={{ background: "#16a34a", border: "1px solid #15803d", borderRadius: 6 }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Done
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function StatusBadge({ status, isRunning }) {
  if (isRunning || status === "running") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-400"
        style={{ background: "#0d1a2a", border: "1px solid #1a3a5a", borderRadius: 3 }}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Live
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-400"
        style={{ background: "#2a0d0d", border: "1px solid #4a1a1a", borderRadius: 3 }}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Failed
      </span>
    );
  }
  if (status === "executed") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-green-400"
        style={{ background: "#0d2b1a", border: "1px solid #1a4a2a", borderRadius: 3 }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Success
      </span>
    );
  }
  return null;
}
