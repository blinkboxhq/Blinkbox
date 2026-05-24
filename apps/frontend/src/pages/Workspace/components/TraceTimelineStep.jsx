import { useState } from "react";
import { Check, X, Loader2, ChevronDown, ChevronRight, RefreshCw, Clock, Brain, Wrench, Sparkles, AlertTriangle } from "lucide-react";
import TraceDiffBlock from "./TraceDiffBlock";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";

function formatDuration(ms) {
  if (!ms || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function JsonBlock({ label, data, labelColor = "text-zinc-500" }) {
  return (
    <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 overflow-hidden">
      <div className={`px-3 py-1.5 border-b border-zinc-800 text-[9px] font-bold uppercase tracking-widest ${labelColor}`}>
        {label}
      </div>
      <pre className="text-[10px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap break-all px-3 py-2.5 max-h-48 overflow-auto">
        {data === undefined || data === null ? "—" : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function AgentStepFeed({ steps, isRunning }) {
  if (steps.length === 0 && !isRunning) return null;

  return (
    <div className="mt-2 ml-[18px] flex flex-col gap-1.5">
      {steps.map((step, i) => {
        if (step.type === "thinking") {
          return (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <Brain className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
              <span className="text-violet-300/80 font-mono">
                Thinking… <span className="text-zinc-600">iteration {step.iteration}/{step.maxIterations}</span>
              </span>
            </div>
          );
        }
        if (step.type === "tool_call") {
          return (
            <div key={i} className="flex flex-col gap-0.5 bg-zinc-900/60 border border-zinc-800 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-[10px] font-semibold text-amber-300">{step.tool}</span>
                <span className="text-[9px] text-zinc-600 ml-auto">iter {step.iteration}</span>
              </div>
              {step.thought && (
                <p className="text-[9px] text-zinc-400 italic leading-relaxed line-clamp-2">{step.thought}</p>
              )}
              {step.args && Object.keys(step.args).length > 0 && (
                <pre className="text-[9px] text-zinc-500 font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(step.args, null, 2).slice(0, 200)}
                </pre>
              )}
            </div>
          );
        }
        if (step.type === "tool_result") {
          return (
            <div key={i} className="flex items-start gap-2 text-[10px] pl-1">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${step.ok ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className={`font-mono leading-relaxed break-all ${step.ok ? "text-zinc-400" : "text-red-400"}`}>
                {step.result?.slice(0, 200) || (step.ok ? "OK" : "Error")}
              </span>
            </div>
          );
        }
        if (step.type === "final_answer") {
          return (
            <div key={i} className="flex flex-col gap-1 bg-emerald-950/40 border border-emerald-800/30 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[10px] font-semibold text-emerald-300">Final Answer</span>
              </div>
              <p className="text-[9px] text-emerald-200/70 leading-relaxed break-all">{step.answer}</p>
            </div>
          );
        }
        if (step.type === "max_iterations") {
          return (
            <div key={i} className="flex items-center gap-1.5 text-[10px] bg-amber-950/30 border border-amber-800/30 rounded-lg px-2.5 py-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-amber-300">Max iterations reached ({step.iteration}/{step.maxIterations})</span>
            </div>
          );
        }
        return null;
      })}
      {isRunning && steps.length > 0 && steps[steps.length - 1]?.type !== "final_answer" && (
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Agent working…</span>
        </div>
      )}
    </div>
  );
}

export default function TraceTimelineStep({ node, cursor, isLast, isLive, nodeLogs = [], agentSteps = [] }) {
  const [expanded, setExpanded] = useState(false);

  const status = cursor ? cursor.status : (isLive ? "pending" : "idle");
  const hasFailed = status === "failed";
  const isCompleted = status === "completed";
  const isWaiting = status === "waiting";
  const isRunning = status === "running" || isWaiting;

  // Pull the most recent node_step log entry for this node
  const stepLog = nodeLogs.filter((l) => l.type === "node_step").slice(-1)[0] ?? null;
  const durationMs = stepLog?.durationMs ?? cursor?.durationMs ?? null;
  const retries = stepLog?.retries ?? cursor?.retries ?? 0;
  const logInput = stepLog?.input;
  const logOutput = stepLog?.output;
  const hasLogData = logInput !== undefined || logOutput !== undefined;

  // Build diff data for failed steps (schema mismatch detection)
  const failedDiff = hasFailed ? buildFailedDiff(node, cursor) : null;

  return (
    <div className="flex gap-4 min-h-[56px]">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        {isCompleted && (
          <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 z-10 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
        {isRunning && (
          <div className="w-6 h-6 rounded-full bg-zinc-900 border-2 border-blue-500 flex items-center justify-center shrink-0 z-10">
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
          </div>
        )}
        {hasFailed && (
          <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shrink-0 z-10 shadow-[0_0_8px_rgba(220,38,38,0.3)]">
            <X className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
        {(status === "pending" || status === "idle") && (
          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 z-10" />
        )}

        {!isLast && (
          <div
            className={`w-[1.5px] flex-1 my-1 rounded-full transition-colors ${
              isCompleted ? "bg-emerald-600/40" : hasFailed ? "bg-red-600/30" : "bg-zinc-800"
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className="pt-0.5 pb-4 flex-1 min-w-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full text-left group"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
          )}
          <span
            className={`text-sm font-semibold truncate flex-1 ${
              isCompleted ? "text-zinc-100" :
              hasFailed ? "text-red-400" :
              isRunning ? "text-blue-400" :
              "text-zinc-500"
            }`}
          >
            {node.data.label}
          </span>

          {/* Duration badge */}
          {durationMs != null && (
            <span className="flex items-center gap-0.5 shrink-0 text-[9px] font-mono text-zinc-600 ml-1">
              <Clock className="w-2.5 h-2.5" />
              {formatDuration(durationMs)}
            </span>
          )}

          {/* Retry badge */}
          {retries > 0 && (
            <span className="flex items-center gap-0.5 shrink-0 text-[9px] font-mono text-amber-500/80 ml-1">
              <RefreshCw className="w-2.5 h-2.5" />
              {retries}×
            </span>
          )}
        </button>

        {/* Status subtitle */}
        <p className="text-[10px] font-mono uppercase tracking-widest mt-0.5 ml-[18px]">
          {isRunning && !isWaiting && <span className="text-blue-400 animate-pulse">Processing...</span>}
          {isWaiting && <span className="text-amber-400 animate-pulse">Retrying...</span>}
          {isCompleted && <span className="text-emerald-500/70">Completed</span>}
          {hasFailed && <span className="text-red-400">FAILED</span>}
          {(status === "pending" || status === "idle") && (
            <span className="text-zinc-600">Waiting</span>
          )}
        </p>

        {/* AI Agent live step feed — always visible (not gated behind expand) */}
        {(node.data?.backendType === "ai_agent" || node.data?.type === "ai_agent") && (agentSteps.length > 0 || isRunning) && (
          <AgentStepFeed steps={agentSteps} isRunning={isRunning} />
        )}

        {/* Expanded: Input → Output from logs (preferred) or cursor.output fallback */}
        {expanded && (
          <div className="mt-2 ml-[18px] space-y-2">
            {hasLogData ? (
              <>
                <JsonBlock label="Input" data={logInput} labelColor="text-zinc-500" />
                <JsonBlock label="Output" data={logOutput} labelColor="text-emerald-600" />
              </>
            ) : cursor?.output ? (
              <JsonBlock label="Output" data={cursor.output} labelColor="text-emerald-600" />
            ) : null}
          </div>
        )}

        {/* Failed: schema diff */}
        {hasFailed && failedDiff && (
          <div className="ml-[18px]">
            <TraceDiffBlock
              expected={failedDiff.expected}
              received={failedDiff.received}
              message={failedDiff.message}
            />
          </div>
        )}

        {/* Failed: plain error message */}
        {hasFailed && cursor?.errorMessage && !failedDiff && (
          <div className="mt-2 ml-[18px] bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] text-red-300 font-mono leading-relaxed">
              {cursor.errorMessage.split(" — ")[0]}
            </p>
            {cursor.errorMessage.includes(" — ") && (
              <p className="text-[10px] text-amber-400/80 leading-relaxed flex items-start gap-1">
                <span className="shrink-0 mt-px">💡</span>
                <span>{cursor.errorMessage.split(" — ").slice(1).join(" — ")}</span>
              </p>
            )}
          </div>
        )}
        {hasFailed && cursor?.error && !cursor?.errorMessage && !failedDiff && (
          <div className="mt-2 ml-[18px] bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            <p className="text-[10px] text-red-300 font-mono leading-relaxed">{cursor.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function buildFailedDiff(node, cursor) {
  if (!cursor) return null;

  const backendType = node.data?.backendType;
  const expectedSchema = DEFAULT_SCHEMAS[backendType];
  const input = cursor.input || cursor.output;

  if (!expectedSchema || !input) return null;

  const mismatches = [];
  for (const [key] of Object.entries(expectedSchema)) {
    if (key.startsWith("_")) continue;
    const actualValue = input[key];
    if (actualValue === null || actualValue === undefined) {
      mismatches.push(key);
    }
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
