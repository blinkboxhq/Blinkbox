import { useEffect, useCallback, useRef, useState } from "react";
import { X, ChevronDown, Settings2, Play, CheckCircle, XCircle, Loader, Hash, Box, ToggleLeft, ListOrdered, Type, HelpCircle, Braces, Table2, Code2, ChevronRight, AlertCircle, Clock, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";
import { NODE_DOCS } from "../../../lib/nodeDocumentation";
import api from "../../../lib/api";
import { TRIGGER_ACTIONS } from '../triggerActions';

// ── Per-trigger available actions/events ─────────────────────────────────────


const GENERIC_ACTION_SCHEMA = [
  { path: "output",  type: "any",    note: "Full output of this node" },
  { path: "success", type: "boolean",note: "Whether this node succeeded" },
];

function schemaToRows(schema, nodeId) {
  if (!schema || typeof schema !== "object") return GENERIC_ACTION_SCHEMA;
  if (schema._passthrough || schema._dynamic) return GENERIC_ACTION_SCHEMA;
  return Object.entries(schema)
    .filter(([k]) => !k.startsWith("_"))
    .map(([key, type]) => ({
      path: `{{${nodeId}.${key}}}`,
      type: typeof type === "string" ? type : "object",
      note: "",
    }));
}

// Group flat schema rows into labeled sections by path prefix
function groupSchema(rows) {
  const groups = {};
  for (const row of rows) {
    // Extract group from path: "$trigger.body.x" → "body", "{{id.result}}" → "output"
    const clean = row.path.replace(/^\{\{[^}]+\}\./, "").replace(/^\$trigger\./, "");
    const seg = clean.split(".")[0].replace(/<[^>]+>/, "").toUpperCase() || "DATA";
    const label = seg + " DATA";
    if (!groups[label]) groups[label] = [];
    groups[label].push(row);
  }
  // Collapse single-item groups into "OUTPUT DATA"
  const entries = Object.entries(groups);
  if (entries.length === 1) return [{ label: entries[0][0], rows: entries[0][1] }];
  return entries.map(([label, rows]) => ({ label, rows }));
}

// Type icon
function TypeIcon({ type }) {
  const cls = "w-3.5 h-3.5 shrink-0";
  if (type === "string")  return <Type className={`${cls} text-emerald-400`} strokeWidth={2} />;
  if (type === "object")  return <Box className={`${cls} text-blue-400`} strokeWidth={2} />;
  if (type === "array")   return <ListOrdered className={`${cls} text-violet-400`} strokeWidth={2} />;
  if (type === "boolean") return <ToggleLeft className={`${cls} text-amber-400`} strokeWidth={2} />;
  if (type === "number")  return <Hash className={`${cls} text-orange-400`} strokeWidth={2} />;
  return <Braces className={`${cls} text-zinc-500`} strokeWidth={2} />;
}

// ── Output Data Viewer (n8n-style) ────────────────────────────────────────────
function OutputDataViewer({ data }) {
  const [viewMode, setViewMode] = useState("table"); // "table" | "json"
  const [expandedItem, setExpandedItem] = useState(0);

  const items = Array.isArray(data) ? data : (data ? [data] : []);
  const isEmpty = items.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
          <Layers className="w-5 h-5 text-zinc-600" />
        </div>
        <p className="text-[13px] font-semibold text-zinc-500">No output data</p>
        <p className="text-[11px] text-zinc-700 mt-1">Run the workflow to see output here</p>
      </div>
    );
  }

  const currentItem = items[expandedItem] ?? items[0];
  const jsonObj = currentItem?.json ?? currentItem ?? {};
  const fields = Object.entries(jsonObj);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#252527] shrink-0">
        <div className="flex items-center gap-1 bg-[#111] rounded-lg p-0.5 border border-[#2a2a2d]">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${viewMode === "table" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Table2 className="w-3 h-3" /> Table
          </button>
          <button
            onClick={() => setViewMode("json")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${viewMode === "json" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Code2 className="w-3 h-3" /> JSON
          </button>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Item selector — only shown when > 1 item */}
      {items.length > 1 && (
        <div className="flex gap-1 px-5 py-2 overflow-x-auto shrink-0 border-b border-[#252527]">
          {items.slice(0, 20).map((_, i) => (
            <button
              key={i}
              onClick={() => setExpandedItem(i)}
              className={`shrink-0 w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                i === expandedItem ? "bg-zinc-700 text-white" : "bg-[#1a1a1c] text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {i + 1}
            </button>
          ))}
          {items.length > 20 && (
            <span className="text-[10px] text-zinc-600 self-center ml-1">+{items.length - 20} more</span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {viewMode === "table" ? (
          <div className="px-5 py-3">
            {fields.length === 0 ? (
              <p className="text-[11px] text-zinc-600 text-center py-4">Empty object</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {fields.map(([key, value]) => {
                  const isObj = typeof value === "object" && value !== null;
                  const display = isObj ? JSON.stringify(value) : String(value ?? "");
                  const typeLabel = Array.isArray(value) ? "array" : typeof value;
                  const typeColors = {
                    string: "text-emerald-400",
                    number: "text-orange-400",
                    boolean: "text-amber-400",
                    object: "text-blue-400",
                    array: "text-violet-400",
                  };
                  return (
                    <div key={key} className="flex items-start gap-3 py-2 px-3 rounded-xl hover:bg-[#1e1e22] transition-colors group">
                      <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 shrink-0 ${typeColors[typeLabel] || "text-zinc-500"}`}>
                        {typeLabel.slice(0, 3)}
                      </span>
                      <span className="text-[12px] font-semibold text-zinc-400 shrink-0 min-w-[80px] max-w-[100px] truncate">{key}</span>
                      <span className={`text-[12px] font-mono flex-1 min-w-0 truncate ${isObj ? "text-zinc-500 italic" : "text-zinc-200"}`}>
                        {display.length > 60 ? display.slice(0, 60) + "…" : display}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-3">
            <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
              <JsonHighlight data={jsonObj} />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function JsonHighlight({ data }) {
  const json = JSON.stringify(data, null, 2);
  const lines = json.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const keyMatch = line.match(/^(\s*)("[\w-]+")(:\s*)(.*)/);
        if (keyMatch) {
          const [, indent, key, colon, val] = keyMatch;
          const isStr = val.startsWith('"');
          const isNum = /^-?\d/.test(val);
          const isBool = val === "true," || val === "false," || val === "true" || val === "false";
          const isNull = val === "null," || val === "null";
          return (
            <span key={i}>
              {indent}
              <span className="text-violet-300">{key}</span>
              {colon}
              <span className={isStr ? "text-emerald-300" : isNum ? "text-orange-300" : isBool ? "text-amber-300" : isNull ? "text-zinc-500" : "text-zinc-300"}>
                {val}
              </span>
              {"\n"}
            </span>
          );
        }
        return <span key={i}>{line}{"\n"}</span>;
      })}
    </>
  );
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
export default function NodeConfigModal() {
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const updateNodeConfig = useWorkspaceStore((s) => s.updateNodeConfig);
  const lastRunOutputs = useWorkspaceStore((s) => s.lastRunOutputs);
  const nodeStatuses = useWorkspaceStore((s) => s.nodeStatuses);

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const isOpen = !!selectedNodeId && !!node;

  const [activeTab, setActiveTab] = useState("config"); // "config" | "output"
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState("{}");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const nodeOutput = lastRunOutputs?.[selectedNodeId];
  const nodeStatus = nodeStatuses?.[selectedNodeId];

  useEffect(() => {
    setSettingsOpen(false);
    setTestOpen(false);
    setTestResult(null);
    setActiveTab("config");
  }, [selectedNodeId]);

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
  const triggerActions = isTrigger
    ? (TRIGGER_ACTIONS[triggerVariantKey] || TRIGGER_ACTIONS[node?.data.backendType] || [])
    : null;

  let rawSchema;
  if (!isTrigger) {
    const backendType = node?.data.backendType;
    const defaultSchema = backendType ? DEFAULT_SCHEMAS[backendType] : null;
    rawSchema = schemaToRows(defaultSchema, selectedNodeId);
  }
  const groups = rawSchema ? groupSchema(rawSchema) : [];
  const totalCount = isTrigger ? triggerActions.length : (rawSchema?.length ?? 0);

  const updateConfig = (key, value) => updateNodeConfig(selectedNodeId, key, value);
  const config = node?.data.config || {};
  const selectedAction = config.selectedAction || null;
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
            width: 380,
            background: "#1a1a1c",
            borderLeft: "1px solid #2a2a2d",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="shrink-0 border-b border-[#252527]">
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: `rgba(${accent},0.12)` }}
              >
                {logoUrl
                  ? <img src={logoUrl} alt={label} className="w-5 h-5 object-contain" style={imgFilter ? { filter: imgFilter } : undefined} />
                  : Icon && <Icon className={`w-4 h-4 ${colorClass}`} strokeWidth={1.5} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white truncate leading-tight">{label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-[#666] font-mono">{isTrigger ? "trigger" : "action"}</p>
                  {nodeStatus === "completed" && (
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> Success
                    </span>
                  )}
                  {nodeStatus === "failed" && (
                    <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" /> Failed
                    </span>
                  )}
                  {nodeStatus === "running" && (
                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Loader className="w-2.5 h-2.5 animate-spin" /> Running
                    </span>
                  )}
                </div>
              </div>
              {NODE_DOCS[node.data.backendType] && (
                <button
                  onClick={() => setShowDocs(v => !v)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${showDocs ? "text-blue-400 bg-blue-500/10" : "text-[#555] hover:text-[#aaa] hover:bg-white/[0.05]"}`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setSelectedNodeId(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555] hover:text-white hover:bg-white/[0.06] transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-0 px-5 pb-0">
              {["config", "output"].map((tab) => {
                const isActive = activeTab === tab;
                const hasOutput = tab === "output" && nodeOutput;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold border-b-2 transition-all ${
                      isActive
                        ? "border-white text-white"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab === "config" ? (
                      <><Settings2 className="w-3 h-3" /> Configure</>
                    ) : (
                      <>
                        <Layers className="w-3 h-3" />
                        Output
                        {hasOutput && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${
                            nodeStatus === "failed" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            {Array.isArray(nodeOutput) ? nodeOutput.length : 1}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
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
                  className="overflow-hidden border-b border-[#252527] shrink-0"
                >
                  <p className="text-[11px] text-[#888] leading-relaxed px-5 py-3">{doc.description}</p>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* ── Output tab content ── */}
          {activeTab === "output" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <OutputDataViewer data={nodeOutput} />
            </div>
          )}

          {/* ── Config tab content ── */}
          {activeTab === "config" && <div className="flex-1 overflow-y-auto sidebar-scroll">

            {/* ── Actions / Output section (primary) ── */}
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-white">
                  {isTrigger ? "Actions" : "Output Events"}
                  <span className="text-[#555] font-normal ml-2">({totalCount})</span>
                </span>
                <ChevronDown className="w-4 h-4 text-[#555]" />
              </div>
            </div>

            {isTrigger ? (
              <div className="px-5 pb-2">
                {triggerActions.length === 0 ? (
                  <p className="text-[12px] text-[#555] py-4 text-center">No actions configured</p>
                ) : (
                  <div className="flex flex-col">
                    {triggerActions.map((action) => (
                      <ActionRow
                        key={action.name}
                        name={action.name}
                        description={action.description}
                        selected={selectedAction === action.name}
                        onSelect={() => updateConfig("selectedAction", action.name)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="px-5 py-2">
                  <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.1em] mb-2 mt-2">
                    {group.label}
                  </p>
                  <div className="flex flex-col">
                    {group.rows.map((row) => (
                      <EventRow key={row.path} path={row.path} type={row.type} note={row.note} nodeDef={def} logoUrl={logoUrl} imgFilter={imgFilter} Icon={Icon} colorClass={colorClass} />
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* ── Settings (collapsible) ── */}
            <div className="px-5 pt-4 pb-2 mt-2 border-t border-[#252527]">
              <button
                onClick={() => setSettingsOpen(v => !v)}
                className="flex items-center gap-2 w-full text-left group"
              >
                <Settings2 className="w-3.5 h-3.5 text-[#555] group-hover:text-[#aaa] transition-colors shrink-0" />
                <span className="text-[13px] font-semibold text-[#777] group-hover:text-[#bbb] transition-colors flex-1">Settings</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#555] transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 flex flex-col gap-4">
                    {ConfigPanel ? (
                      <ConfigPanelWrapper
                        Panel={ConfigPanel}
                        config={config}
                        updateConfig={updateConfig}
                        selected={true}
                        nodeId={selectedNodeId}
                      />
                    ) : (
                      <p className="text-[12px] text-[#555] py-4 text-center">No configuration needed</p>
                    )}

                    {!isTrigger && (
                      <AdvancedSettings
                        retryPolicy={retryPolicy}
                        updateRetryPolicy={updateRetryPolicy}
                        timeoutMs={config.timeoutMs}
                        onTimeoutChange={(v) => updateConfig('timeoutMs', v)}
                      />
                    )}

                    {!isTrigger && (
                      <div className="rounded-xl border border-[#2a2a2d] overflow-hidden">
                        <button
                          onClick={() => { setTestOpen(v => !v); setTestResult(null); }}
                          className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-white/[0.03] transition-colors group"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                          <span className="text-[11px] font-semibold text-[#888] group-hover:text-white transition-colors flex-1">Test this node</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-[#555] transition-transform ${testOpen ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {testOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-[#2a2a2d]"
                            >
                              <div className="p-4 flex flex-col gap-3">
                                <textarea
                                  value={testInput}
                                  onChange={e => setTestInput(e.target.value)}
                                  rows={3}
                                  className="w-full bg-[#111] border border-[#2a2a2d] rounded-lg px-3 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/40 resize-none"
                                  placeholder='{"query": "hello world"}'
                                />
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
                                    <pre className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Node ID footer */}
            <div className="px-5 py-4 border-t border-[#252527] mt-2">
              <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest mb-1">Node ID</p>
              <code className="text-[10px] font-mono text-[#555] break-all">{selectedNodeId}</code>
            </div>
          </div>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Action row — trigger event type card ─────────────────────────────────────
function ActionRow({ name, description, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-start gap-3 py-3 border-b border-[#1e1e20] last:border-0 cursor-pointer rounded-lg px-2 -mx-2 transition-all duration-100 ${
        selected ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
      }`}
    >
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-[2px] shrink-0 transition-all ${
        selected ? "border-emerald-500 bg-emerald-500/20" : "border-[#3a3a3d]"
      }`}>
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold leading-snug transition-colors ${selected ? "text-white" : "text-[#d4d4d8]"}`}>{name}</p>
        <p className="text-[11px] text-[#555] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ── Event row — node logo + path + note ──────────────────────────────────────
function EventRow({ path, type, note, logoUrl, imgFilter, Icon, colorClass }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#222224] last:border-0 group">
      <div className="w-7 h-7 rounded-lg bg-[#222224] flex items-center justify-center shrink-0 mt-0.5">
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-4 h-4 object-contain" style={imgFilter ? { filter: imgFilter } : undefined} />
          : Icon ? <Icon className={`w-3.5 h-3.5 ${colorClass}`} strokeWidth={1.5} />
          : <TypeIcon type={type} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#ccc] group-hover:text-white transition-colors font-medium leading-snug break-all">{path}</p>
        {note && <p className="text-[11px] text-[#555] mt-0.5 leading-relaxed">{note}</p>}
      </div>
      <TypeIcon type={type} />
    </div>
  );
}

// ── Wrapper strips Handle/Position props ────────────────────────────────────
function ConfigPanelWrapper({ Panel, config, updateConfig, selected, nodeId }) {
  const ref = useRef(null);
  return (
    <div ref={ref} className="config-panel-wrapper [&_.react-flow\_\_handle]:hidden">
      <Panel config={config} updateConfig={updateConfig} selected={selected} nodeId={nodeId} />
    </div>
  );
}

// ── Advanced Settings ────────────────────────────────────────────────────────
function AdvancedSettings({ retryPolicy, updateRetryPolicy, timeoutMs, onTimeoutChange }) {
  const [open, setOpen] = useState(false);

  const onFailureBehavior = retryPolicy.retryOnFailure === false ? 'error_path' : (retryPolicy.maxAttempts === 1 ? 'no_retry' : 'retry');
  const setOnFailureBehavior = (val) => {
    if (val === 'error_path') updateRetryPolicy('retryOnFailure', false);
    else if (val === 'no_retry') { updateRetryPolicy('retryOnFailure', true); updateRetryPolicy('maxAttempts', 1); }
    else { updateRetryPolicy('retryOnFailure', true); updateRetryPolicy('maxAttempts', retryPolicy.maxAttempts || 3); }
  };

  return (
    <div className="rounded-xl border border-[#2a2a2d] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-white/[0.03] transition-colors group"
      >
        <Settings2 className="w-3.5 h-3.5 text-[#555] group-hover:text-[#aaa] transition-colors" />
        <span className="text-[11px] font-semibold text-[#777] group-hover:text-[#bbb] transition-colors flex-1">Advanced Settings</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#555] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-[#2a2a2d] p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest">Timeout (ms)</label>
            <input
              type="number" min={1000} max={3600000} step={1000}
              value={timeoutMs || 60000}
              onChange={(e) => onTimeoutChange(Number(e.target.value))}
              className="w-full bg-[#111] border border-[#2a2a2d] rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest">On Failure</label>
            <select
              value={onFailureBehavior}
              onChange={(e) => setOnFailureBehavior(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2d] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="retry">Retry then stop workflow</option>
              <option value="no_retry">Stop immediately (no retry)</option>
              <option value="error_path">Continue to error path</option>
            </select>
          </div>
          {onFailureBehavior === 'retry' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest">Max Retries</label>
              <input
                type="number" min={1} max={10}
                value={retryPolicy.maxAttempts || 3}
                onChange={(e) => updateRetryPolicy('maxAttempts', Number(e.target.value))}
                className="w-full bg-[#111] border border-[#2a2a2d] rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
