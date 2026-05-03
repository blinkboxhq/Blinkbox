import { useEffect, useCallback, useState, useRef } from "react";
import { X, Play, CheckCircle2, XCircle, Loader2, Pencil, Check, Copy, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import api from "../../../lib/api";
import { playPanelOpen } from "../../../lib/sounds";

// ── Node logo/icon helper ─────────────────────────────────────────────────────
function NodeIcon({ def, size = 20 }) {
  if (!def) return <div style={{ width: size, height: size }} className="rounded bg-neutral-800" />;
  if (def.logoUrl) {
    return (
      <img src={def.logoUrl} alt="" style={{ width: size, height: size }}
        className="object-contain shrink-0"
        style2={def.imgFilter ? { filter: def.imgFilter } : undefined}
      />
    );
  }
  const Icon = def.icon;
  if (Icon) return <Icon style={{ width: size, height: size }} className={def.colorClass || "text-neutral-500"} strokeWidth={1.5} />;
  return <div style={{ width: size, height: size }} className="rounded bg-neutral-800" />;
}

// ── Panel 1: Input ────────────────────────────────────────────────────────────
function InputPanel({ canvasNodes, currentNodeId }) {
  const [copied, setCopied] = useState(null);

  const copyVar = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1400);
  };

  const otherNodes = canvasNodes.filter((n) => n.id !== currentNodeId);

  return (
    <div className="flex flex-col h-full" style={{ background: "#0d0d0f" }}>
      <div className="px-5 py-3.5 border-b border-[#1e1e20] shrink-0">
        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Input</p>
        <p className="text-[10px] text-neutral-700 mt-0.5">All nodes on canvas — click to copy variable</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {otherNodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[12px] text-neutral-600">No other nodes on canvas yet</p>
          </div>
        )}
        {otherNodes.map((n) => {
          const def = NodeRegistry[n.data.backendType];
          const displayName = n.data.config?.customLabel || n.data.config?.selectedAction || def?.label || n.data.label || n.data.backendType;
          const varRef = `{{${n.id}.output}}`;
          const isCopied = copied === varRef;
          return (
            <button
              key={n.id}
              onClick={() => copyVar(varRef)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group text-left w-full"
            >
              <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                {def?.logoUrl ? (
                  <img src={def.logoUrl} alt="" className="w-5 h-5 object-contain"
                    style={def.imgFilter ? { filter: def.imgFilter } : undefined} />
                ) : def?.icon ? (
                  <def.icon className={`w-5 h-5 ${def.colorClass || "text-neutral-500"}`} strokeWidth={1.5} />
                ) : (
                  <div className="w-5 h-5 rounded bg-neutral-800" />
                )}
              </div>
              <span className="flex-1 text-[12px] text-neutral-400 group-hover:text-neutral-200 font-medium truncate transition-colors">
                {displayName}
              </span>
              {isCopied
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <Copy className="w-3 h-3 text-neutral-700 group-hover:text-neutral-500 shrink-0 transition-colors" />
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel 3: Output ───────────────────────────────────────────────────────────
function OutputPanel({ node, nodeStatus, lastOutput }) {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTest = useCallback(async () => {
    if (!node) return;
    setLoading(true);
    setTestResult(null);
    try {
      const res = await api.post("/api/automation/test-node", {
        nodeType: node.data.backendType,
        config: node.data.config || {},
        input: {},
      });
      setTestResult({ success: true, data: res.data });
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  }, [node]);

  const result = testResult || (lastOutput ? { success: nodeStatus !== "failed", data: lastOutput } : null);

  return (
    <div className="flex flex-col h-full" style={{ background: "#0d0d0f" }}>
      <div className="px-5 py-3.5 border-b border-[#1e1e20] shrink-0">
        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Output</p>
        <p className="text-[10px] text-neutral-700 mt-0.5">Test this node in isolation</p>
      </div>
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        <button
          onClick={runTest}
          disabled={loading || !node}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-semibold hover:bg-emerald-500/18 disabled:opacity-40 transition-all"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
            : <><Play className="w-4 h-4" /> Run Test</>
          }
        </button>

        {result && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {result.success
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : <XCircle className="w-4 h-4 text-red-400" />
              }
              <span className={`text-[12px] font-semibold ${result.success ? "text-emerald-400" : "text-red-400"}`}>
                {result.success ? "Success" : "Failed"}
              </span>
            </div>
            <pre className="text-[11px] text-neutral-400 bg-[#111] border border-[#1e1e20] rounded-lg p-3 overflow-auto max-h-[400px] whitespace-pre-wrap font-mono leading-relaxed">
              {JSON.stringify(result.data || result.error, null, 2)}
            </pre>
          </div>
        )}

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <div className="w-10 h-10 rounded-full bg-neutral-900 border border-[#1e1e20] flex items-center justify-center mb-3">
              <Play className="w-4 h-4 text-neutral-600" />
            </div>
            <p className="text-[12px] text-neutral-600">Hit Run Test to see output</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel 2: Configure ────────────────────────────────────────────────────────
function ConfigurePanel({ node, updateConfig, renameNode }) {
  const backendType = node?.data.backendType;
  const nodeDef = backendType ? NodeRegistry[backendType] : null;
  const variant = node?.data.type === "trigger" && node?.data.config?.triggerVariant
    ? TRIGGER_VARIANTS[node.data.config.triggerVariant]
    : null;
  const def = variant || nodeDef;
  const ConfigPanel = variant?.ConfigPanel || nodeDef?.ConfigPanel;
  const config = node?.data.config || {};

  const currentName = config.customLabel || config.selectedAction || def?.label || node?.data.label || "";
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(currentName);
  const nameRef = useRef(null);

  useEffect(() => {
    setNameVal(config.customLabel || config.selectedAction || def?.label || node?.data.label || "");
    setEditingName(false);
  }, [node?.id]);

  const commitRename = () => {
    if (nameVal.trim() && nameVal.trim() !== (def?.label || "")) {
      renameNode(node.id, nameVal.trim());
    }
    setEditingName(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#111113" }}>
      {/* Node rename */}
      <div className="px-5 py-4 border-b border-[#1e1e20] shrink-0">
        <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-2">Node name</p>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              ref={nameRef}
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingName(false); }}
              className="flex-1 bg-[#0d0d0f] border border-[#444] rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-neutral-500 transition-colors"
            />
            <button onClick={commitRename} className="p-2 text-emerald-400 hover:text-emerald-300 transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditingName(false)} className="p-2 text-neutral-600 hover:text-neutral-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setNameVal(currentName); setEditingName(true); }}
            className="flex items-center gap-2 group"
          >
            <span className="text-[14px] font-semibold text-neutral-200 group-hover:text-white transition-colors">
              {currentName || "Unnamed node"}
            </span>
            <Pencil className="w-3.5 h-3.5 text-neutral-700 group-hover:text-neutral-400 transition-colors" />
          </button>
        )}
      </div>

      {/* Config content */}
      <div className="flex-1 overflow-y-auto">
        {ConfigPanel ? (
          <ConfigPanel
            config={config}
            updateConfig={(key, val) => updateConfig(node.id, key, val)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-[13px] text-neutral-500">No configuration needed for this node.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function NodeConfigModal() {
  const selectedNodeId    = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const nodes             = useWorkspaceStore((s) => s.nodes);
  const updateNodeConfig  = useWorkspaceStore((s) => s.updateNodeConfig);
  const renameNode        = useWorkspaceStore((s) => s.renameNode);
  const lastRunOutputs    = useWorkspaceStore((s) => s.lastRunOutputs);
  const nodeStatuses      = useWorkspaceStore((s) => s.nodeStatuses);

  const node   = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const isOpen = !!selectedNodeId && !!node;

  const isTrigger = node?.data.type === "trigger";
  const variant   = isTrigger && node?.data.config?.triggerVariant
    ? TRIGGER_VARIANTS[node.data.config.triggerVariant]
    : null;
  const nodeDef = node ? NodeRegistry[node.data.backendType] : null;
  const def     = variant || nodeDef;

  const logoUrl   = variant?.logoUrl || nodeDef?.logoUrl;
  const imgFilter = variant?.imgFilter || nodeDef?.imgFilter;
  const nodeLabel = node?.data.config?.customLabel || node?.data.config?.selectedAction || def?.label || node?.data.label || "";

  const nodeStatus = nodeStatuses?.[selectedNodeId];
  const lastOutput = lastRunOutputs?.[selectedNodeId];

  useEffect(() => {
    if (isOpen) playPanelOpen();
  }, [selectedNodeId]);

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
          key="ncm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={() => setSelectedNodeId(null)}
        >
          <motion.div
            key="ncm-card"
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 440, damping: 32, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col rounded-2xl overflow-hidden border border-[#333] shadow-2xl shadow-black"
            style={{ maxWidth: 1160, height: "88vh", background: "#0a0a0a" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#333] shrink-0" style={{ background: "#0a0a0a" }}>
              <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="w-5 h-5 object-contain"
                    style={imgFilter ? { filter: imgFilter } : undefined} />
                ) : def?.icon ? (
                  <def.icon className={`w-5 h-5 ${def.colorClass || "text-neutral-400"}`} strokeWidth={1.5} />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-semibold text-neutral-200 truncate block">{nodeLabel}</span>
                <span className="text-[10px] text-neutral-600">{def?.label !== nodeLabel ? def?.label : node?.data.backendType}</span>
              </div>
              {nodeStatus && (
                <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                  nodeStatus === "completed"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : nodeStatus === "failed"
                    ? "text-red-400 bg-red-500/10 border-red-500/20"
                    : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                }`}>
                  {nodeStatus === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
                  {nodeStatus}
                </div>
              )}
              <button onClick={() => setSelectedNodeId(null)}
                className="p-1.5 text-neutral-600 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Three panels */}
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* Panel 1 — Input */}
              <div className="w-[240px] shrink-0 border-r border-[#1e1e20] overflow-hidden">
                <InputPanel canvasNodes={nodes} currentNodeId={selectedNodeId} />
              </div>

              {/* Panel 2 — Configure (lighter) */}
              <div className="flex-1 overflow-hidden border-r border-[#1e1e20]">
                <ConfigurePanel
                  node={node}
                  updateConfig={updateNodeConfig}
                  renameNode={renameNode}
                />
              </div>

              {/* Panel 3 — Output */}
              <div className="w-[280px] shrink-0 overflow-hidden">
                <OutputPanel
                  node={node}
                  nodeStatus={nodeStatus}
                  lastOutput={lastOutput}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
