import { Handle, Position } from "@xyflow/react";
import { Check, AlertTriangle, X } from "lucide-react";
import { NodeRegistry } from "../../nodeRegistry";
import useWorkspaceStore from "../../../../store/workspaceStore";

export default function CustomNode({ id, data, selected }) {
  const nodeDef = NodeRegistry[data.backendType] || NodeRegistry.manual;
  const Icon = nodeDef.icon;

  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const getNodeStatus = useWorkspaceStore((s) => s.getNodeStatus);
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const status = isExecutionLive ? getNodeStatus(id) : null;
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  const isTrigger = data.type === "trigger";

  return (
    <div
      className={[
        "relative rounded-xl min-w-[240px] border transition-colors duration-150",
        "bg-zinc-900 shadow-sm",
        selected
          ? "border-zinc-600"
          : status === "running"
            ? "border-blue-500/40"
            : status === "completed"
              ? "border-emerald-500/30"
              : status === "failed"
                ? "border-red-500/30"
                : hasMappingWarning
                  ? "border-amber-500/30"
                  : "border-zinc-800/60",
      ].join(" ")}
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
        style={{ backgroundColor: `rgba(${nodeDef.accentColor || "161,161,170"},0.25)` }}
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
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-zinc-800 ${nodeDef.colorClass}`}>
          <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
        </div>

        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          <span className="text-[13px] font-medium text-zinc-100 truncate leading-tight">
            {data.label}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider leading-tight mt-0.5">
            {nodeDef.category}
          </span>
        </div>

        {/* Status dot */}
        <div className="shrink-0">
          {status === "running" && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
          {status === "completed" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
          {status === "failed" && <div className="w-2 h-2 rounded-full bg-red-500" />}
          {hasMappingWarning && !status && (
            <div className="relative group">
              <AlertTriangle className="w-3 h-3 text-amber-500/70 cursor-help" strokeWidth={2} />
              <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-52">
                {warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-amber-400/80 leading-relaxed">{w}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {(data.subtitle || data.error) && (
        <div className="px-4 pb-2.5">
          {data.subtitle && (
            <p className="text-[11px] text-zinc-500 leading-relaxed truncate">
              {data.subtitle}
            </p>
          )}
          {data.error && (
            <p className="text-[10px] text-red-400/70 mt-1 truncate">
              {data.error}
            </p>
          )}
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-zinc-700 !border-0 !rounded-full hover:!bg-zinc-500 transition-colors"
      />
    </div>
  );
}
