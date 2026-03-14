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
  const status = data.status || "idle"; // idle, running, success, failed
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  return (
    <div
      className={clsx(
        "relative min-w-[240px] bg-zinc-900 rounded-xl transition-all duration-200",
        "border shadow-xl shadow-black/40",
        selected ? "border-blue-500 ring-1 ring-blue-500/50" : "border-zinc-800",
        status === "failed" && "border-red-500/50",
        status === "success" && "border-emerald-500/30",
        hasMappingWarning && status === "idle" && "ring-2 ring-amber-500/50 animate-pulse border-amber-500/50"
      )}
    >
      {/* Target Handle (Input) */}
      {data.backendType !== "trigger" && data.backendType !== "webhook" && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-zinc-900 border-2 border-zinc-500 rounded-full transition-colors hover:border-blue-400 hover:bg-blue-500/20"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 bg-zinc-800/20 rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-zinc-800 rounded-md border border-zinc-700">
            <Icon className="w-3.5 h-3.5 text-zinc-300" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-zinc-100 uppercase">
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
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
          )}
          {status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          {status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
          {status === "idle" && <div className="w-2 h-2 rounded-full bg-zinc-700" />}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-[11px] text-zinc-400 truncate">
          {data.subtitle || "Configure node parameters"}
        </p>
        {data.error && (
          <p className="mt-2 text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 truncate">
            {data.error}
          </p>
        )}
      </div>

      {/* Source Handle (Output) */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-zinc-900 border-2 border-zinc-500 rounded-full transition-colors hover:border-blue-400 hover:bg-blue-500/20"
      />
    </div>
  );
}