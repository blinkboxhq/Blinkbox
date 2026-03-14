import { useState } from "react";
import { Check, X, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import TraceDiffBlock from "./TraceDiffBlock";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";

/**
 * TraceTimelineStep — a single node in the execution trace timeline.
 *
 * @param {{ node: object, cursor: object|null, isLast: boolean, isLive: boolean }} props
 */
export default function TraceTimelineStep({ node, cursor, isLast, isLive }) {
  const [expanded, setExpanded] = useState(false);

  const status = cursor ? cursor.status : (isLive ? "pending" : "idle");
  const hasFailed = status === "failed";
  const isCompleted = status === "completed";
  const isRunning = status === "running" || status === "waiting";

  // Build diff data for failed steps
  const failedDiff = hasFailed ? buildFailedDiff(node, cursor) : null;

  return (
    <div className="flex gap-4 min-h-[56px]">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        {/* Status icon */}
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

        {/* Connecting line */}
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
            className={`text-sm font-semibold truncate ${
              isCompleted ? "text-zinc-100" :
              hasFailed ? "text-red-400" :
              isRunning ? "text-blue-400" :
              "text-zinc-500"
            }`}
          >
            {node.data.label}
          </span>
        </button>

        {/* Status subtitle */}
        <p className="text-[10px] font-mono uppercase tracking-widest mt-0.5 ml-[18px]">
          {isRunning && <span className="text-blue-400 animate-pulse">Processing...</span>}
          {isCompleted && <span className="text-emerald-500/70">Payload received</span>}
          {hasFailed && <span className="text-red-400">FAILED</span>}
          {(status === "pending" || status === "idle") && (
            <span className="text-zinc-600">Waiting</span>
          )}
        </p>

        {/* Expanded JSON payload */}
        {expanded && cursor?.output && (
          <div className="mt-2 ml-[18px] bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 max-h-48 overflow-auto">
            <pre className="text-[10px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
              {JSON.stringify(cursor.output, null, 2)}
            </pre>
          </div>
        )}

        {/* Failed diff block */}
        {hasFailed && failedDiff && (
          <div className="ml-[18px]">
            <TraceDiffBlock
              expected={failedDiff.expected}
              received={failedDiff.received}
              message={failedDiff.message}
            />
          </div>
        )}

        {/* Error message for failed steps */}
        {hasFailed && cursor?.error && !failedDiff && (
          <div className="mt-2 ml-[18px] bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            <p className="text-[10px] text-red-300 font-mono leading-relaxed">{cursor.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Build expected vs received diff data from a failed cursor.
 */
function buildFailedDiff(node, cursor) {
  if (!cursor) return null;

  const backendType = node.data?.backendType;
  const expectedSchema = DEFAULT_SCHEMAS[backendType];
  const input = cursor.input || cursor.output;

  if (!expectedSchema || !input) return null;

  // Find first field with null/missing value that the schema expects
  const mismatches = [];
  for (const [key, expectedType] of Object.entries(expectedSchema)) {
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
