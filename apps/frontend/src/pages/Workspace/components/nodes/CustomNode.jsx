import { Handle, Position } from "@xyflow/react";
import { Check, AlertTriangle, Settings2, Play, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { NodeRegistry } from "../../nodeRegistry";
import useWorkspaceStore from "../../../../store/workspaceStore";

/** Extract a short human-readable config summary from node data */
function getConfigHint(data) {
  const c = data.config || {};
  if (data.backendType === "http_request") {
    if (c.method && c.url) return `${c.method} ${c.url}`.slice(0, 40);
    if (c.url) return c.url.slice(0, 40);
  }
  if (data.backendType === "delay" && c.seconds) return `Wait ${c.seconds}s`;
  if (data.backendType === "code" && c.code) return `${c.code}`.slice(0, 40);
  if (data.backendType === "loop" && c.arrayPath) return `each ${c.arrayPath}`;
  if (data.backendType === "web_scraper" && c.url) return c.url.slice(0, 40);
  if (data.backendType === "ai_agent" && c.model) return c.model;
  if (data.backendType === "webhook" && c.path) return `/${c.path}`;
  if (data.backendType === "cron_trigger" && c.expression) return c.expression;
  if (data.backendType === "logic_router" && c.field) return `if ${c.field}`;
  if (data.backendType === "slack" && c.message) return c.message.slice(0, 40);
  if (data.backendType === "discord" && c.message) return c.message.slice(0, 40);
  if (data.backendType === "stripe" && c.action) return c.action.replace("_", " ");
  if (data.backendType === "openai" && c.model) return c.model;
  if (data.backendType === "anthropic" && c.model) return c.model;
  if (data.backendType === "gemini" && c.model) return c.model;
  if (data.backendType === "deepseek" && c.model) return c.model;
  if (data.backendType === "telegram" && c.text) return c.text.slice(0, 40);
  if (data.backendType === "whatsapp" && c.to) return `→ ${c.to}`;
  if (data.backendType === "airtable" && c.tableName) return `${c.action || "create"} · ${c.tableName}`;
  if (data.backendType === "web_search" && c.query) return c.query.slice(0, 40);
  return null;
}

export default function CustomNode({ id, data, selected }) {
  const { id: automationId } = useParams();
  const nodeDef = NodeRegistry[data.backendType] || NodeRegistry.manual;
  const Icon = nodeDef.icon;
  const accent = nodeDef.accentColor || "161,161,170";

  const isExecutionLive = useWorkspaceStore((s) => s.isExecutionLive);
  const getNodeStatus = useWorkspaceStore((s) => s.getNodeStatus);
  const getMappingWarnings = useWorkspaceStore((s) => s.getMappingWarnings);
  const isRunning = useWorkspaceStore((s) => s.isRunning);
  const runEngine = useWorkspaceStore((s) => s.runEngine);
  const status = isExecutionLive ? getNodeStatus(id) : null;
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  const isTrigger = data.type === "trigger";
  const configHint = getConfigHint(data);
  const isConfigured = !!(data.config && Object.keys(data.config).length > 0);

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
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center z-20"
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
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center z-20"
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

  const handlePlay = (e) => {
    e.stopPropagation();
    if (!isRunning && automationId) {
      runEngine(automationId);
    }
  };

  return (
    <div
      className={`relative border ${borderClass} rounded-xl min-w-[260px] bg-zinc-900 transition-colors duration-150 overflow-hidden`}
    >
      {badge}

      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-xl"
        style={{ backgroundColor: `rgba(${accent},0.35)` }}
      />

      {/* Input handle — hidden for triggers */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-4 !h-4 !bg-zinc-700 !border-2 !border-zinc-900 !rounded-full hover:!bg-zinc-400 active:!bg-zinc-300 transition-colors touch-none"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-zinc-800/80 ${nodeDef.colorClass}`}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>

        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-zinc-100 tracking-tight truncate">
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

      {/* Body — config details */}
      <div className="px-4 pb-3 space-y-1.5">
        {configHint ? (
          <p className="text-[11px] text-zinc-400 font-mono truncate bg-zinc-800/50 rounded px-2 py-1">
            {configHint}
          </p>
        ) : (
          <p className="text-[11px] text-zinc-600 truncate">
            {data.subtitle || "Not configured"}
          </p>
        )}

        {data.error && (
          <p className="text-[10px] text-red-400/70 truncate">
            {data.error}
          </p>
        )}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-800/40 bg-zinc-950/30">
        <span className="text-[9px] text-zinc-600 font-mono truncate max-w-[140px]">
          {id.length > 20 ? `...${id.slice(-16)}` : id}
        </span>
        <div className="flex items-center gap-1.5">
          {isTrigger ? (
            <button
              onClick={handlePlay}
              disabled={isRunning}
              className={`group flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-200 ${
                isRunning
                  ? "bg-blue-500/10 text-blue-400 cursor-not-allowed"
                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 active:scale-95"
              }`}
            >
              {isRunning ? (
                <><Loader2 className="w-2.5 h-2.5 animate-spin" />Running</>
              ) : (
                <><Play className="w-2.5 h-2.5 fill-current" />Run</>
              )}
            </button>
          ) : isConfigured ? (
            <span className="text-[9px] text-emerald-600 uppercase tracking-wider">Ready</span>
          ) : (
            <span className="flex items-center gap-0.5 text-[9px] text-zinc-600 uppercase tracking-wider">
              <Settings2 className="w-2.5 h-2.5" />
              Setup
            </span>
          )}
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-zinc-700 !border-2 !border-zinc-900 !rounded-full hover:!bg-zinc-400 active:!bg-zinc-300 transition-colors touch-none"
      />
    </div>
  );
}
