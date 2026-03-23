import { useState, useCallback } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Check, AlertTriangle, Settings2, Play, Loader2, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import { NodeRegistry } from "../../nodeRegistry";
import useWorkspaceStore from "../../../../store/workspaceStore";

// ── AI Agent Bottom Handles ──────────────────────────────────────────────────
const AI_AGENT_BOTTOM_HANDLES = [
  {
    id: "chat_model",
    label: "Model",
    allowedTypes: [
      "openai", "anthropic", "gemini", "deepseek",
      "openrouter", "together", "perplexity", "xai", "fireworks",
      "cerebras", "ollama", "novita", "deepinfra", "hyperbolic",
    ],
  },
  {
    id: "memory",
    label: "Memory",
    allowedTypes: [],
  },
  {
    id: "tools",
    label: "Tool",
    allowedTypes: [
      "http_request", "web_scraper", "web_search", "code",
      "slack", "discord", "telegram", "whatsapp",
      "stripe", "airtable",
    ],
  },
];

// ── Node Picker Popover ──────────────────────────────────────────────────────
function NodePickerPopover({ handle, parentNodeId, onClose }) {
  const addNode = useWorkspaceStore((s) => s.addNode);
  const onConnect = useWorkspaceStore((s) => s.onConnect);
  const { getNode } = useReactFlow();

  const entries = Object.entries(NodeRegistry).filter(([key, def]) => {
    if (def.category === "trigger") return false;
    if (handle.allowedTypes.length > 0) return handle.allowedTypes.includes(key);
    return true;
  });

  const handleSelect = useCallback((nodeKey) => {
    const parentNode = getNode(parentNodeId);
    if (!parentNode) return;

    const newId = `${nodeKey}-${crypto.randomUUID()}`;
    const nodeDef = NodeRegistry[nodeKey];

    addNode({
      id: newId,
      type: "custom",
      position: {
        x: parentNode.position.x,
        y: parentNode.position.y + 200,
      },
      data: {
        backendType: nodeKey,
        label: nodeDef?.label || nodeKey,
        type: "action",
        config: {},
      },
    });

    setTimeout(() => {
      onConnect({
        source: newId,
        sourceHandle: "output",
        target: parentNodeId,
        targetHandle: handle.id,
      });
    }, 50);

    onClose();
  }, [parentNodeId, handle, addNode, onConnect, getNode, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50
        w-48 max-h-72 overflow-y-auto overscroll-contain
        bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl shadow-black/50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/60">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
          {handle.label}
        </span>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="py-0.5">
        {entries.length === 0 ? (
          <p className="px-3 py-2 text-[10px] text-zinc-600">No nodes available</p>
        ) : (
          entries.map(([key, def]) => {
            const Icon = def.icon;
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-zinc-800/60 transition-colors text-left"
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center bg-zinc-800 ${def.colorClass} shrink-0`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-[11px] text-zinc-400 truncate">{def.label}</span>
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ── Single Bottom Handle ─────────────────────────────────────────────────────
function AgentBottomHandle({ handle, parentNodeId, hasConnection }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      {/* The React Flow connectable handle (diamond) */}
      <Handle
        type="target"
        position={Position.Bottom}
        id={handle.id}
        className="!w-[12px] !h-[12px] !rounded-[2px] !border-[1.5px] !border-zinc-700 !bg-zinc-800 !rotate-45 hover:!bg-zinc-600 transition-colors touch-none !relative !transform-none !left-auto !top-auto"
      />

      {/* Label */}
      <span className="text-[8px] text-zinc-600 mt-1.5 select-none pointer-events-none whitespace-nowrap">
        {handle.label}
      </span>

      {/* + button */}
      {!hasConnection && (
        <div className="relative mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen(!pickerOpen);
            }}
            className="w-4 h-4 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
            title={`Add ${handle.label}`}
          >
            <Plus className="w-2.5 h-2.5" />
          </button>

          <AnimatePresence>
            {pickerOpen && (
              <NodePickerPopover
                handle={handle}
                parentNodeId={parentNodeId}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Config Hint ──────────────────────────────────────────────────────────────

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
  if (data.backendType === "ai_agent") {
    const parts = [];
    if (c.agentType) parts.push(c.agentType.replace(/_/g, " "));
    if (c.model) parts.push(c.model);
    else if (c.provider) parts.push(c.provider);
    if (parts.length > 0) return parts.join(" · ");
  }
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
  if (data.backendType === "openrouter" && c.model) return c.model;
  if (data.backendType === "together" && c.model) return c.model;
  if (data.backendType === "perplexity" && c.model) return c.model;
  if (data.backendType === "xai" && c.model) return c.model;
  if (data.backendType === "fireworks" && c.model) return c.model;
  if (data.backendType === "cerebras" && c.model) return c.model;
  if (data.backendType === "ollama" && c.model) return c.model;
  if (data.backendType === "novita" && c.model) return c.model;
  if (data.backendType === "deepinfra" && c.model) return c.model;
  if (data.backendType === "hyperbolic" && c.model) return c.model;
  if (data.backendType === "telegram" && c.text) return c.text.slice(0, 40);
  if (data.backendType === "whatsapp" && c.to) return `→ ${c.to}`;
  if (data.backendType === "airtable" && c.tableName) return `${c.action || "create"} · ${c.tableName}`;
  if (data.backendType === "web_search" && c.query) return c.query.slice(0, 40);
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN NODE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

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
  const edges = useWorkspaceStore((s) => s.edges);
  const status = isExecutionLive ? getNodeStatus(id) : null;
  const { hasMappingWarning, warnings } = getMappingWarnings(id);

  const isTrigger = data.type === "trigger";
  const isAgent = data.backendType === "ai_agent";
  const configHint = getConfigHint(data);
  const isConfigured = !!(data.config && Object.keys(data.config).length > 0);

  const getHandleConnected = (handleId) =>
    edges.some((e) => e.target === id && e.targetHandle === handleId);

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

  if (hasMappingWarning && !status) borderClass = "border-amber-500/25";
  if (selected) borderClass = "border-zinc-600";

  const handlePlay = (e) => {
    e.stopPropagation();
    if (!isRunning && automationId) runEngine(automationId);
  };

  return (
    <div className="relative">
      {/* ── Main Card ───────────────────────────────────────────────────── */}
      <div
        className={`relative border ${borderClass} rounded-xl min-w-[260px] bg-zinc-900 transition-colors duration-150 overflow-hidden`}
      >
        {badge}

        {/* Accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-xl"
          style={{ backgroundColor: `rgba(${accent},0.35)` }}
        />

        {/* Input handle */}
        {!isTrigger && (
          <Handle
            type="target"
            position={Position.Left}
            id="input"
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
              {isAgent
                ? (data.config?.agentType || "tools agent").replace(/_/g, " ")
                : nodeDef.category}
            </span>
          </div>

          {/* Status indicator */}
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

        {/* Body */}
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
            <p className="text-[10px] text-red-400/70 truncate">{data.error}</p>
          )}
        </div>

        {/* Footer */}
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
          id="output"
          className="!w-4 !h-4 !bg-zinc-700 !border-2 !border-zinc-900 !rounded-full hover:!bg-zinc-400 active:!bg-zinc-300 transition-colors touch-none"
        />
      </div>

      {/* ── Bottom Handles — floating freely below the node ─────────────── */}
      {isAgent && (
        <div className="flex items-start justify-center gap-6 mt-3">
          {AI_AGENT_BOTTOM_HANDLES.map((h) => (
            <AgentBottomHandle
              key={h.id}
              handle={h}
              parentNodeId={id}
              hasConnection={getHandleConnected(h.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
