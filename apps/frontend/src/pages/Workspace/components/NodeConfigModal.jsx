import { useEffect, useCallback, useState, useRef } from "react";
import { X, Play, CheckCircle2, XCircle, Loader2, Pencil, Check, Copy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import api from "../../../lib/api";
import { playPanelOpen, playSuccess, playError } from "../../../lib/sounds";

// ── Syntax-colored JSON ───────────────────────────────────────────────────────
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

// ── Panel 1: Input ────────────────────────────────────────────────────────────
function InputPanel({ canvasNodes, currentNodeId }) {
  const [copied, setCopied] = useState(null);

  const copy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1600);
  };

  const others = canvasNodes.filter((n) => n.id !== currentNodeId);

  return (
    <div className="flex flex-col h-full" style={{ background: "#0d0d0f" }}>
      <div className="px-5 pt-5 pb-4 border-b border-[#1e1e20] shrink-0">
        <p className="text-[13px] font-semibold text-neutral-200">Input</p>
        <p className="text-[11px] text-neutral-600 mt-0.5">Canvas nodes — click to copy variable</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
        {others.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full bg-neutral-900 border border-[#1e1e20] flex items-center justify-center mb-3">
              <Zap className="w-4 h-4 text-neutral-700" />
            </div>
            <p className="text-[12px] text-neutral-600">No other nodes on canvas</p>
          </div>
        ) : others.map((n) => {
          const def = NodeRegistry[n.data.backendType];
          const name = n.data.config?.customLabel || n.data.config?.selectedAction || def?.label || n.data.label || n.data.backendType;
          const varRef = `{{${n.id}.output}}`;
          const isCopied = copied === varRef;
          return (
            <button key={n.id} onClick={() => copy(varRef)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors group text-left w-full">
              <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-neutral-900 border border-[#1e1e20]">
                {def?.logoUrl
                  ? <img src={def.logoUrl} alt="" className="w-5 h-5 object-contain" style={def.imgFilter ? { filter: def.imgFilter } : undefined} />
                  : def?.icon
                    ? <def.icon className={`w-4.5 h-4.5 ${def.colorClass || "text-neutral-500"}`} strokeWidth={1.5} style={{ width: 18, height: 18 }} />
                    : <div className="w-4 h-4 rounded bg-neutral-700" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] text-neutral-300 group-hover:text-neutral-100 font-medium truncate block transition-colors">{name}</span>
                <span className="text-[10px] text-neutral-700 font-mono truncate block">{varRef}</span>
              </div>
              {isCopied
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <Copy className="w-3.5 h-3.5 text-neutral-700 group-hover:text-neutral-500 shrink-0 transition-colors" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel 2: Configure ────────────────────────────────────────────────────────
function ConfigurePanel({ node, updateConfig, renameNode }) {
  const backendType = node?.data.backendType;
  const nodeDef  = backendType ? NodeRegistry[backendType] : null;
  const variant  = node?.data.type === "trigger" && node?.data.config?.triggerVariant
    ? TRIGGER_VARIANTS[node.data.config.triggerVariant] : null;
  const def = variant || nodeDef;
  const ConfigPanel = variant?.ConfigPanel || nodeDef?.ConfigPanel;
  const config = node?.data.config || {};
  const selectedAction = config.selectedAction;

  const currentName = config.customLabel || selectedAction || def?.label || node?.data.label || "";
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal]  = useState(currentName);

  useEffect(() => {
    setNameVal(config.customLabel || selectedAction || def?.label || node?.data.label || "");
    setEditingName(false);
  }, [node?.id]);

  const commitRename = () => {
    if (nameVal.trim()) renameNode(node.id, nameVal.trim());
    setEditingName(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#111113" }}>
      {/* Name row */}
      <div className="px-5 pt-5 pb-4 border-b border-[#1e1e20] shrink-0">
        <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-2">Configure</p>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input autoFocus value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingName(false); }}
              className="flex-1 bg-[#0d0d0f] border border-[#444] rounded-lg px-3 py-2 text-[14px] font-semibold text-white focus:outline-none focus:border-neutral-500 transition-colors"
            />
            <button onClick={commitRename} className="p-2 text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingName(false)} className="p-2 text-neutral-600 hover:text-neutral-400 transition-colors shrink-0"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button onClick={() => { setNameVal(currentName); setEditingName(true); }}
            className="flex items-center gap-2.5 group text-left">
            <span className="text-[15px] font-semibold text-neutral-200 group-hover:text-white transition-colors leading-tight">
              {currentName || "Unnamed node"}
            </span>
            <Pencil className="w-3.5 h-3.5 text-neutral-700 group-hover:text-neutral-400 transition-colors shrink-0" />
          </button>
        )}
        {selectedAction && (
          <div className="flex items-center gap-2 mt-2.5">
            <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">Action</span>
            <span className="text-[11px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">{selectedAction}</span>
          </div>
        )}
      </div>

      {/* Config fields */}
      <div className="flex-1 overflow-y-auto">
        {ConfigPanel ? (
          <ConfigPanel config={config} updateConfig={(key, val) => updateConfig(node.id, key, val)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <p className="text-[13px] text-neutral-600">No configuration required for this node.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel 3: Output ───────────────────────────────────────────────────────────
function OutputPanel({ node, nodeStatus, lastOutput }) {
  const [testInput, setTestInput] = useState("{\n  \n}");
  const [result, setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setResult(null); }, [node?.id]);

  const runTest = useCallback(async () => {
    if (!node) return;
    setLoading(true);
    setResult(null);
    let parsed = {};
    try { parsed = JSON.parse(testInput); } catch { parsed = {}; }
    const t0 = Date.now();
    try {
      const res = await api.post("/api/automation/test-node", {
        nodeType: node.data.backendType,
        config: node.data.config || {},
        input: parsed,
      });
      const dur = Date.now() - t0;
      setResult({ ...res.data, durationMs: res.data.durationMs ?? dur });
      if (res.data.success) playSuccess(); else playError();
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.error || err.message, durationMs: Date.now() - t0 });
      playError();
    } finally {
      setLoading(false);
    }
  }, [node, testInput]);

  const displayResult = result || (lastOutput ? { success: nodeStatus !== "failed", output: [{ json: lastOutput }] } : null);

  return (
    <div className="flex flex-col h-full" style={{ background: "#0d0d0f" }}>
      <div className="px-5 pt-5 pb-4 border-b border-[#1e1e20] shrink-0">
        <p className="text-[13px] font-semibold text-neutral-200">Output</p>
        <p className="text-[11px] text-neutral-600 mt-0.5">Test this node with sample input</p>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Test input */}
        <div className="px-4 pt-4 pb-3 border-b border-[#1e1e20] shrink-0">
          <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-2">Test Input (JSON)</p>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={4}
            spellCheck={false}
            className="w-full bg-[#111] border border-[#2a2a2d] rounded-lg px-3 py-2.5 text-[12px] text-neutral-300 font-mono focus:outline-none focus:border-neutral-600 resize-none transition-colors placeholder-neutral-700"
            placeholder="{}"
          />
        </div>

        {/* Run button */}
        <div className="px-4 py-3 shrink-0">
          <button
            onClick={runTest}
            disabled={loading || !node}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[14px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: loading ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "#34d399",
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
              : <><Play className="w-4 h-4" /> Run Test</>
            }
          </button>
        </div>

        {/* Result */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {displayResult ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {displayResult.success
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <span className={`text-[13px] font-semibold ${displayResult.success ? "text-emerald-400" : "text-red-400"}`}>
                  {displayResult.success ? "Success" : "Failed"}
                </span>
                {displayResult.durationMs != null && (
                  <span className="ml-auto text-[11px] text-neutral-600 font-mono">{displayResult.durationMs}ms</span>
                )}
              </div>
              <div className="bg-[#111] border border-[#1e1e20] rounded-xl p-4 overflow-auto">
                <JsonView data={displayResult.output ?? displayResult.error ?? displayResult} />
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
  const lastRunOutputs    = useWorkspaceStore((s) => s.lastRunOutputs);
  const nodeStatuses      = useWorkspaceStore((s) => s.nodeStatuses);

  const node    = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const isOpen  = !!selectedNodeId && !!node;

  const isTrigger = node?.data.type === "trigger";
  const variant   = isTrigger && node?.data.config?.triggerVariant
    ? TRIGGER_VARIANTS[node.data.config.triggerVariant] : null;
  const nodeDef = node ? NodeRegistry[node.data.backendType] : null;
  const def     = variant || nodeDef;

  const logoUrl   = variant?.logoUrl || nodeDef?.logoUrl;
  const imgFilter = variant?.imgFilter || nodeDef?.imgFilter;
  const nodeLabel = node?.data.config?.customLabel || node?.data.config?.selectedAction || def?.label || node?.data.label || "";
  const nodeStatus = nodeStatuses?.[selectedNodeId];
  const lastOutput = lastRunOutputs?.[selectedNodeId];

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
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "#0a0a0a" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 shrink-0 border-b border-[#333]" style={{ height: 52, background: "#0a0a0a" }}>
            <div className="w-7 h-7 shrink-0 flex items-center justify-center">
              {logoUrl
                ? <img src={logoUrl} alt="" className="w-5 h-5 object-contain" style={imgFilter ? { filter: imgFilter } : undefined} />
                : def?.icon && <def.icon className={`w-5 h-5 ${def.colorClass || "text-neutral-400"}`} strokeWidth={1.5} />
              }
            </div>
            <div className="flex-1 min-w-0 flex items-baseline gap-2">
              <span className="text-[14px] font-semibold text-neutral-200 truncate">{nodeLabel}</span>
              {def?.label && def.label !== nodeLabel && (
                <span className="text-[11px] text-neutral-600 truncate">{def.label}</span>
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
            <button
              onClick={() => setSelectedNodeId(null)}
              className="p-1.5 text-neutral-600 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all ml-1 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Three equal panels */}
          <div className="flex-1 flex flex-row overflow-hidden">
            <div className="flex-1 border-r border-[#1e1e20] overflow-hidden">
              <InputPanel canvasNodes={nodes} currentNodeId={selectedNodeId} />
            </div>
            <div className="flex-1 border-r border-[#1e1e20] overflow-hidden">
              <ConfigurePanel node={node} updateConfig={updateNodeConfig} renameNode={renameNode} />
            </div>
            <div className="flex-1 overflow-hidden">
              <OutputPanel node={node} nodeStatus={nodeStatus} lastOutput={lastOutput} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
