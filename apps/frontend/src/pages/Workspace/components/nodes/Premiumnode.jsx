import { Handle, Position } from "@xyflow/react";
import {
  Zap, Globe, Code2, Clock,
  AlertTriangle, Play, Database, Network
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

const COLOR_MAP = {
  webhook: "text-green-400",
  http_request: "text-blue-400",
  code: "text-violet-400",
  delay: "text-orange-400",
  cron_trigger: "text-green-400",
  trigger: "text-green-400",
  data_mapper: "text-emerald-400",
};

const ACCENT_MAP = {
  webhook: "34,197,94",
  http_request: "59,130,246",
  code: "139,92,246",
  delay: "251,146,60",
  cron_trigger: "34,197,94",
  trigger: "34,197,94",
  data_mapper: "52,211,153",
};

export default function PremiumNode({ id, data, selected, isConnectable }) {
  const Icon = ICON_MAP[data.backendType] || Play;
  const colorClass = COLOR_MAP[data.backendType] || "text-zinc-400";
  const accent = ACCENT_MAP[data.backendType] || "161,161,170";
  const status = data.status || "idle";
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  return (
    <div
      className={clsx(
        "relative min-w-[240px] bg-zinc-900 rounded-xl transition-colors duration-150",
        "border shadow-sm",
        selected
          ? "border-zinc-600"
          : status === "failed"
            ? "border-red-500/30"
            : status === "success"
              ? "border-emerald-500/30"
              : hasMappingWarning && status === "idle"
                ? "border-amber-500/30"
                : "border-zinc-800/60"
      )}
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
        style={{ backgroundColor: `rgba(${accent},0.25)` }}
      />

      {/* Target Handle */}
      {data.backendType !== "trigger" && data.backendType !== "webhook" && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="!w-2 !h-2 !bg-zinc-700 !border-0 !rounded-full hover:!bg-zinc-500 transition-colors"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-zinc-800 ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
        </div>

        <span className="text-[13px] font-medium text-zinc-100 truncate flex-1 min-w-0">
          {data.label || data.backendType}
        </span>

        {/* Status */}
        <div className="shrink-0">
          {status === "running" && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
          {status === "success" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
          {status === "failed" && <div className="w-2 h-2 rounded-full bg-red-500" />}
          {hasMappingWarning && status === "idle" && (
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

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!w-2 !h-2 !bg-zinc-700 !border-0 !rounded-full hover:!bg-zinc-500 transition-colors"
      />
    </div>
  );
}
