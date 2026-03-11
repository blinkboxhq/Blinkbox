import { Handle, Position } from "@xyflow/react";
import { Check, AlertTriangle } from "lucide-react";
import { NodeRegistry } from "../../nodeRegistry";
import useWorkspaceStore from "../../../../store/workspaceStore";

export default function CustomNode({ id, data }) {
  const nodeDef = NodeRegistry[data.backendType] || NodeRegistry.manual;
  const Icon = nodeDef.icon;

  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const getNodeStatus = useWorkspaceStore((s) => s.getNodeStatus);
  const status = isExecutionLive ? getNodeStatus(id) : null;

  const isTrigger = data.type === "trigger";

  // --- Visual state machine ---
  let borderColor = isTrigger ? "border-neutral-700" : "border-neutral-800";
  let glowStyle = {};
  let ringClass = "";
  let badge = null;

  if (status === "running") {
    borderColor = "border-blue-500/60";
    glowStyle = { boxShadow: "0 0 20px rgba(59,130,246,0.15)" };
    ringClass = "ring-1 ring-blue-500/30 animate-pulse";
  } else if (status === "completed") {
    borderColor = "border-emerald-500/50";
    glowStyle = { boxShadow: "0 0 16px rgba(34,197,94,0.1)" };
    badge = (
      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center z-20">
        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      </div>
    );
  } else if (status === "failed") {
    borderColor = "border-red-500/50";
    glowStyle = { boxShadow: "0 0 16px rgba(239,68,68,0.12)" };
    badge = (
      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center z-20">
        <AlertTriangle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center gap-3 border ${borderColor} ${ringClass} rounded-xl px-5 py-3 transition-all duration-200 min-w-[200px] backdrop-blur-md`}
      style={{
        background: "rgba(10, 10, 10, 0.85)",
        ...glowStyle,
      }}
    >
      {badge}

      {/* Input handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-2.5 h-2.5 !bg-neutral-900 !border-[1.5px] !border-neutral-600 rounded-full hover:!border-blue-400 transition-colors"
        />
      )}

      {/* Node icon */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${nodeDef.bgClass} ${nodeDef.colorClass}`}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Label */}
      <div className="flex flex-col overflow-hidden">
        <span className="text-neutral-100 font-semibold text-sm tracking-tight truncate">
          {data.label}
        </span>
        <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">
          {nodeDef.category}
        </span>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 !bg-neutral-900 !border-[1.5px] !border-neutral-600 rounded-full hover:!border-blue-400 transition-colors"
      />
    </div>
  );
}
