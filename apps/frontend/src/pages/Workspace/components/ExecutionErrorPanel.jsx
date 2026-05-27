import { AnimatePresence, motion } from "framer-motion";
import { XCircle, X, Wand2, ChevronRight } from "lucide-react";
import useWorkspaceStore from "../../../store/workspaceStore";

export default function ExecutionErrorPanel({ liveExecutionState, onDismiss }) {
  const queueBrianMessage = useWorkspaceStore((s) => s.queueBrianMessage);
  const nodes             = useWorkspaceStore((s) => s.nodes);

  const failedCursors = liveExecutionState?.cursors?.filter((c) => c.status === "failed") || [];
  const firstFailed   = failedCursors[0];
  const failedNode    = firstFailed ? nodes.find((n) => n.id === firstFailed.nodeId) : null;
  const failedLabel   = failedNode?.data?.label || firstFailed?.nodeId || "a node";
  const errorDetail   = firstFailed?.errorMessage?.split(" — ")[0] || "An unexpected error occurred.";

  const handleFixViaBrian = () => {
    const workflowSummary = nodes
      .map((n) => `- ${n.data.label} (${n.data.backendType})`)
      .join("\n");

    const prompt = [
      `My workflow just failed during execution.`,
      ``,
      `Failed node: **${failedLabel}**`,
      `Error: ${errorDetail}`,
      ``,
      `Workflow nodes:`,
      workflowSummary,
      ``,
      `Can you diagnose what went wrong and suggest a fix?`,
    ].join("\n");

    queueBrianMessage(prompt);
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: "spring", damping: 26, stiffness: 340, mass: 0.8 }}
      className="absolute bottom-20 right-5 z-20 w-[340px] rounded-2xl overflow-hidden select-none"
      style={{
        background: "#111118",
        border: "1px solid #26263a",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(239,68,68,0.08)",
      }}
    >
      {/* Red accent line */}
      <div className="h-[2px] w-full bg-red-500/70" />

      {/* Body */}
      <div className="flex gap-3.5 px-4 pt-4 pb-3.5">
        {/* Icon */}
        <div className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#ef4444" }}>
            <X className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-[13px] font-bold text-white leading-tight mb-1.5">
            Problem executing workflow
          </p>
          <p className="text-[11px] text-[#8a8aa8] leading-relaxed">
            There was a problem executing the workflow.
          </p>
          {failedCursors.length > 0 && (
            <p className="text-[11px] leading-relaxed mt-1" style={{ color: "rgba(252,165,165,0.85)" }}>
              <span className="font-semibold text-red-300">{failedLabel}</span>
              {" "}failed: {errorDetail.length > 80 ? errorDetail.slice(0, 80) + "…" : errorDetail}
            </p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-3.5 right-3.5 w-6 h-6 flex items-center justify-center rounded-lg transition-colors text-[#4a4a65] hover:text-white hover:bg-white/[0.07]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <button
          onClick={handleFixViaBrian}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold transition-all"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.22)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.15)"; }}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Fix via Brian
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all text-[#4a4a65] hover:text-[#8a8aa8]"
          style={{ background: "#17171f", border: "1px solid #26263a" }}
        >
          Dismiss <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}
