import { Handle, Position } from "@xyflow/react";
import {
  Zap, Globe, Code2, Clock, CheckCircle2,
  AlertCircle, AlertTriangle, Play, Database, Network
} from "lucide-react";
import { motion } from "framer-motion";
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
  const status = data.status || "idle";
  const accent = ACCENT_MAP[data.backendType] || "161,161,170";
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  return (
    <motion.div
      whileHover={{
        scale: 1.02,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(${accent},0.12)`,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={clsx(
        "relative min-w-[260px] bg-zinc-900/80 backdrop-blur-md rounded-xl overflow-hidden",
        "border shadow-2xl",
        selected ? "border-zinc-600 ring-1 ring-zinc-600/30" : "border-zinc-800/50",
        status === "failed" && "border-red-500/30",
        status === "success" && "border-emerald-500/20",
        hasMappingWarning && status === "idle" && "ring-2 ring-amber-500/30 animate-pulse border-amber-500/30"
      )}
    >
      {/* Colored accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{
          background: `rgba(${accent},0.4)`,
          boxShadow: `0 0 8px rgba(${accent},0.12)`,
        }}
      />

      {/* Target Handle */}
      {data.backendType !== "trigger" && data.backendType !== "webhook" && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-zinc-950 !border !border-zinc-600 !rounded-sm transition-colors hover:!border-zinc-400"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/30">
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 3 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="p-1.5 bg-zinc-800/60 rounded-lg"
            style={{ boxShadow: `0 0 10px rgba(${accent},0.12)` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: `rgba(${accent},0.85)` }} />
          </motion.div>
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

        {/* Status */}
        <div className="flex items-center justify-center">
          {status === "running" && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          )}
          {status === "success" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
          {status === "failed" && <div className="w-2 h-2 rounded-full bg-red-500" />}
          {status === "idle" && (
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `rgba(${accent},0.4)` }} />
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

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-zinc-950 !border !border-zinc-600 !rounded-sm transition-colors hover:!border-zinc-400"
      />
    </motion.div>
  );
}
