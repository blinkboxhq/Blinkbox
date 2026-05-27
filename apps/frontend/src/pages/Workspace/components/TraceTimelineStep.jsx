import { useState } from "react";
import { Check, X, Loader2, ChevronDown, ChevronRight, RefreshCw, Clock, AlertTriangle, Zap } from "lucide-react";
import TraceDiffBlock from "./TraceDiffBlock";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";

function formatDuration(ms) {
  if (!ms || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function DataBlock({ label, data, variant = "neutral" }) {
  const colors = {
    neutral: { header: "#17171f", border: "#26263a", label: "#4a4a65", text: "#8a8aa8" },
    output:  { header: "#0d1f16", border: "rgba(16,185,129,0.2)", label: "#10b981", text: "#6ee7b7" },
    error:   { header: "#1a0d0d", border: "rgba(239,68,68,0.2)", label: "#ef4444", text: "#fca5a5" },
  };
  const c = colors[variant] || colors.neutral;
  return (
    <div className="rounded-lg overflow-hidden text-[10px] font-mono" style={{ background: c.header, border: `1px solid ${c.border}` }}>
      <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ borderBottom: `1px solid ${c.border}` }}>
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: c.label }}>{label}</span>
      </div>
      <pre className="px-3 py-2.5 leading-relaxed whitespace-pre-wrap break-all max-h-48 overflow-auto" style={{ color: c.text }}>
        {data === undefined || data === null ? "—" : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function TraceTimelineStep({ node, cursor, isLast, isLive, nodeLogs = [] }) {
  const status     = cursor ? cursor.status : (isLive ? "pending" : "idle");
  const hasFailed  = status === "failed";
  const isCompleted = status === "completed";
  const isWaiting  = status === "waiting";
  const isRunning  = status === "running" || isWaiting;
  const isPending  = status === "pending" || status === "idle";

  // Auto-expand failed nodes
  const [expanded, setExpanded] = useState(hasFailed);

  const stepLog     = nodeLogs.filter((l) => l.type === "node_step").slice(-1)[0] ?? null;
  const durationMs  = stepLog?.durationMs ?? cursor?.durationMs ?? null;
  const retries     = stepLog?.retries ?? cursor?.retries ?? 0;
  const logInput    = stepLog?.input;
  const logOutput   = stepLog?.output;
  const hasLogData  = logInput !== undefined || logOutput !== undefined;

  const failedDiff  = hasFailed ? buildFailedDiff(node, cursor) : null;
  const errorMsg    = cursor?.errorMessage || cursor?.error;

  // Left-rail color
  const railColor   = isCompleted ? "#10b981" : hasFailed ? "#ef4444" : isRunning ? "#3b82f6" : "#26263a";
  const dotBg       = isCompleted ? "#10b981" : hasFailed ? "#ef4444" : isRunning ? "transparent" : "#17171f";

  return (
    <div className="flex gap-0 group">
      {/* Left rail */}
      <div className="flex flex-col items-center w-8 shrink-0">
        {/* Status dot */}
        <div className="relative flex items-center justify-center w-6 h-6 shrink-0 z-10" style={{ marginTop: "14px" }}>
          {isRunning ? (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ border: `2px solid #3b82f6`, background: "#111118" }}>
              <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
            </div>
          ) : isCompleted ? (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#10b981", boxShadow: "0 0 10px rgba(16,185,129,0.35)" }}>
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          ) : hasFailed ? (
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#ef4444", boxShadow: "0 0 10px rgba(239,68,68,0.4)" }}>
              <X className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full" style={{ background: "#17171f", border: "1px solid #26263a" }} />
          )}
        </div>

        {/* Connector line */}
        {!isLast && (
          <div className="w-px flex-1 my-1" style={{ background: railColor, opacity: isPending ? 0.3 : 0.45 }} />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 mb-2 ml-2">
        <div
          className="rounded-xl overflow-hidden transition-all"
          style={{
            background: hasFailed ? "rgba(239,68,68,0.04)" : "#111118",
            border: `1px solid ${hasFailed ? "rgba(239,68,68,0.2)" : isCompleted ? "rgba(16,185,129,0.12)" : "#1a1a25"}`,
            marginTop: "8px",
          }}
        >
          {/* Row header */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2.5 w-full px-3.5 py-3 text-left"
          >
            {/* Chevron */}
            <span className="text-[#4a4a65] shrink-0">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>

            {/* Node label */}
            <span className={`text-[12px] font-semibold flex-1 truncate tracking-tight ${
              isCompleted ? "text-white" :
              hasFailed   ? "text-red-300" :
              isRunning   ? "text-blue-300" :
              "text-[#4a4a65]"
            }`}>
              {node.data.label}
            </span>

            {/* Badges row */}
            <div className="flex items-center gap-2 shrink-0">
              {durationMs != null && (
                <span className="flex items-center gap-1 text-[9px] font-mono text-[#4a4a65]">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDuration(durationMs)}
                </span>
              )}
              {retries > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-mono text-amber-500/80">
                  <RefreshCw className="w-2.5 h-2.5" />
                  {retries}×
                </span>
              )}
              {/* Status badge */}
              {isCompleted && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  OK
                </span>
              )}
              {hasFailed && (
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-2.5 h-2.5" /> Error
                </span>
              )}
              {isRunning && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                  {isWaiting ? "Retrying" : "Running"}
                </span>
              )}
            </div>
          </button>

          {/* Expanded content */}
          {expanded && (
            <div className="px-3.5 pb-3.5 space-y-2" style={{ borderTop: `1px solid ${hasFailed ? "rgba(239,68,68,0.12)" : "#1a1a25"}` }}>
              <div className="pt-2.5 space-y-2">
                {/* Error message */}
                {hasFailed && errorMsg && !failedDiff && (
                  <div className="rounded-lg overflow-hidden" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
                      <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Error</span>
                    </div>
                    <pre className="px-3 py-2.5 text-[10px] font-mono text-red-300 leading-relaxed whitespace-pre-wrap break-all">
                      {errorMsg.split(" — ")[0]}
                    </pre>
                    {errorMsg.includes(" — ") && (
                      <div className="flex items-start gap-2 px-3 py-2.5" style={{ borderTop: "1px solid rgba(239,68,68,0.12)", background: "rgba(251,191,36,0.04)" }}>
                        <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-300/80 leading-relaxed">
                          {errorMsg.split(" — ").slice(1).join(" — ")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Schema diff */}
                {hasFailed && failedDiff && (
                  <TraceDiffBlock
                    expected={failedDiff.expected}
                    received={failedDiff.received}
                    message={failedDiff.message}
                  />
                )}

                {/* Input / Output */}
                {hasLogData ? (
                  <>
                    {logInput !== undefined && <DataBlock label="Input" data={logInput} variant="neutral" />}
                    {logOutput !== undefined && <DataBlock label="Output" data={logOutput} variant={hasFailed ? "error" : "output"} />}
                  </>
                ) : cursor?.output ? (
                  <DataBlock label="Output" data={cursor.output} variant={hasFailed ? "error" : "output"} />
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildFailedDiff(node, cursor) {
  if (!cursor) return null;

  const backendType  = node.data?.backendType;
  const expectedSchema = DEFAULT_SCHEMAS[backendType];
  const input        = cursor.input || cursor.output;

  if (!expectedSchema || !input) return null;

  const mismatches = [];
  for (const [key] of Object.entries(expectedSchema)) {
    if (key.startsWith("_")) continue;
    if (input[key] === null || input[key] === undefined) mismatches.push(key);
  }

  if (mismatches.length === 0 && !cursor.error) return null;

  const expectedObj = {};
  const receivedObj = {};
  for (const key of Object.keys(expectedSchema)) {
    if (key.startsWith("_")) continue;
    expectedObj[key] = expectedSchema[key];
    receivedObj[key] = input[key] !== undefined ? input[key] : null;
  }

  const missingField = mismatches[0];
  const message = missingField
    ? `The upstream node did not provide ${missingField === "email" ? "an email address" : `a value for "${missingField}"`}.`
    : cursor.error || "Execution failed at this step.";

  return { expected: expectedObj, received: receivedObj, message };
}
