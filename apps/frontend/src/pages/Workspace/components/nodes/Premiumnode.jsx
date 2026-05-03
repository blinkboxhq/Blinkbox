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

export default function PremiumNode({ id, data, config = {}, updateConfig, nodeId }) {
  const Icon = ICON_MAP[data?.backendType] || Play;
  const colorClass = COLOR_MAP[data?.backendType] || "text-zinc-400";
  const accent = ACCENT_MAP[data?.backendType] || "161,161,170";
  const status = data?.status || "idle";
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  return (
    <div className="flex flex-col">
      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-xl"
        style={{ backgroundColor: `rgba(${accent},0.3)` }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800/80 ${colorClass}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>
          <span className="text-[13px] font-medium text-zinc-200 tracking-tight">
            {data.label || data.backendType}
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

    </div>
  );
}
