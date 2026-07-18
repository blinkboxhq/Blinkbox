import { useEffect, useCallback, useState, useRef } from "react";
import { X, Play, CheckCircle2, XCircle, Loader2, Pencil, Check, ChevronDown, ChevronRight, Zap, Split } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";
import { getConfigSchema } from "../configSchemas";
import { getTriggerSchema } from "../triggerSchemas";
import { getTriggerEvent, getTriggerEvents, eventDefaults } from "../triggerEvents";
import SchemaPanel from "./nodes/SchemaPanel.jsx";
import MonoSchemaPanel from "./nodes/MonoSchemaPanel.jsx";
import { ConfigToggleRow, ConfigSelect } from "../../../components/ui/ConfigKit";
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

// ── Value → JSON type label ──────────────────────────────────────────────────
function valueType(v) {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v; // "string" | "number" | "boolean" | "object"
}

const TYPE_TINT = {
  string: "text-emerald-400/70",
  number: "text-orange-400/70",
  boolean: "text-amber-400/70",
  object: "text-violet-400/70",
  array: "text-sky-400/70",
  null: "text-neutral-600",
};

// Every key of an object — and every index of an array — is a variable. A node
// with array output exposes `{{node.0.field}}`, `{{node.1.field}}`, and so on.
function childEntries(value) {
  if (Array.isArray(value)) return value.map((v, i) => [String(i), v]);
  if (value && typeof value === "object") {
    return Object.entries(value).filter(([k]) => !k.startsWith("_"));
  }
  return [];
}

// ── File-tree row: one JSON node (leaf or branch), fully recursive ────────────
function VarTreeRow({ nodeId, path, label, value, depth, dragging, setDragging, copy, copied, isSchema, guides = [], isLast = true }) {
  const structural = valueType(value);
  const isBranch = structural === "object" || structural === "array";
  const type = isSchema && !isBranch && typeof value === "string" ? value : structural;
  const [open, setOpen] = useState(depth < 1);
  const ref = `{{${nodeId}${path ? "." + path : ""}}}`;
  const isDragging = dragging === ref;
  const isCopied = copied === ref;

  const onDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", ref);
    e.dataTransfer.effectAllowed = "copy";
    setDragging(ref);
  };

  const children = isBranch ? childEntries(value) : [];

  return (
    <div className="flex flex-col">
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={() => setDragging(null)}
        onClick={() => (isBranch ? setOpen((o) => !o) : copy(ref))}
        title={ref}
        className={`bb-nav-item flex items-center gap-1.5 px-2 py-[5px] rounded-md transition-colors group cursor-grab ${isDragging ? "opacity-50" : ""}`}
      >
        {depth > 0 && (
          <span className="flex self-stretch -my-[5px] shrink-0">
            {guides.map((g, i) => (
              <span key={i} className="relative w-3">
                {g && <span className="absolute inset-y-0 left-1/2 w-px bg-white/[0.08]" />}
              </span>
            ))}
            <span className="relative w-3">
              <span className={`absolute left-1/2 top-0 w-px bg-white/[0.08] ${isLast ? "h-1/2" : "h-full"}`} />
              <span className="absolute left-1/2 right-0 top-1/2 h-px bg-white/[0.08]" />
            </span>
          </span>
        )}
        {isBranch ? (
          <ChevronRight className={`w-3 h-3 text-neutral-600 group-hover:text-neutral-400 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        ) : (
          <span className="w-3 shrink-0 text-center text-neutral-700 text-[10px] leading-none">·</span>
        )}
        <span className="text-[11px] font-mono font-medium text-neutral-300 group-hover:text-white transition-colors truncate">{label}</span>
        {!isBranch && !isSchema && value !== null && value !== undefined && (
          <span className="text-[10px] text-neutral-600 font-mono truncate ml-1 min-w-0">{formatValue(value)}</span>
        )}
        <span className={`ml-auto text-[9px] font-bold uppercase tracking-wider shrink-0 ${TYPE_TINT[type] || TYPE_TINT.null}`}>
          {isBranch ? (type === "array" ? `[${children.length}]` : `{${children.length}}`) : type}
        </span>
        {isCopied && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
      </div>

      {isBranch && open && (
        children.length === 0 ? (
          <p className="text-[10px] text-neutral-700 italic py-1" style={{ paddingLeft: 8 + (depth + 1) * 12 }}>empty</p>
        ) : (
          <div className="flex flex-col">
            {children.map(([k, v], i) => (
              <VarTreeRow
                key={k}
                nodeId={nodeId}
                path={path ? `${path}.${k}` : k}
                label={k}
                value={v}
                depth={depth + 1}
                dragging={dragging}
                setDragging={setDragging}
                copy={copy}
                copied={copied}
                isSchema={isSchema}
                guides={depth === 0 ? [] : [...guides, !isLast]}
                isLast={i === children.length - 1}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// Turn a stored schema (types-only, e.g. { body: { user: "string" } }) into a
// value-shaped object so the same tree renderer works before any live run.
function schemaToShape(schema) {
  if (schema === null || schema === undefined) return null;
  if (typeof schema === "string") return schema; // leaf: show the type as the value
  if (Array.isArray(schema)) return schema.map(schemaToShape);
  if (typeof schema === "object") {
    const out = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k.startsWith("_")) continue;
      out[k] = schemaToShape(v);
    }
    return out;
  }
  return schema;
}

// ── Panel 1: Input (variables from directly-connected upstream nodes only) ────
function InputPanel({ canvasNodes, edges, currentNodeId, allRunOutputs }) {
  const [copied, setCopied]     = useState(null);
  const [dragging, setDragging] = useState(null);
  const [openNode, setOpenNode] = useState({});

  const copy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1600);
  };

  // ONLY nodes wired into THIS node's input — direct incoming edges, not output.
  const sourceIds = [];
  for (const e of edges || []) {
    if (e.target === currentNodeId && !sourceIds.includes(e.source)) sourceIds.push(e.source);
  }
  const inputNodes = sourceIds
    .map((id) => canvasNodes.find((n) => n.id === id))
    .filter(Boolean);

  return (
    <div className="bb-modal-side bb-liquid bb-panel-glow flex flex-col h-full">
      <div className="shrink-0 flex flex-col justify-center px-5 border-b border-white/[0.06]" style={{ height: PANEL_HEADER_H }}>
        <p className="text-[13px] font-semibold text-white">Variables</p>
        <p className="text-[10px] text-neutral-500 mt-0.5">Drag a field into any input, or click to copy</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {inputNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-5">
            <Zap className="w-5 h-5 text-neutral-700 mb-2" />
            <p className="text-[12px] text-neutral-600">No nodes connected to this input</p>
            <p className="text-[10px] text-neutral-700 mt-1">Wire a node into this one to use its data</p>
          </div>
        ) : inputNodes.map((n) => {
          const def = NodeRegistry[n.data.backendType];
          const name = n.data.config?.customLabel || n.data.config?.selectedAction || def?.label || n.data.backendType;
          const isOpen = openNode[n.id] !== false; // default expanded

          const liveOutput = allRunOutputs[n.id];
          const hasLiveData = liveOutput && typeof liveOutput === "object";
          const shape = hasLiveData ? liveOutput : schemaToShape(DEFAULT_SCHEMAS[n.data.backendType]);
          const rows = childEntries(shape);

          return (
            <div key={n.id} className="flex flex-col">
              <button
                onClick={() => setOpenNode((s) => ({ ...s, [n.id]: !isOpen }))}
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
                <div className="pl-1 pr-1 pt-0.5 pb-1 flex flex-col">
                  {rows.length === 0 ? (
                    <p className="px-3 py-1.5 text-[11px] text-neutral-700 italic">No fields</p>
                  ) : rows.map(([k, v]) => (
                    <VarTreeRow
                      key={k}
                      nodeId={n.id}
                      path={k}
                      label={k}
                      value={v}
                      depth={0}
                      dragging={dragging}
                      setDragging={setDragging}
                      copy={copy}
                      copied={copied}
                      isSchema={!hasLiveData}
                    />
                  ))}
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
  const NO_SPLIT = ["condition", "success_failed", "loop", "merge"];
  const canSplitOutputs = node?.data.type !== "trigger" && !NO_SPLIT.includes(backendType);

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

  const selectEvent = (evId) => {
    const ev = eventGroup?.events.find((e) => e.id === evId);
    if (!ev) return;
    const defaults = eventDefaults(node.data.config.triggerVariant, evId);
    Object.entries(defaults).forEach(([k, v]) => updateConfig(node.id, k, v));
    renameNode(node.id, `${(eventGroup.title || variant.label).replace(/^On /, "")}: ${ev.label}`);
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
          {eventGroup ? (
            <>
              <div className="px-4 pt-3 pb-1">
                <ConfigSelect
                  label="Event"
                  value={config.eventId || ""}
                  onChange={selectEvent}
                  options={eventGroup.events.map((ev) => ({ value: ev.id, label: ev.label, icon: ev.icon }))}
                  placeholder="Choose the event that starts this workflow…"
                  accentColor={eventDef?.accent || eventGroup.events[0]?.accent || `rgb(${variant.accentColor})`}
                />
              </div>
              {eventDef ? (
                <MonoSchemaPanel
                  schema={triggerSchema}
                  config={config}
                  updateConfig={(key, val) => updateConfig(node.id, key, val)}
                />
              ) : (
                <div className="flex items-center justify-center h-24 px-6 text-center">
                  <p className="text-[12px] text-neutral-600">Pick an event above to configure this trigger.</p>
                </div>
              )}
            </>
          ) : triggerSchema ? (
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

          {canSplitOutputs && (
            <div className="px-4 pt-1 pb-3 mt-2 border-t border-white/[0.06]">
              <ConfigToggleRow
                label="Split outputs"
                desc="Add separate success and failure outputs — route by whether this node succeeds or errors."
                icon={Split}
                on={!!config.splitOutputs}
                onChange={(val) => updateConfig(node.id, "splitOutputs", val)}
                accentColor="#34d399"
              />
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
  const edges             = useWorkspaceStore((s) => s.edges);
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
              <InputPanel canvasNodes={nodes} edges={edges} currentNodeId={selectedNodeId} allRunOutputs={allRunOutputs} />
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
