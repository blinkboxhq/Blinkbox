import { useState } from "react";
import { Check, X, Loader2, ChevronDown, ChevronRight, RefreshCw, Clock, Zap } from "lucide-react";
import TraceDiffBlock from "./TraceDiffBlock";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";

function formatDuration(ms) {
  if (!ms || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function DataBlock({ label, data, isError }) {
  return (
    <div style={{ background: "#141414", border: `1px solid ${isError ? "#4a1a1a" : "#2a2a2a"}`, borderRadius: 4 }}>
      <div
        className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest"
        style={{ borderBottom: `1px solid ${isError ? "#4a1a1a" : "#2a2a2a"}`, color: isError ? "#ef4444" : "#555" }}
      >
        {label}
      </div>
      <pre className="px-3 py-2.5 text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all max-h-48 overflow-auto"
        style={{ color: isError ? "#fca5a5" : "#888" }}>
        {data === undefined || data === null ? "—" : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function TraceTimelineStep({ node, cursor, isLast, isLive, nodeLogs = [] }) {
  const status      = cursor ? cursor.status : (isLive ? "pending" : "idle");
  const hasFailed   = status === "failed";
  const isCompleted = status === "completed";
  const isWaiting   = status === "waiting";
  const isRunning   = status === "running" || isWaiting;
  const isPending   = status === "pending" || status === "idle";

  const [expanded, setExpanded] = useState(hasFailed);

  const stepLog    = nodeLogs.filter((l) => l.type === "node_step").slice(-1)[0] ?? null;
  const durationMs = stepLog?.durationMs ?? cursor?.durationMs ?? null;
  const retries    = stepLog?.retries ?? cursor?.retries ?? 0;
  const logInput   = stepLog?.input;
  const logOutput  = stepLog?.output;
  const hasLogData = logInput !== undefined || logOutput !== undefined;
  const failedDiff = hasFailed ? buildFailedDiff(node, cursor) : null;
  const errorMsg   = cursor?.errorMessage || cursor?.error;

  return (
    <div className="flex gap-3">
      {/* Rail */}
      <div className="flex flex-col items-center w-5 shrink-0" style={{ paddingTop: 14 }}>
        {isCompleted && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#16a34a", boxShadow: "0 0 8px rgba(22,163,74,0.4)" }}>
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        )}
        {isRunning && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#1c1c1e", border: "2px solid #3b82f6" }}>
            <Loader2 className="w-2.5 h-2.5 text-blue-400 animate-spin" />
          </div>
        )}
        {hasFailed && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#ef4444", boxShadow: "0 0 8px rgba(239,68,68,0.4)" }}>
            <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        )}
        {isPending && (
          <div className="w-5 h-5 rounded-full shrink-0"
            style={{ background: "#1c1c1e", border: "1px solid #333" }} />
        )}
        {!isLast && (
          <div className="w-px flex-1 my-1"
            style={{ background: isCompleted ? "#16a34a55" : hasFailed ? "#ef444430" : "#2a2a2a" }} />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 mb-2" style={{ paddingTop: 8 }}>
        <div
          style={{
            background: hasFailed ? "#1a0d0d" : "#1c1c1e",
            border: `1px solid ${hasFailed ? "#4a1a1a" : isCompleted ? "#1a3a2a" : "#2a2a2a"}`,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {/* Row */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-left"
          >
            <span style={{ color: "#444" }}>
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>

            <span className="flex-1 truncate text-[12px] font-semibold"
              style={{ color: isCompleted ? "#e5e5e5" : hasFailed ? "#fca5a5" : isRunning ? "#93c5fd" : "#555" }}>
              {node.data.label}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              {durationMs != null && (
                <span className="flex items-center gap-1 text-[9px] font-mono" style={{ color: "#444" }}>
                  <Clock className="w-2.5 h-2.5" />{formatDuration(durationMs)}
                </span>
              )}
              {retries > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-mono text-amber-500">
                  <RefreshCw className="w-2.5 h-2.5" />{retries}×
                </span>
              )}
              {isCompleted && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest"
                  style={{ background: "#0d2b1a", color: "#4ade80", border: "1px solid #1a4a2a", borderRadius: 3 }}>
                  OK
                </span>
              )}
              {hasFailed && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest"
                  style={{ background: "#2a0d0d", color: "#ef4444", border: "1px solid #4a1a1a", borderRadius: 3 }}>
                  Error
                </span>
              )}
              {isRunning && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest animate-pulse"
                  style={{ background: "#0d1a2a", color: "#60a5fa", border: "1px solid #1a3a5a", borderRadius: 3 }}>
                  {isWaiting ? "Retrying" : "Running"}
                </span>
              )}
            </div>
          </button>

          {/* Expanded */}
          {expanded && (
            <div className="px-3 pb-3 space-y-2"
              style={{ borderTop: `1px solid ${hasFailed ? "#4a1a1a" : "#2a2a2a"}` }}>
              <div className="pt-2.5 space-y-2">
                {hasFailed && errorMsg && !failedDiff && (
                  <div style={{ background: "#1a0d0d", border: "1px solid #4a1a1a", borderRadius: 4, overflow: "hidden" }}>
                    <div className="flex items-center gap-1.5 px-3 py-2"
                      style={{ borderBottom: "1px solid #4a1a1a" }}>
                      <X className="w-3 h-3 text-red-500 shrink-0" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-red-500">Error</span>
                    </div>
                    <pre className="px-3 py-2.5 text-[10px] font-mono text-red-300 leading-relaxed whitespace-pre-wrap break-all">
                      {errorMsg.split(" — ")[0]}
                    </pre>
                    {errorMsg.includes(" — ") && (
                      <div className="flex items-start gap-2 px-3 py-2.5"
                        style={{ borderTop: "1px solid #4a1a1a", background: "#1a1500" }}>
                        <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-300 leading-relaxed">
                          {errorMsg.split(" — ").slice(1).join(" — ")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {hasFailed && failedDiff && (
                  <TraceDiffBlock
                    expected={failedDiff.expected}
                    received={failedDiff.received}
                    message={failedDiff.message}
                  />
                )}
                {hasLogData ? (
                  <>
                    {logInput !== undefined && <DataBlock label="Input" data={logInput} />}
                    {logOutput !== undefined && <DataBlock label="Output" data={logOutput} isError={hasFailed} />}
                  </>
                ) : cursor?.output ? (
                  <DataBlock label="Output" data={cursor.output} isError={hasFailed} />
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
  const expectedSchema = DEFAULT_SCHEMAS[node.data?.backendType];
  const input = cursor.input || cursor.output;
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
  return {
    expected: expectedObj,
    received: receivedObj,
    message: missingField
      ? `The upstream node did not provide ${missingField === "email" ? "an email address" : `a value for "${missingField}"`}.`
      : cursor.error || "Execution failed at this step.",
  };
}
