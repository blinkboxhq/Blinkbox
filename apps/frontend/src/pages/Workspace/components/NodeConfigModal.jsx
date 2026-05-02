import { useEffect, useCallback, useRef, useState } from "react";
import { X, Zap, ChevronDown, Settings2, HelpCircle, Play, CheckCircle, XCircle, Loader, Braces, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";
import { NODE_DOCS } from "../../../lib/nodeDocumentation";
import api from "../../../lib/api";

// ── Per-trigger output variable schemas ──────────────────────────────────────
const TRIGGER_OUTPUT_SCHEMA = {
  manual: [
    { path: "$trigger.body",    type: "object",  note: "Any payload POSTed to the run endpoint" },
  ],
  webhook: [
    { path: "$trigger.body",    type: "object",  note: "Raw request body (JSON or form)" },
    { path: "$trigger.query",   type: "object",  note: "URL query string params" },
    { path: "$trigger.headers", type: "object",  note: "HTTP request headers" },
    { path: "$trigger.method",  type: "string",  note: "HTTP verb: GET / POST / …" },
  ],
  chat: [
    { path: "$trigger.body.message",   type: "string",  note: "User's chat message" },
    { path: "$trigger.body.sessionId", type: "string",  note: "Conversation thread ID" },
    { path: "$trigger.systemPrompt",   type: "string",  note: "System prompt set in Setup" },
    { path: "$trigger.body",           type: "object",  note: "Full raw payload" },
  ],
  cron: [
    { path: "$trigger.firedAt",  type: "string",  note: "ISO timestamp when the job ran" },
    { path: "$trigger.schedule", type: "string",  note: "Cron expression that fired" },
  ],
  email: [
    { path: "$trigger.body.from",    type: "string",  note: "Sender address" },
    { path: "$trigger.body.subject", type: "string",  note: "Email subject" },
    { path: "$trigger.body.text",    type: "string",  note: "Plain-text body" },
    { path: "$trigger.body.html",    type: "string",  note: "HTML body" },
    { path: "$trigger.body",         type: "object",  note: "Full parsed email payload" },
  ],
  imap: [
    { path: "$trigger.email.from",      type: "string",  note: "Sender address" },
    { path: "$trigger.email.subject",   type: "string",  note: "Email subject" },
    { path: "$trigger.email.text",      type: "string",  note: "Plain-text body" },
    { path: "$trigger.email.date",      type: "string",  note: "ISO date received" },
    { path: "$trigger.email.messageId", type: "string",  note: "Unique message ID" },
    { path: "$trigger.email",           type: "object",  note: "Full email object" },
  ],
  rss: [
    { path: "$trigger.item.title",       type: "string",  note: "Article / entry title" },
    { path: "$trigger.item.link",        type: "string",  note: "URL to the full article" },
    { path: "$trigger.item.description", type: "string",  note: "Excerpt or summary" },
    { path: "$trigger.item.pubDate",     type: "string",  note: "Publication date (ISO)" },
    { path: "$trigger.item.guid",        type: "string",  note: "Unique item identifier" },
    { path: "$trigger.item",             type: "object",  note: "Full feed item" },
  ],
  database: [
    { path: "$trigger.row",              type: "object",  note: "Full new / updated row" },
    { path: "$trigger.row.<column>",     type: "any",     note: "Any column value by name" },
    { path: "$trigger.table",            type: "string",  note: "Table that was watched" },
    { path: "$trigger.polledAt",         type: "string",  note: "ISO timestamp of poll run" },
  ],
  github: [
    { path: "$trigger.body",            type: "object",  note: "Full GitHub event payload" },
    { path: "$trigger.body.action",     type: "string",  note: "Event action (e.g. opened)" },
    { path: "$trigger.body.repository", type: "object",  note: "Repo metadata" },
    { path: "$trigger.body.sender",     type: "object",  note: "User who triggered the event" },
    { path: "$trigger.event",           type: "string",  note: "X-GitHub-Event header value" },
  ],
  stripe: [
    { path: "$trigger.body",               type: "object",  note: "Full Stripe event object" },
    { path: "$trigger.body.type",          type: "string",  note: "Event type, e.g. payment_intent.succeeded" },
    { path: "$trigger.body.data.object",   type: "object",  note: "The Stripe resource that changed" },
    { path: "$trigger.body.livemode",      type: "boolean", note: "true = production, false = test" },
  ],
  error: [
    { path: "$trigger.error.message",     type: "string",  note: "Error message from the failed node" },
    { path: "$trigger.error.nodeId",      type: "string",  note: "ID of the node that failed" },
    { path: "$trigger.error.nodeType",    type: "string",  note: "Type of the node that failed" },
    { path: "$trigger.error.automationId",type: "string",  note: "Automation that failed" },
    { path: "$trigger.error.executionId", type: "string",  note: "Execution run ID" },
    { path: "$trigger.error.failedAt",    type: "string",  note: "ISO timestamp of failure" },
    { path: "$trigger.error",             type: "object",  note: "Full error context object" },
  ],
};

// Fallback for nodes with no known schema
const GENERIC_ACTION_SCHEMA = [
  { path: "output",  type: "any",    note: "Full output of this node" },
  { path: "success", type: "boolean",note: "Whether this node succeeded" },
];

/** Convert a DEFAULT_SCHEMAS entry into VarRow props */
function schemaToRows(schema, nodeId) {
  if (!schema || typeof schema !== "object") return GENERIC_ACTION_SCHEMA;
  // Special markers — passthrough/dynamic have no fixed shape
  if (schema._passthrough || schema._dynamic) return GENERIC_ACTION_SCHEMA;

  return Object.entries(schema)
    .filter(([k]) => !k.startsWith("_"))
    .map(([key, type]) => ({
      path: `{{${nodeId}.${key}}}`,
      type: typeof type === "string" ? type : "object",
      note: "",
    }));
}

// ── Type badge colors ────────────────────────────────────────────────────────
const TYPE_COLORS = {
  string:  { bg: "bg-emerald-500/10", text: "text-emerald-400",  border: "border-emerald-500/20" },
  object:  { bg: "bg-blue-500/10",    text: "text-blue-400",     border: "border-blue-500/20"   },
  array:   { bg: "bg-violet-500/10",  text: "text-violet-400",   border: "border-violet-500/20" },
  boolean: { bg: "bg-amber-500/10",   text: "text-amber-400",    border: "border-amber-500/20"  },
  number:  { bg: "bg-orange-500/10",  text: "text-orange-400",   border: "border-orange-500/20" },
  any:     { bg: "bg-zinc-500/10",    text: "text-zinc-400",     border: "border-zinc-500/20"   },
};

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.any;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      {type}
    </span>
  );
}

// ── Variable row ─────────────────────────────────────────────────────────────
function VarRow({ path, type, note }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors rounded-lg group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-[11px] font-mono text-zinc-200 group-hover:text-white transition-colors break-all">
            {path}
          </code>
          <TypeBadge type={type} />
        </div>
        {note && (
          <p className="text-[10px] text-zinc-600 mt-0.5 leading-relaxed">{note}</p>
        )}
      </div>
    </div>
  );
}

// ── Node Config Sidebar ───────────────────────────────────────────────────────
export default function NodeConfigModal() {
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const updateNodeConfig = useWorkspaceStore((s) => s.updateNodeConfig);

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const isOpen = !!selectedNodeId && !!node;

  const [activeTab, setActiveTab] = useState("settings");
  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState("{}");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  // Reset tab when switching nodes
  useEffect(() => { setActiveTab("settings"); setTestOpen(false); setTestResult(null); }, [selectedNodeId]);

  const runTest = useCallback(async () => {
    if (!node) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      let parsedInput = {};
      try { parsedInput = JSON.parse(testInput); } catch { parsedInput = { raw: testInput }; }
      const res = await api.post("/api/automation/test-node", {
        nodeType: node.data.backendType,
        config: node.data.config || {},
        input: parsedInput,
      });
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setTestLoading(false);
    }
  }, [node, testInput]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const isTrigger = node?.data.type === "trigger";
  const variant = isTrigger && node?.data.config?.triggerVariant
    ? TRIGGER_VARIANTS[node.data.config.triggerVariant]
    : null;
  const nodeDef = node ? NodeRegistry[node.data.backendType] : null;
  const def = variant || nodeDef;

  const Icon = def?.icon;
  const logoUrl = variant?.logoUrl || nodeDef?.logoUrl;
  const imgFilter = variant?.imgFilter || nodeDef?.imgFilter;
  const accent = def?.accentColor || "161,161,170";
  const colorClass = def?.colorClass || "text-zinc-400";
  const label = variant?.label || nodeDef?.label || node?.data.label || node?.data.backendType || "";

  const ConfigPanel = variant?.ConfigPanel || nodeDef?.ConfigPanel;

  const triggerVariantKey = node?.data.config?.triggerVariant;
  let outputSchema;
  if (isTrigger) {
    outputSchema = TRIGGER_OUTPUT_SCHEMA[triggerVariantKey] || TRIGGER_OUTPUT_SCHEMA[node?.data.backendType] || GENERIC_ACTION_SCHEMA;
  } else {
    const backendType = node?.data.backendType;
    const defaultSchema = backendType ? DEFAULT_SCHEMAS[backendType] : null;
    outputSchema = schemaToRows(defaultSchema, selectedNodeId);
  }

  const updateConfig = (key, value) => updateNodeConfig(selectedNodeId, key, value);
  const config = node?.data.config || {};
  const retryPolicy = config.retryPolicy || {};
  const updateRetryPolicy = (field, value) => updateConfig('retryPolicy', { ...retryPolicy, [field]: value });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="sidebar"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="fixed right-0 top-0 bottom-0 z-30 flex flex-col"
          style={{
            width: 400,
            background: "linear-gradient(180deg, #141416 0%, #111113 100%)",
            borderLeft: `1px solid rgba(${accent},0.15)`,
            boxShadow: `-8px 0 40px rgba(0,0,0,0.6), inset 1px 0 0 rgba(255,255,255,0.03)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center gap-3 px-4 py-4 shrink-0 border-b border-white/[0.06]"
            style={{ background: `rgba(${accent},0.03)` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{ backgroundColor: `rgba(${accent},0.12)` }}
            >
              {logoUrl
                ? <img src={logoUrl} alt={label} className="w-5 h-5 object-contain" style={imgFilter ? { filter: imgFilter } : undefined} />
                : Icon && <Icon className={`w-4.5 h-4.5 ${colorClass}`} strokeWidth={1.5} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-zinc-100 truncate leading-tight">{label}</p>
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5 truncate">{node.data.backendType}</p>
            </div>
            {/* Docs */}
            {NODE_DOCS[node.data.backendType] && (
              <button
                onClick={() => setShowDocs(v => !v)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${showDocs ? "text-blue-400 bg-blue-500/10" : "text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06]"}`}
                title="Docs"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Close */}
            <button
              onClick={() => setSelectedNodeId(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-white/[0.06] transition-all shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Docs band ── */}
          <AnimatePresence>
            {showDocs && NODE_DOCS[node.data.backendType] && (() => {
              const doc = NODE_DOCS[node.data.backendType];
              return (
                <motion.div
                  key="docs"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b border-white/[0.05] shrink-0"
                >
                  <div className="p-4 space-y-2 bg-zinc-900/40">
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{doc.description}</p>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0">
            <TabBtn id="settings" active={activeTab} onClick={setActiveTab} icon={SlidersHorizontal} label="Settings" />
            <TabBtn id="events" active={activeTab} onClick={setActiveTab} icon={Braces} label="Output Events" />
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto sidebar-scroll">

            {/* ──── SETTINGS TAB ──── */}
            {activeTab === "settings" && (
              <div className="flex flex-col gap-4 p-4">

                {ConfigPanel ? (
                  <ConfigPanelWrapper
                    Panel={ConfigPanel}
                    config={config}
                    updateConfig={updateConfig}
                    selected={true}
                    nodeId={selectedNodeId}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <Zap className="w-7 h-7 text-zinc-700 mb-2.5" strokeWidth={1.5} />
                    <p className="text-[13px] text-zinc-500">No configuration needed</p>
                    <p className="text-[11px] text-zinc-700 mt-1">This node works automatically</p>
                  </div>
                )}

                {/* Advanced */}
                {!isTrigger && (
                  <AdvancedSettings
                    retryPolicy={retryPolicy}
                    updateRetryPolicy={updateRetryPolicy}
                    timeoutMs={config.timeoutMs}
                    onTimeoutChange={(v) => updateConfig('timeoutMs', v)}
                  />
                )}

                {/* Test node */}
                {!isTrigger && (
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => { setTestOpen(v => !v); setTestResult(null); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-white/[0.03] transition-colors group"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                      <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors flex-1">Test this node</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 ${testOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {testOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-white/[0.05]"
                        >
                          <div className="p-4 flex flex-col gap-3">
                            <div>
                              <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5 block">Input JSON</label>
                              <textarea
                                value={testInput}
                                onChange={e => setTestInput(e.target.value)}
                                rows={3}
                                className="w-full bg-[#0d0d0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/40 resize-none transition-colors"
                                placeholder='{"query": "hello world"}'
                              />
                            </div>
                            <button
                              onClick={runTest}
                              disabled={testLoading}
                              className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500/15 transition-all disabled:opacity-50"
                            >
                              {testLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" strokeWidth={2.5} />}
                              {testLoading ? "Running…" : "Run Test"}
                            </button>
                            {testResult && (
                              <div className={`rounded-lg border p-3 ${testResult.success ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/20"}`}>
                                <div className="flex items-center gap-1.5 mb-2">
                                  {testResult.success ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                  <span className={`text-[10px] font-bold ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>
                                    {testResult.success ? `Success · ${testResult.durationMs}ms` : "Failed"}
                                  </span>
                                </div>
                                <pre className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap break-all max-h-40 overflow-y-auto leading-relaxed">
                                  {testResult.success ? JSON.stringify(testResult.output, null, 2) : testResult.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

            {/* ──── EVENTS TAB ──── */}
            {activeTab === "events" && (
              <div className="flex flex-col">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Use these in downstream nodes to reference this node&apos;s output.
                  </p>
                </div>
                <div className="px-2 pb-4">
                  {outputSchema.length > 0
                    ? outputSchema.map((v) => <VarRow key={v.path} {...v} />)
                    : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Braces className="w-7 h-7 text-zinc-700 mb-2.5" strokeWidth={1.5} />
                        <p className="text-[13px] text-zinc-500">No output schema yet</p>
                        <p className="text-[11px] text-zinc-700 mt-1">Run this node to see its output fields</p>
                      </div>
                    )
                  }
                </div>
                <div className="px-4 py-3 border-t border-white/[0.04] mx-4 mb-4">
                  <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest mb-1">Node ID</p>
                  <code className="text-[10px] font-mono text-zinc-600 break-all">{selectedNodeId}</code>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TabBtn({ id, active, onClick, icon: Icon, label }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
        isActive
          ? "bg-white/[0.08] text-zinc-100"
          : "text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]"
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
      {label}
    </button>
  );
}

// ── Wrapper strips Handle/Position props that only work inside ReactFlow ─────
function ConfigPanelWrapper({ Panel, config, updateConfig, selected, nodeId }) {
  const ref = useRef(null);
  return (
    <div ref={ref} className="config-panel-wrapper [&_.react-flow\_\_handle]:hidden">
      <Panel config={config} updateConfig={updateConfig} selected={selected} nodeId={nodeId} />
    </div>
  );
}

// ── Advanced Settings Panel ───────────────────────────────────────────────────
function AdvancedSettings({ retryPolicy, updateRetryPolicy, timeoutMs, onTimeoutChange }) {
  const [open, setOpen] = useState(false);

  const onFailureBehavior = retryPolicy.retryOnFailure === false ? 'error_path' : (retryPolicy.maxAttempts === 1 ? 'no_retry' : 'retry');
  const setOnFailureBehavior = (val) => {
    if (val === 'error_path') updateRetryPolicy('retryOnFailure', false);
    else if (val === 'no_retry') { updateRetryPolicy('retryOnFailure', true); updateRetryPolicy('maxAttempts', 1); }
    else { updateRetryPolicy('retryOnFailure', true); updateRetryPolicy('maxAttempts', retryPolicy.maxAttempts || 3); }
  };

  return (
    <div className="w-full max-w-[320px] mx-auto mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors group"
      >
        <Settings2 className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest group-hover:text-zinc-400 transition-colors flex-1">Advanced Settings</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 p-4 bg-[#0d0d0f] border border-white/[0.06] rounded-xl flex flex-col gap-4">
          {/* Timeout */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Timeout (ms)</label>
            <input
              type="number"
              min={1000}
              max={3600000}
              step={1000}
              value={timeoutMs || 60000}
              onChange={(e) => onTimeoutChange(Number(e.target.value))}
              className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <p className="text-[9px] text-zinc-600">How long before this node times out. Default: 60000ms (60s).</p>
          </div>

          {/* On-failure behavior */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">On Failure</label>
            <select
              value={onFailureBehavior}
              onChange={(e) => setOnFailureBehavior(e.target.value)}
              className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="retry">Retry then stop workflow</option>
              <option value="no_retry">Stop immediately (no retry)</option>
              <option value="error_path">Continue to error path</option>
            </select>
          </div>

          {/* Max retries (only if not error_path or no_retry) */}
          {onFailureBehavior === 'retry' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Max Retries</label>
              <input
                type="number"
                min={1}
                max={10}
                value={retryPolicy.maxAttempts || 3}
                onChange={(e) => updateRetryPolicy('maxAttempts', Number(e.target.value))}
                className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          )}

          {/* Backoff coefficient */}
          {onFailureBehavior === 'retry' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Backoff Multiplier</label>
              <input
                type="number"
                min={1}
                max={5}
                step={0.5}
                value={retryPolicy.backoffCoefficient || 2}
                onChange={(e) => updateRetryPolicy('backoffCoefficient', Number(e.target.value))}
                className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Each retry waits longer by this factor (e.g. 2 = 1s, 2s, 4s…).</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
