import { useEffect, useCallback, useRef, useState } from "react";
import { X, Zap, ChevronRight, ChevronDown, Settings2, HelpCircle, Play, CheckCircle, XCircle, Loader } from "lucide-react";
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

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function NodeConfigModal() {
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const updateNodeConfig = useWorkspaceStore((s) => s.updateNodeConfig);
  const [showDocs, setShowDocs] = useState(false);

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const isOpen = !!selectedNodeId && !!node;

  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState("{}");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

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

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Derived — safe to compute because AnimatePresence only renders children when isOpen=true
  const isTrigger = node?.data.type === "trigger";
  const variant = isTrigger && node?.data.config?.triggerVariant
    ? TRIGGER_VARIANTS[node.data.config.triggerVariant]
    : null;
  const nodeDef = node ? NodeRegistry[node.data.backendType] : null;
  const def = variant || nodeDef;

  const Icon = def?.icon;
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
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setSelectedNodeId(null)}
          />

          {/* Modal card */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-6"
          >
            <div
              className="pointer-events-auto w-full max-w-[920px] h-[82vh] max-h-[720px] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/70"
              style={{
                background: "linear-gradient(160deg, #1a1a1e 0%, #141416 100%)",
                border: `1px solid rgba(${accent},0.18)`,
                boxShadow: `0 0 0 1px rgba(${accent},0.08), 0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* ── Top bar ── */}
              <div
                className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06] shrink-0"
                style={{ background: `rgba(${accent},0.04)` }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `rgba(${accent},0.12)`,
                    boxShadow: `0 0 16px rgba(${accent},0.12)`,
                  }}
                >
                  {Icon && <Icon className={`w-5 h-5 ${colorClass}`} strokeWidth={1.5} />}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold text-zinc-100 tracking-tight truncate">{label}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-zinc-600 font-mono">{node.data.backendType}</span>
                    {isTrigger && (
                      <>
                        <ChevronRight className="w-2.5 h-2.5 text-zinc-700" />
                        <span className="text-[10px] text-zinc-600">trigger</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Test node button */}
                {!node?.data.type === "trigger" || node?.data.backendType !== "trigger" ? (
                  <button
                    onClick={() => { setTestOpen(v => !v); setTestResult(null); }}
                    title="Test this node"
                    className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-semibold transition-all ${testOpen ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.07]"}`}
                  >
                    <Play className="w-3 h-3" strokeWidth={2.5} />
                    Test
                  </button>
                ) : null}

                {/* Docs toggle */}
                {NODE_DOCS[node.data.backendType] && (
                  <button
                    onClick={() => setShowDocs((v) => !v)}
                    title="Node documentation"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${showDocs ? "text-blue-400 bg-blue-500/10" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.07]"}`}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.07] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Two-column body ── */}
              {/* ── Docs panel ── */}
              <AnimatePresence>
                {showDocs && NODE_DOCS[node.data.backendType] && (() => {
                  const doc = NODE_DOCS[node.data.backendType];
                  return (
                    <motion.div
                      key="docs-panel"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-b border-white/[0.05]"
                    >
                      <div className="p-5 space-y-3 bg-zinc-900/50">
                        <p className="text-xs text-zinc-400 leading-relaxed">{doc.description}</p>
                        {doc.inputs?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Inputs</p>
                            <div className="space-y-1">
                              {doc.inputs.map((inp) => (
                                <div key={inp.name} className="flex items-start gap-2 text-[10px]">
                                  <code className="text-zinc-300 font-mono shrink-0">{inp.name}</code>
                                  <span className="text-zinc-700">·</span>
                                  <span className="text-blue-400 shrink-0">{inp.type}</span>
                                  <span className="text-zinc-600">{inp.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {doc.outputs?.length > 0 && (
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Outputs</p>
                            <div className="space-y-1">
                              {doc.outputs.map((out) => (
                                <div key={out.name} className="flex items-start gap-2 text-[10px]">
                                  <code className="text-emerald-400 font-mono shrink-0">{out.name}</code>
                                  <span className="text-zinc-700">·</span>
                                  <span className="text-blue-400 shrink-0">{out.type}</span>
                                  <span className="text-zinc-600">{out.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              <div className="flex flex-1 min-h-0">

                {/* LEFT — config inputs */}
                <div className="flex-1 min-w-0 overflow-y-auto border-r border-white/[0.05] p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Configuration</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>

                  {ConfigPanel ? (
                    <div className="flex justify-center">
                      <div className="w-full max-w-[320px]">
                        <ConfigPanelWrapper
                          Panel={ConfigPanel}
                          config={config}
                          updateConfig={updateConfig}
                          selected={true}
                          nodeId={selectedNodeId}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                      <Zap className="w-8 h-8 text-zinc-700 mb-3" strokeWidth={1.5} />
                      <p className="text-sm text-zinc-500">No configuration needed</p>
                      <p className="text-xs text-zinc-700 mt-1">This node works automatically</p>
                    </div>
                  )}

                  {/* ── Advanced Settings ── */}
                  {!isTrigger && <AdvancedSettings retryPolicy={retryPolicy} updateRetryPolicy={updateRetryPolicy} timeoutMs={config.timeoutMs} onTimeoutChange={(v) => updateConfig('timeoutMs', v)} />}

                  {/* ── Test Panel ── */}
                  <AnimatePresence>
                    {testOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden w-full max-w-[320px] mx-auto"
                      >
                        <div className="mt-2 p-4 bg-[#0d0d0f] border border-emerald-500/15 rounded-xl flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Test Node</span>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5 block">Input JSON</label>
                            <textarea
                              value={testInput}
                              onChange={e => setTestInput(e.target.value)}
                              rows={4}
                              className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/40 resize-none transition-colors"
                              placeholder='{"query": "hello world"}'
                            />
                          </div>
                          <button
                            onClick={runTest}
                            disabled={testLoading}
                            className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500/15 transition-all disabled:opacity-50"
                          >
                            {testLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" strokeWidth={2.5} />}
                            {testLoading ? "Running…" : "Run Test"}
                          </button>
                          {testResult && (
                            <div className={`rounded-lg border p-3 ${testResult.success ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/20"}`}>
                              <div className="flex items-center gap-1.5 mb-2">
                                {testResult.success
                                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                  : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                <span className={`text-[10px] font-bold ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>
                                  {testResult.success ? `Success · ${testResult.durationMs}ms` : "Failed"}
                                </span>
                              </div>
                              <pre className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto leading-relaxed">
                                {testResult.success
                                  ? JSON.stringify(testResult.output, null, 2)
                                  : testResult.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* RIGHT — output variables */}
                <div className="w-[320px] shrink-0 overflow-y-auto flex flex-col">
                  <div className="px-5 pt-5 pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Output fields</span>
                      <div className="flex-1 h-px bg-white/[0.04]" />
                    </div>
                    <p className="text-[10px] text-zinc-700 mt-2 leading-relaxed">
                      Copy these into downstream nodes to reference this node's output.
                    </p>
                  </div>

                  <div className="flex-1 px-2 pb-4">
                    {outputSchema.map((v) => (
                      <VarRow key={v.path} {...v} />
                    ))}
                  </div>

                  {/* Node ID reference */}
                  <div className="px-5 py-4 border-t border-white/[0.04] shrink-0">
                    <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest mb-1.5">Node ID</p>
                    <code className="text-[10px] font-mono text-zinc-500 break-all">{selectedNodeId}</code>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
