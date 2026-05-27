import { AnimatePresence, motion } from "framer-motion";
import { X, Activity, CheckCircle2, AlertTriangle, RefreshCw, Square, Loader2, Zap } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import TraceTimeline from "./TraceTimeline";

export default function ExecutionTraceSidebar() {
  const isOpen            = useWorkspaceStore((s) => s.isTraceSidebarOpen);
  const nodes             = useWorkspaceStore((s) => s.nodes);
  const isRunning         = useWorkspaceStore((s) => s.isRunning);
  const isExecutionLive   = useWorkspaceStore((s) => s.isExecutionLive);
  const liveExecutionState = useWorkspaceStore((s) => s.liveExecutionState);
  const executionLogs     = useWorkspaceStore((s) => s.executionLogs);
  const closeTraceSidebar = useWorkspaceStore((s) => s.closeTraceSidebar);
  const closeLiveExecution = useWorkspaceStore((s) => s.closeLiveExecution);
  const retryExecution    = useWorkspaceStore((s) => s.retryExecution);
  const cancelExecution   = useWorkspaceStore((s) => s.cancelExecution);

  const overallStatus   = liveExecutionState?.status || (isRunning ? "running" : "idle");
  const failedCursors   = liveExecutionState?.cursors?.filter((c) => c.status === "failed") || [];
  const completedCount  = liveExecutionState?.cursors?.filter((c) => c.status === "completed").length ?? 0;
  const totalCount      = liveExecutionState?.cursors?.length ?? 0;
  const isFailed        = overallStatus === "failed";
  const isSuccess       = overallStatus === "executed";
  const isActive        = overallStatus === "running" || isRunning;

  const handleClose = () => {
    closeTraceSidebar();
    if (!isRunning) closeLiveExecution();
  };

  const startedAt = liveExecutionState?.startedAt;
  const durationMs = liveExecutionState?.durationMs;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.9 }}
          className="fixed top-0 right-0 h-full w-[400px] z-30 flex flex-col"
          style={{ background: "#0d0d12", borderLeft: "1px solid #1a1a25", boxShadow: "-24px 0 80px rgba(0,0,0,0.85)" }}
        >
          {/* Top accent bar — color matches execution state */}
          <div className={`h-[3px] w-full shrink-0 ${isFailed ? "bg-red-500" : isSuccess ? "bg-emerald-500" : "bg-blue-500"} ${isActive ? "animate-pulse" : ""}`} />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid #1a1a25" }}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isFailed ? "bg-red-500/10 border border-red-500/20" :
                isSuccess ? "bg-emerald-500/10 border border-emerald-500/20" :
                "bg-blue-500/10 border border-blue-500/20"
              }`}>
                {isActive ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : isFailed ? (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Activity className="w-4 h-4 text-[#8a8aa8]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-white tracking-tight">Execution Trace</span>
                  <StatusPill status={overallStatus} isRunning={isActive} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {totalCount > 0 && (
                    <span className="text-[10px] text-[#4a4a65] font-mono">
                      {completedCount}/{totalCount} nodes
                    </span>
                  )}
                  {durationMs != null && (
                    <span className="text-[10px] text-[#4a4a65] font-mono">
                      · {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(2)}s`}
                    </span>
                  )}
                  {startedAt && !durationMs && (
                    <span className="text-[10px] text-[#4a4a65] font-mono">
                      · {new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06] text-[#4a4a65] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Error Banner ───────────────────────────────────────────────────── */}
          {isFailed && failedCursors.length > 0 && (
            <div className="mx-4 mt-4 shrink-0 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.25)" }}>
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: "rgba(239,68,68,0.08)" }}>
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-red-300 leading-tight">
                    {failedCursors.length === 1 ? "1 node failed" : `${failedCursors.length} nodes failed`}
                  </p>
                  {failedCursors[0]?.errorMessage && (
                    <p className="text-[11px] text-red-400/70 mt-0.5 leading-relaxed truncate">
                      {failedCursors[0].errorMessage.split(" — ")[0]}
                    </p>
                  )}
                </div>
              </div>
              {failedCursors[0]?.errorMessage?.includes(" — ") && (
                <div className="px-4 py-2.5 flex items-start gap-2" style={{ background: "rgba(251,191,36,0.04)", borderTop: "1px solid rgba(239,68,68,0.15)" }}>
                  <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-300/80 leading-relaxed">
                    {failedCursors[0].errorMessage.split(" — ").slice(1).join(" — ")}
                  </p>
                </div>
              )}
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
          <div className="px-4 py-4 shrink-0 space-y-2" style={{ borderTop: "1px solid #1a1a25" }}>
            {isActive && (
              <button
                onClick={cancelExecution}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                style={{ background: "#17171f", border: "1px solid #26263a", color: "#8a8aa8" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1d1d27"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#17171f"; e.currentTarget.style.color = "#8a8aa8"; }}
              >
                <Square className="w-3 h-3" /> Stop Execution
              </button>
            )}

            {isFailed && (
              <div className="flex gap-2">
                <button
                  onClick={retryExecution}
                  disabled={isRunning}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all disabled:opacity-40"
                  style={{ background: "#ef4444", color: "#fff", border: "1px solid rgba(239,68,68,0.5)" }}
                >
                  {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Retry Failed
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                  style={{ background: "#17171f", border: "1px solid #26263a", color: "#8a8aa8" }}
                >
                  Fix & Close
                </button>
              </div>
            )}

            {isSuccess && (
              <button
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                style={{ background: "#10b981", color: "#fff", border: "1px solid rgba(16,185,129,0.4)" }}
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

function StatusPill({ status, isRunning }) {
  if (isRunning || status === "running") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        Live
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Failed
      </span>
    );
  }
  if (status === "executed") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Success
      </span>
    );
  }
  return null;
}
