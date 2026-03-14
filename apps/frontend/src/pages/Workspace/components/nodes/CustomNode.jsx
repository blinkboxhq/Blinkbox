import { Handle, Position } from "@xyflow/react";
import { Check, AlertTriangle } from "lucide-react";
import { NodeRegistry } from "../../nodeRegistry";
import useWorkspaceStore from "../../../../store/workspaceStore";

export default function CustomNode({ id, data }) {
  const nodeDef = NodeRegistry[data.backendType] || NodeRegistry.manual;
  const Icon = nodeDef.icon;

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

  if (status === "running") {
    borderColor = "border-blue-500/40";
    glowStyle = { boxShadow: "0 0 24px rgba(59,130,246,0.08)" };
    ringClass = "ring-1 ring-blue-500/20";
  } else if (status === "completed") {
    borderColor = "border-emerald-500/30";
    glowStyle = { boxShadow: "0 0 20px rgba(34,197,94,0.06)" };
    badge = (
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center z-20">
        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      </div>
    );
  } else if (status === "failed") {
    borderColor = "border-red-500/30";
    glowStyle = { boxShadow: "0 0 20px rgba(239,68,68,0.08)" };
    badge = (
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center z-20">
        <AlertTriangle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      </div>
    );
  }

  // Mapping warning — amber pulsating border
  if (hasMappingWarning && !status) {
    borderColor = "border-amber-500/30";
    ringClass = "ring-2 ring-amber-500/30 animate-pulse";
    glowStyle = { boxShadow: "0 0 20px rgba(245,158,11,0.06)" };
  }

  return (
    <div
      className={`relative border ${borderColor} ${ringClass} rounded-xl transition-all duration-200 min-w-[260px] backdrop-blur-md bg-zinc-900/80 shadow-2xl`}
      style={glowStyle}
    >
      {badge}

      {/* Input handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-zinc-950 !border !border-zinc-600 !rounded-sm hover:!border-zinc-400 transition-colors"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/50">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${nodeDef.bgClass} ${nodeDef.colorClass}`}
        >
          <Icon className="w-4 h-4" />
        </div>

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
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
          {status === "completed" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
          {status === "failed" && <div className="w-2 h-2 rounded-full bg-red-500" />}
          {!status && <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />}
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
    </div>
  );
}
