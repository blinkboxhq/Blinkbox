import { Handle, Position } from "@xyflow/react";
import {
  Zap, Globe, Code2, Clock, CheckCircle2,
  AlertCircle, AlertTriangle, Play, Database, Network
} from "lucide-react";
import clsx from "clsx";
import useWorkspaceStore from "../../../../store/workspaceStore";

const ICON_MAP = {
  webhook: Globe,
  http_request: Network,
  code: Code2,
  delay: Clock,
  cron_trigger: Clock,
  trigger: Zap,
  data_mapper: Database,
};

export default function PremiumNode({ id, data, selected, isConnectable }) {
  const Icon = ICON_MAP[data.backendType] || Play;
  const status = data.status || "idle";
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  return (
    <div
      className={clsx(
        "relative min-w-[260px] bg-zinc-900/80 backdrop-blur-md rounded-xl transition-all duration-200",
        "border shadow-2xl",
        selected ? "border-zinc-600 ring-1 ring-zinc-600/30" : "border-zinc-800/50",
        status === "failed" && "border-red-500/30",
        status === "success" && "border-emerald-500/20",
        hasMappingWarning && status === "idle" && "ring-2 ring-amber-500/30 animate-pulse border-amber-500/30"
      )}
    >
      {/* Target Handle (Input) */}
      {data.backendType !== "trigger" && data.backendType !== "webhook" && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-zinc-950 !border !border-zinc-600 !rounded-sm transition-colors hover:!border-zinc-400"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-zinc-800/60 rounded-lg">
            <Icon className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <span className="text-[13px] font-medium text-zinc-200 tracking-tight">
            {data.label || data.backendType}
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

        {/* Status Indicator */}
        <div className="flex items-center justify-center">
          {status === "running" && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
          {status === "success" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
          {status === "failed" && <div className="w-2 h-2 rounded-full bg-red-500" />}
          {status === "idle" && <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />}
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

      {/* Source Handle (Output) */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-zinc-950 !border !border-zinc-600 !rounded-sm transition-colors hover:!border-zinc-400"
      />
    </div>
  );
}
