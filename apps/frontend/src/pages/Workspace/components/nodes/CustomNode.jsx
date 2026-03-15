import { Handle, Position } from "@xyflow/react";
import { Check, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { NodeRegistry } from "../../nodeRegistry";
import useWorkspaceStore from "../../../../store/workspaceStore";

export default function CustomNode({ id, data, selected }) {
  const nodeDef = NodeRegistry[data.backendType] || NodeRegistry.manual;
  const Icon = nodeDef.icon;
  const accent = nodeDef.accentColor || "161,161,170";

  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const getNodeStatus = useWorkspaceStore((s) => s.getNodeStatus);
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const status = isExecutionLive ? getNodeStatus(id) : null;
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  const isTrigger = data.type === "trigger";

  // --- Visual state ---
  let borderClass = "border-zinc-800/60";
  let badge = null;

  if (status === "running") {
    borderClass = "border-blue-500/30";
  } else if (status === "completed") {
    borderClass = "border-emerald-500/25";
    badge = (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center z-20"
      >
        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      </motion.div>
    );
  } else if (status === "failed") {
    borderClass = "border-red-500/25";
    badge = (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center z-20"
      >
        <AlertTriangle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      </motion.div>
    );
  }

  if (hasMappingWarning && !status) {
    borderClass = "border-amber-500/25";
  }

  if (selected) {
    borderClass = "border-zinc-600";
  }

  return (
    <div
      className={`relative border ${borderClass} rounded-xl min-w-[260px] bg-zinc-900 transition-colors duration-150 overflow-hidden`}
    >
      {badge}

      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-xl"
        style={{ backgroundColor: `rgba(${accent},0.3)` }}
      />

      {/* Input handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !bg-zinc-700 !border-0 !rounded-full hover:!bg-zinc-500 transition-colors"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-zinc-800/80 ${nodeDef.colorClass}`}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>

        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-zinc-200 tracking-tight truncate">
              {data.label}
            </span>
            {hasMappingWarning && (
              <div className="relative group">
                <AlertTriangle className="w-3 h-3 text-amber-500/70 shrink-0 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-52">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-amber-400/80 leading-relaxed">{w}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
            {nodeDef.category}
          </span>
        </div>

        {/* Status */}
        <div className="shrink-0">
          {status === "running" && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
          {status === "completed" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
          {status === "failed" && <div className="w-2 h-2 rounded-full bg-red-500" />}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-[12px] text-zinc-500 leading-relaxed truncate">
          {data.subtitle || "Configure node parameters"}
        </p>
        {data.error && (
          <p className="mt-1.5 text-[10px] text-red-400/70 truncate">
            {data.error}
          </p>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-zinc-700 !border-0 !rounded-full hover:!bg-zinc-500 transition-colors"
      />
    </div>
  );
}
