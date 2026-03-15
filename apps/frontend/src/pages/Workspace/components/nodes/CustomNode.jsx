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

  // --- Visual state machine ---
  let borderColor = "border-zinc-800/50";
  let glowStyle = {};
  let ringClass = "";
  let badge = null;
  let accentBarOpacity = 0.3;

  if (status === "running") {
    borderColor = "border-blue-500/40";
    glowStyle = { boxShadow: `0 0 30px rgba(59,130,246,0.15), 0 0 60px rgba(59,130,246,0.05)` };
    ringClass = "ring-1 ring-blue-500/20";
    accentBarOpacity = 1;
  } else if (status === "completed") {
    borderColor = "border-emerald-500/30";
    glowStyle = { boxShadow: `0 0 24px rgba(34,197,94,0.12)` };
    accentBarOpacity = 0.8;
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
    borderColor = "border-red-500/30";
    glowStyle = { boxShadow: `0 0 24px rgba(239,68,68,0.12)` };
    accentBarOpacity = 0.8;
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
    borderColor = "border-amber-500/30";
    ringClass = "ring-2 ring-amber-500/30 animate-pulse";
    glowStyle = { boxShadow: "0 0 20px rgba(245,158,11,0.08)" };
  }

  if (selected) {
    glowStyle = {
      ...glowStyle,
      boxShadow: `0 0 30px rgba(${accent},0.15), 0 0 60px rgba(${accent},0.05)`,
    };
  }

  return (
    <motion.div
      whileHover={{
        scale: 1.02,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(${accent},0.12)`,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`relative border ${borderColor} ${ringClass} rounded-xl min-w-[260px] backdrop-blur-md bg-zinc-900/80 shadow-2xl overflow-hidden`}
      style={glowStyle}
    >
      {badge}

      {/* Colored accent bar — left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-opacity duration-500"
        style={{
          background: `rgba(${accent},${accentBarOpacity})`,
          boxShadow: `0 0 8px rgba(${accent},${accentBarOpacity * 0.3})`,
        }}
      />

      {/* Input handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-zinc-950 !border !border-zinc-600 !rounded-sm hover:!border-zinc-400 transition-colors"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/30">
        {/* Animated icon container */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 3 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${nodeDef.bgClass} ${nodeDef.colorClass}`}
          style={{
            boxShadow: `0 0 12px rgba(${accent},0.15)`,
          }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>

        <div className="flex flex-col overflow-hidden flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-zinc-200 tracking-tight truncate">
              {data.label}
            </span>
            {hasMappingWarning && (
              <div className="relative group">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-amber-500/30 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-56">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-amber-300 leading-relaxed">{w}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
            {nodeDef.category}
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center shrink-0">
          {status === "running" && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          )}
          {status === "completed" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 rounded-full bg-emerald-500"
            />
          )}
          {status === "failed" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 rounded-full bg-red-500"
            />
          )}
          {!status && (
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `rgba(${accent},0.4)` }}
            />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-[12px] text-zinc-500 leading-relaxed truncate">
          {data.subtitle || "Configure node parameters"}
        </p>
        {data.error && (
          <p className="mt-2 text-[11px] text-red-400/80 bg-red-500/5 px-3 py-1.5 rounded-md border border-red-500/10 truncate">
            {data.error}
          </p>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-zinc-950 !border !border-zinc-600 !rounded-sm hover:!border-zinc-400 transition-colors"
      />
    </motion.div>
  );
}
