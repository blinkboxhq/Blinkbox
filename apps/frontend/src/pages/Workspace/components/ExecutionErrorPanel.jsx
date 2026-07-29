import { motion } from "framer-motion";
import { X } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

export default function ExecutionErrorPanel({ liveExecutionState, onDismiss }) {
  const nodes = useWorkspaceStore((s) => s.nodes);

  const failedCursors = liveExecutionState?.cursors?.filter((c) => c.status === "failed") || [];
  const firstFailed   = failedCursors[0];
  const failedNode    = firstFailed ? nodes.find((n) => n.id === firstFailed.nodeId) : null;
  const failedLabel   = failedNode?.data?.label || firstFailed?.nodeId || "a node";
  const errorDetail   = firstFailed?.errorMessage?.split(" — ")[0] || "An unexpected error occurred.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.8 }}
      className="absolute bottom-20 right-5 z-20 w-[360px] select-none"
      style={{
        background: "#1c1c1e",
        border: "1px solid #333",
        borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {/* Red circle X */}
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: "#ef4444" }}
        >
          <X className="w-4 h-4 text-white" strokeWidth={3} />
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white leading-snug">
            Problem executing workflow
          </p>
          <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed">
            There was a problem executing the workflow.
          </p>
          <p className="text-[12px] font-semibold text-neutral-300 mt-1 leading-relaxed">
            {failedCursors.length > 0
              ? `${failedLabel} failed: ${errorDetail.length > 90 ? errorDetail.slice(0, 90) + "…" : errorDetail}`
              : "The workflow has issues and cannot be executed for that reason. Please fix them first."}
          </p>
        </div>

        {/* Dismiss X */}
        <button
          onClick={onDismiss}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-neutral-500 hover:text-white transition-colors mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#2a2a2a", margin: "0 16px" }} />

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onDismiss}
          className="px-4 py-2 text-[12px] font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
          style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 6 }}
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}
