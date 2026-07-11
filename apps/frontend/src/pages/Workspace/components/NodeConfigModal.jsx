import { useEffect, useCallback, useState, useRef } from "react";
import { X, Play, CheckCircle2, XCircle, Loader2, Pencil, Check, Copy, ChevronDown, Zap, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";
import { getConfigSchema } from "../configSchemas";
import { getTriggerSchema } from "../triggerSchemas";
import { getTriggerEvent, getTriggerEvents } from "../triggerEvents";
import SchemaPanel from "./nodes/SchemaPanel.jsx";
import MonoSchemaPanel from "./nodes/MonoSchemaPanel.jsx";
import api from "../../../lib/api";
import { playPanelOpen, playSuccess, playError } from "../../../lib/sounds";

const PANEL_HEADER_H = 52; // px — all three panels share this header height

// ── JSON syntax view ──────────────────────────────────────────────────────────
function JsonView({ data }) {
  const text = JSON.stringify(data, null, 2);
  return (
    <pre className="text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-words">
      {text.split("\n").map((line, i) => {
        const m = line.match(/^(\s*)"([^"]+)"(\s*:\s*)("?)(.*)("?,?)$/);
        if (m) {
          const [, indent, key, colon, q1, val, q2] = m;
          const isStr = q1 === '"';
          const isNum = !isStr && /^-?\d/.test(val);
          const isBool = val === "true" || val === "false";
          const isNull = val === "null";
          return (
            <span key={i}>
              {indent}<span className="text-violet-300">"{key}"</span>{colon}
              <span className={isStr ? "text-emerald-300" : isNum ? "text-orange-300" : isBool ? "text-amber-300" : isNull ? "text-neutral-500" : "text-neutral-300"}>
                {q1}{val}{q2}
              </span>{"\n"}
            </span>
          );
        }
        return <span key={i}>{line}{"\n"}</span>;
      })}
    </pre>
  );
}

// ── Resizable divider ─────────────────────────────────────────────────────────
function Divider({ onMouseDown }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-px shrink-0 bg-white/[0.06] hover:bg-violet-500/40 active:bg-violet-500/60 transition-colors cursor-col-resize relative group"
      style={{ zIndex: 1 }}
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 group-hover:bg-violet-500/5 transition-colors" />
    </div>
  );
}

// ── Flatten a value to a display string ──────────────────────────────────────
function formatValue(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 60) + "…" : v;
  if (Array.isArray(v)) return `[${v.length} items]`;
  if (typeof v === "object") return "{…}";
  return String(v);
}

function flattenKeys(obj, prefix = "", depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 2) return [];
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_")) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    out.push({ key: k, path, value: v });
    if (v && typeof v === "object" && !Array.isArray(v) && depth < 1) {
      out.push(...flattenKeys(v, path, depth + 1));
    }
  }
  return out;
}

// ── Panel 1: Input ────────────────────────────────────────────────────────────
function InputPanel({ canvasNodes, currentNodeId, allRunOutputs }) {
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied]    = useState(null);
  const [dragging, setDragging] = useState(null);

  const copy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1600);
  };

  const others = canvasNodes.filter((n) => n.id !== currentNodeId);

  return (
    <div className="bb-modal-side bb-liquid bb-panel-glow flex flex-col h-full">
      <div className="shrink-0 flex flex-col justify-center px-5 border-b border-white/[0.06]" style={{ height: PANEL_HEADER_H }}>
        <p className="text-[13px] font-semibold text-white">Input</p>
        <p className="text-[10px] text-neutral-500 mt-0.5">Drag a field into any input, or click to copy</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {others.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-5">
            <Zap className="w-5 h-5 text-neutral-700 mb-2" />
            <p className="text-[12px] text-neutral-600">No other nodes on canvas yet</p>
          </div>
        ) : others.map((n) => {
          const def = NodeRegistry[n.data.backendType];
          const name = n.data.config?.customLabel || n.data.config?.selectedAction || def?.label || n.data.backendType;
          const isOpen = expanded === n.id;

          const slug = (n.data.config?.customLabel || def?.label || n.data.backendType || "node")
            .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

          // Prefer live run output; fall back to DEFAULT_SCHEMAS
          const liveOutput = allRunOutputs[n.id];
          const hasLiveData = liveOutput && typeof liveOutput === "object";
          const schema = DEFAULT_SCHEMAS[n.data.backendType];

          let vars;
          if (hasLiveData) {
            vars = flattenKeys(liveOutput).map(({ path, value }) => ({
              key: path,
              ref: `{{${slug}.${path}}}`,
              value: formatValue(value),
              isLive: true,
            }));
          } else if (schema) {
            vars = Object.entries(schema)
              .filter(([k]) => !(k.startsWith("_") && !k.startsWith("__")))
              .map(([k]) => ({ key: k, ref: `{{${slug}.${k}}}`, value: null, isLive: false }));
          } else {
            vars = [
              { key: "output",  ref: `{{${slug}.output}}`,  value: null, isLive: false },
              { key: "success", ref: `{{${slug}.success}}`, value: null, isLive: false },
            ];
          }

          return (
            <div key={n.id} className="flex flex-col">
              <button
                onClick={() => setExpanded(isOpen ? null : n.id)}
                className="bb-nav-item flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors group text-left"
              >
                <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                  {def?.logoUrl
                    ? <img src={def.logoUrl} alt="" className="w-[22px] h-[22px] object-contain" style={def?.imgFilter ? { filter: def.imgFilter } : undefined} />
                    : def?.icon
                      ? <def.icon style={{ width: 20, height: 20 }} className="text-neutral-300" strokeWidth={1.5} />
                      : <div className="w-4 h-4 rounded bg-neutral-700" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-neutral-200 group-hover:text-white truncate transition-colors block">{name}</span>
                  {hasLiveData && (
                    <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-wider">live data</span>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="pl-2 pr-1 pt-1 pb-1 flex flex-col gap-1">
                  {vars.map(({ key, ref, value, isLive }) => {
                    const isCopied = copied === ref;
                    const isDraggingThis = dragging === ref;
                    return (
                      <button
                        key={key}
                        draggable
                        onClick={() => copy(ref)}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", ref);
                          e.dataTransfer.effectAllowed = "copy";
                          setDragging(ref);
                        }}
                        onDragEnd={() => setDragging(null)}
                        className={`bb-nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors group text-left ${isDraggingThis ? "opacity-50" : ""}`}
                      >
                        <GripVertical className="w-3 h-3 text-neutral-700 group-hover:text-neutral-400 shrink-0 transition-colors cursor-grab" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold text-neutral-300 group-hover:text-white transition-colors block truncate">{key}</span>
                          {isLive && value !== null ? (
                            <span className="text-[10px] text-emerald-400/80 font-mono truncate block">{value}</span>
                          ) : (
                            <span className="text-[10px] text-neutral-600 font-mono truncate block">{ref}</span>
                          )}
                        </div>
                        {isCopied
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : <Copy className="w-3 h-3 text-neutral-700 group-hover:text-neutral-400 shrink-0 transition-colors" />
                        }
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel 2: Configure ────────────────────────────────────────────────────────
function ConfigurePanel({ node, updateConfig, renameNode }) {
  const backendType  = node?.data.backendType;
  const nodeDef      = backendType ? NodeRegistry[backendType] : null;
  const variant      = node?.data.type === "trigger" && node?.data.config?.triggerVariant
    ? TRIGGER_VARIANTS[node.data.config.triggerVariant] : null;
  const def          = variant || nodeDef;
  const eventDef = variant && node?.data.config?.eventId
    ? getTriggerEvent(node.data.config.triggerVariant, node.data.config.eventId) : null;
  const eventGroup = variant ? getTriggerEvents(node.data.config?.triggerVariant) : null;
  const baseTriggerSchema = eventDef
    ? { title: `${eventGroup?.title || variant.label}`, subtitle: eventDef.description, icon: eventDef.icon, accent: eventDef.accent, fields: eventDef.fields }
    : variant ? getTriggerSchema(variant.backendType || backendType) : null;
  const triggerSchema = baseTriggerSchema && variant?.logoUrl
    ? { ...baseTriggerSchema, logoUrl: variant.logoUrl, imgFilter: variant.imgFilter }
    : baseTriggerSchema;
  const configSchema = !variant && backendType ? getConfigSchema(backendType) : null;
  const ConfigPanel  = variant?.ConfigPanel || nodeDef?.ConfigPanel;
  const config       = node?.data.config || {};
  const selectedAction = config.selectedAction;

  const currentName = config.customLabel || selectedAction || def?.label || node?.data.label || "";
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(currentName);

  // DOM-based operation section hider — runs after every render when action is locked
  const configRef = useRef(null);
  useEffect(() => {
    if (!selectedAction || !configRef.current) return;
    const allEls = configRef.current.querySelectorAll("label, span");
    for (const el of allEls) {
      if (/^operations?$/i.test(el.textContent.trim())) {
        const section = el.closest(".flex-col") || el.parentElement;
        if (section && section !== configRef.current) section.style.display = "none";
      }
    }
  });

  useEffect(() => {
    setNameVal(config.customLabel || selectedAction || def?.label || node?.data.label || "");
    setEditing(false);
  }, [node?.id]);

  const commitRename = () => {
    if (nameVal.trim()) renameNode(node.id, nameVal.trim());
    setEditing(false);
  };

  return (
    <div className="bb-modal-panel bb-liquid bb-panel-glow flex flex-col h-full">
      {/* Panel header */}
      <div className="shrink-0 flex flex-col justify-center px-5 border-b border-white/[0.06]" style={{ height: PANEL_HEADER_H }}>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
              className="bb-input bb-glow-border flex-1 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white"
            />
            <button onClick={commitRename} className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditing(false)} className="p-1.5 text-neutral-600 hover:text-neutral-400 transition-colors shrink-0"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button onClick={() => { setNameVal(currentName); setEditing(true); }} className="flex items-center gap-2 group text-left w-fit">
            <span className="text-[13px] font-semibold text-white group-hover:text-white transition-colors">{currentName || "Unnamed"}</span>
            <Pencil className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-300 transition-colors shrink-0" />
          </button>
        )}
        {selectedAction && !editing && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-neutral-500">Action:</span>
            <span className="text-[10px] font-semibold text-violet-300">{selectedAction}</span>
          </div>
        )}
      </div>

      {/* Config fields — padded wrapper */}
      <div className="flex-1 overflow-y-auto">
        <div ref={configRef} className="px-1 py-2">
          {triggerSchema ? (
            <MonoSchemaPanel
              schema={triggerSchema}
              config={config}
              updateConfig={(key, val) => updateConfig(node.id, key, val)}
            />
          ) : configSchema ? (
            <SchemaPanel
              schema={configSchema}
              def={def}
              config={config}
              updateConfig={(key, val) => updateConfig(node.id, key, val)}
              nodeId={node.id}
            />
          ) : ConfigPanel ? (
            <ConfigPanel
              config={config}
              updateConfig={(key, val) => updateConfig(node.id, key, val)}
              nodeId={node.id}
              backendType={backendType}
            />
          ) : (
            <div className="flex items-center justify-center h-32 px-6 text-center">
              <p className="text-[13px] text-neutral-600">No configuration needed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Panel 3: Output ───────────────────────────────────────────────────────────
function OutputPanel({ node, nodeStatus, lastOutput }) {
  const [testInput, setTestInput] = useState("{}");
  const [result, setResult]        = useState(null);
  const [loading, setLoading]      = useState(false);

  useEffect(() => { setResult(null); }, [node?.id]);

  const runTest = useCallback(async () => {
    if (!node) return;
    setLoading(true);
    setResult(null);
    let parsed = {};
    try { parsed = JSON.parse(testInput); } catch { parsed = {}; }
    try {
      const t0 = Date.now();
      const config = { ...(node.data.config || {}) };

      // For AI Agent: inject connected canvas-slot nodes so the test endpoint
      // has the same context as real execution through cursor.executor.js.
      if (node.data.backendType === "ai_agent") {
        const { nodes: allNodes, edges: allEdges } = useWorkspaceStore.getState();
        const inEdges = allEdges.filter(e => e.target === node.id);
        for (const edge of inEdges) {
          const src = allNodes.find(n => n.id === edge.source);
          if (!src) continue;
          const h = edge.targetHandle;
          if (h === "llm" || h === "chat_model") {
            config._chatModel = { ...(src.data.config || {}), backendType: src.data.backendType };
          } else if (h === "memory") {
            config._memory = src.data.config || {};
          } else if (h === "tools") {
            if (!config._tools) config._tools = [];
            config._tools.push({ ...(src.data.config || {}), backendType: src.data.backendType });
          } else if (h === "integration") {
            if (!config._platformTools) config._platformTools = [];
            const intType = src.data.backendType?.replace(/^agent_integration_/, "") || "";
            if (intType && src.data.config?.credentialId) {
              config._platformTools.push({
                type: intType,
                credentialId: src.data.config.credentialId,
                alias: src.data.config.alias || "",
              });
            }
          }
        }
      }

      const res = await api.post("/api/automation/test-node", {
        nodeType: node.data.backendType,
        config,
        input: parsed,
      });
      setResult({ ...res.data, clientMs: Date.now() - t0 });
      if (res.data.success) playSuccess(); else playError();
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.error || err.message });
      playError();
    } finally {
      setLoading(false);
    }
  }, [node, testInput]);

  const display = result || (lastOutput ? { success: nodeStatus !== "failed", output: [{ json: lastOutput }] } : null);

  return (
    <div className="bb-modal-side bb-liquid bb-panel-glow flex flex-col h-full">
      {/* Panel header */}
      <div className="shrink-0 flex flex-col justify-center px-5 border-b border-white/[0.06]" style={{ height: PANEL_HEADER_H }}>
        <p className="text-[13px] font-semibold text-white">Output</p>
        <p className="text-[10px] text-neutral-500 mt-0.5">Test this node with sample data</p>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Input area */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Test Input (JSON)</p>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={3}
            spellCheck={false}
            className="bb-input bb-glow-border w-full rounded-lg px-3 py-2.5 text-[12px] text-neutral-200 font-mono resize-none"
            placeholder="{}"
          />
        </div>

        {/* Run button */}
        <div className="px-4 py-3 shrink-0">
          <button
            onClick={runTest}
            disabled={loading || !node}
            className="bb-glow-border w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[14px] font-semibold transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{
              background: "rgba(16,185,129,0.08)",
              color: "#34d399",
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Running…</>
              : <><Play className="w-4 h-4" />Run Test</>
            }
          </button>
        </div>

        {/* Result */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {display ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {display.success
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                }
                <span className={`text-[13px] font-semibold ${display.success ? "text-emerald-400" : "text-red-400"}`}>
                  {display.success ? "Success" : "Failed"}
                </span>
                {(display.durationMs ?? display.clientMs) != null && (
                  <span className="ml-auto text-[11px] text-neutral-600 font-mono">{display.durationMs ?? display.clientMs}ms</span>
                )}
              </div>
              <div className="bb-card rounded-xl p-4 overflow-auto max-h-[420px]">
                <JsonView data={display.output ?? display.error ?? display} />
              </div>
            </div>
          ) : !loading ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-[12px] text-neutral-700">Results will appear here</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function NodeConfigModal() {
  const selectedNodeId    = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const nodes             = useWorkspaceStore((s) => s.nodes);
  const updateNodeConfig  = useWorkspaceStore((s) => s.updateNodeConfig);
  const renameNode        = useWorkspaceStore((s) => s.renameNode);
  const lastOutput        = useWorkspaceStore((s) => s.lastRunOutputs?.[s.selectedNodeId] ?? null);
  const allRunOutputs     = useWorkspaceStore((s) => s.lastRunOutputs ?? {});
  const nodeStatus        = useWorkspaceStore((s) => s.nodeStatuses?.[s.selectedNodeId] ?? null);

  const node       = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const isOpen     = !!selectedNodeId && !!node;

  const isTrigger  = node?.data.type === "trigger";
  const variant    = isTrigger && node?.data.config?.triggerVariant
    ? TRIGGER_VARIANTS[node.data.config.triggerVariant] : null;
  const nodeDef    = node ? NodeRegistry[node.data.backendType] : null;
  const def        = variant || nodeDef;
  const logoUrl    = variant?.logoUrl || nodeDef?.logoUrl;
  const imgFilter  = variant?.imgFilter || nodeDef?.imgFilter;
  const nodeLabel  = node?.data.config?.customLabel || node?.data.config?.selectedAction || def?.label || node?.data.label || "";

  // Resizable panels — percentages [p0, p1, p2]
  const containerRef = useRef(null);
  const [pw, setPw]  = useState([33.33, 33.33, 33.34]);
  const drag         = useRef(null);

  const startDrag = (dividerIdx, e) => {
    e.preventDefault();
    drag.current = { dividerIdx, startX: e.clientX, startPw: [...pw] };
    const onMove = (ev) => {
      if (!drag.current || !containerRef.current) return;
      const totalW = containerRef.current.getBoundingClientRect().width;
      const deltaPct = ((ev.clientX - drag.current.startX) / totalW) * 100;
      const { dividerIdx: di, startPw: sp } = drag.current;
      const a = di, b = di + 1;
      const newA = Math.max(15, Math.min(60, sp[a] + deltaPct));
      const diff = newA - sp[a];
      const newB = Math.max(15, sp[b] - diff);
      const next = [...sp];
      next[a] = newA;
      next[b] = newB;
      // Keep third panel getting the remainder
      next[2] = Math.max(15, 100 - next[0] - next[1]);
      setPw(next);
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => { if (isOpen) playPanelOpen(); }, [selectedNodeId]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === "Escape") setSelectedNodeId(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, setSelectedNodeId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ncm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 60, background: "#0a0a0a" }}
        >
          {/* Top bar */}
          <div className="bb-liquid bb-edge-bottom flex items-center gap-3 px-5 shrink-0" style={{ height: 52 }}>
            <div className="w-7 h-7 shrink-0 flex items-center justify-center">
              {logoUrl
                ? <img src={logoUrl} alt="" className="w-5 h-5 object-contain" style={imgFilter ? { filter: imgFilter } : undefined} />
                : def?.icon && <def.icon className="w-5 h-5 text-neutral-200" strokeWidth={1.5} />
              }
            </div>
            <div className="flex items-baseline gap-2 flex-1 min-w-0">
              <span className="text-[14px] font-semibold text-white truncate">{nodeLabel}</span>
              {def?.label && def.label !== nodeLabel && (
                <span className="text-[11px] text-neutral-500 shrink-0">{def.label}</span>
              )}
            </div>
            {nodeStatus && (
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                nodeStatus === "completed" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : nodeStatus === "failed"  ? "text-red-400 bg-red-500/10 border-red-500/20"
                : "text-blue-400 bg-blue-500/10 border-blue-500/20"
              }`}>
                {nodeStatus === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
                {nodeStatus}
              </div>
            )}
            <button onClick={() => setSelectedNodeId(null)}
              className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all shrink-0 ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Three resizable panels */}
          <div ref={containerRef} className="flex-1 flex flex-row overflow-hidden select-none">
            <div style={{ width: `${pw[0]}%` }} className="overflow-hidden">
              <InputPanel canvasNodes={nodes} currentNodeId={selectedNodeId} allRunOutputs={allRunOutputs} />
            </div>

            <Divider onMouseDown={(e) => startDrag(0, e)} />

            <div style={{ width: `${pw[1]}%` }} className="overflow-hidden">
              <ConfigurePanel node={node} updateConfig={updateNodeConfig} renameNode={renameNode} />
            </div>

            <Divider onMouseDown={(e) => startDrag(1, e)} />

            <div style={{ width: `${pw[2]}%` }} className="overflow-hidden">
              <OutputPanel node={node} nodeStatus={nodeStatus} lastOutput={lastOutput} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
