import { AnimatePresence, motion } from "framer-motion";
import { X, Activity, CheckCircle2, AlertCircle, RefreshCw, Square, Loader2 } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";
import TraceTimeline from "./TraceTimeline";

/**
 * ExecutionTraceSidebar — Framer Motion slide-over panel that renders the
 * execution trace as a chronological timeline with data-flow diffing.
 */
export default function ExecutionTraceSidebar() {
  const isOpen = useWorkspaceStore((s) => s.isTraceSidebarOpen);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const liveExecutionState = useWorkspaceStore((s) => s.liveExecutionState);
  const closeTraceSidebar = useWorkspaceStore((s) => s.closeTraceSidebar);
  const closeLiveExecution = useWorkspaceStore((s) => s.closeLiveExecution);
  const retryExecution = useWorkspaceStore((s) => s.retryExecution);
  const cancelExecution = useWorkspaceStore((s) => s.cancelExecution);

  const overallStatus = liveExecutionState?.status || (isRunning ? "running" : "idle");

  const handleClose = () => {
    closeTraceSidebar();
    if (!isRunning) closeLiveExecution();
  };

  // Count failed nodes for the error summary
  const failedCursors = liveExecutionState?.cursors?.filter((c) => c.status === "failed") || [];
  const completedCursors = liveExecutionState?.cursors?.filter((c) => c.status === "completed") || [];
  const totalCursors = liveExecutionState?.cursors?.length || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed top-0 right-0 h-full w-[420px] z-30 flex flex-col bg-zinc-950 border-l border-zinc-800 shadow-[-20px_0_60px_rgba(0,0,0,0.8)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${
                overallStatus === "failed" ? "bg-red-500/10" :
                overallStatus === "executed" ? "bg-emerald-500/10" :
                "bg-blue-500/10"
              }`}>
                <Activity className={`w-4 h-4 ${
                  overallStatus === "failed" ? "text-red-400" :
                  overallStatus === "executed" ? "text-emerald-400" :
                  "text-blue-400"
                }`} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100 tracking-tight">
                  Execution Trace
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StatusDot status={overallStatus} />
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      overallStatus === "failed" ? "text-red-400" :
                      overallStatus === "executed" ? "text-emerald-400" :
                      overallStatus === "running" ? "text-blue-400" :
                      "text-zinc-500"
                    }`}
                  >
                    {overallStatus === "executed" ? "Success" : overallStatus}
                  </span>
                  {totalCursors > 0 && (
                    <span className="text-[10px] text-zinc-600 ml-1">
                      ({completedCursors.length}/{totalCursors} nodes)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error summary banner */}
          {overallStatus === "failed" && failedCursors.length > 0 && (
            <div className="mx-5 mt-4 p-3 bg-red-500/5 border border-red-500/15 rounded-lg">
              <p className="text-[11px] font-semibold text-red-400 mb-1">
                {failedCursors.length} node{failedCursors.length > 1 ? "s" : ""} failed
              </p>
              <p className="text-[10px] text-red-400/70 leading-relaxed">
                {failedCursors[0]?.errorMessage?.split(" — ")[1] || "Check the failed nodes below for details."}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <TraceTimeline
              nodes={nodes}
              liveExecutionState={liveExecutionState}
              isLive={isExecutionLive}
            />
          </div>

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-zinc-800/80 space-y-2">
            {/* Running — show cancel */}
            {overallStatus === "running" && (
              <button
                onClick={cancelExecution}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all"
              >
                <Square className="w-3 h-3" />
                Cancel Execution
              </button>
            )}

            {/* Failed — show retry + close */}
            {overallStatus === "failed" && (
              <div className="flex gap-2">
                <button
                  onClick={retryExecution}
                  disabled={isRunning}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-950 hover:bg-white transition-all disabled:opacity-50"
                >
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Retry Failed
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Fix & Close
                </button>
              </div>
            )}

            {/* Success — show close */}
            {overallStatus === "executed" && (
              <button
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Back to Canvas
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function StatusDot({ status }) {
  if (status === "running") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
      </span>
    );
  }
  if (status === "executed") {
    return <span className="w-2 h-2 rounded-full bg-emerald-500" />;
  }
  if (status === "failed") {
    return <span className="w-2 h-2 rounded-full bg-red-500" />;
  }
  return <span className="w-2 h-2 rounded-full bg-zinc-700" />;
}
