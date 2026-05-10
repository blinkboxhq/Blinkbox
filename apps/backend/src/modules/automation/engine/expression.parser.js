/**
 * Expression Parser — Resolve {{ }} Templates in Node Config
 *
 * Supports full JavaScript expressions inside {{ }} delimiters:
 *   {{ $json.users.map(u => u.name).join(', ') }}
 *   {{ $json.total * 1.1 }}
 *   {{ $json.items.filter(i => i.active).length }}
 *   {{ $node["http-request-1"].status === 200 ? "ok" : "fail" }}
 *
 * Execution environment (available inside {{ }}):
 *   $json      — current item's data (the node's input payload)
 *   $node      — map of nodeId → output from earlier nodes in the DAG
 *   $runIndex  — current item index (for loop/batch nodes)
 *   $ctx       — alias for $node (shorthand)
 *   Math, Date, JSON, String, Number, Array, Object, parseInt, parseFloat,
 *   isNaN, isFinite, encodeURIComponent, decodeURIComponent
 *
 * Safety:
 *   - Runs inside a pooled isolated-vm V8 context (64 MB, 500 ms hard limits)
 *   - No require, process, fs, net, fetch, or host global access
 *   - Pure and deterministic — safe for Temporal replay
 *   - Depth-limited recursive resolution (max 20 levels)
 */

import { acquire, release, discard, EXECUTION_TIMEOUT_MS } from "../../../infra/isolate.pool.js";

const MAX_RESOLVE_DEPTH = 20;

// Timeout for expression evaluation (shorter than code node — expressions
// should be simple transforms, not full programs)
const EXPR_TIMEOUT_MS = Math.min(EXECUTION_TIMEOUT_MS, 200);

/**
 * Evaluate a JavaScript expression string against a data context.
 * Uses a pooled isolate for near-zero cold-start latency.
 */
function evaluateExpression(expression, $json, $node, $runIndex) {
  const entry = acquire();

  try {
    const context = entry.isolate.createContextSync();
    const jail = context.global;

    // Serialize context data — handle non-serializable values gracefully
    let safeJson;
    try {
      safeJson = JSON.stringify($json || {});
    } catch {
      safeJson = "{}";
    }

    // Flatten execution context: nodeId → first output's json
    const flatContext = {};
    if ($node && typeof $node === "object") {
      for (const [nodeId, outputs] of Object.entries($node)) {
        if (Array.isArray(outputs) && outputs.length > 0) {
          flatContext[nodeId] = outputs[0].json || outputs[0];
        }
      }
    }
    let safeContext;
    try {
      safeContext = JSON.stringify(flatContext);
    } catch {
      safeContext = "{}";
    }

    // Inject serialized data into the isolate
    jail.setSync("__raw_json", safeJson);
    jail.setSync("__raw_context", safeContext);
    jail.setSync("__run_index", typeof $runIndex === "number" ? $runIndex : 0);

    // Rewrite hyphenated node ID references into bracket notation
    const nodeIds = $node && typeof $node === "object" ? Object.keys($node) : [];
    const safeExpression = rewriteHyphenatedRefs(expression, nodeIds);

    // The wrapper script provides the full expression environment:
    //   - $json for current item data
    //   - $node / $ctx for cross-node references
    //   - $runIndex for batch position
    //   - Standard JS builtins (Array methods, Math, Date, JSON, String ops)
    //   - Proxy-based scope so bare node IDs resolve to $ctx entries
    const script = entry.isolate.compileScriptSync(`
      (() => {
        const $json     = JSON.parse(__raw_json);
        const $ctx      = JSON.parse(__raw_context);
        const $node     = $ctx;
        const $runIndex = __run_index;

        const scope = new Proxy(
          { $json, $node, $ctx, $runIndex, Math, Date, JSON,
            String, Number, Array, Object, Boolean, RegExp,
            parseInt, parseFloat, isNaN, isFinite,
            encodeURIComponent, decodeURIComponent },
          {
            has(t, k) { return k in t || k in $ctx; },
            get(t, k) { return k in t ? t[k] : $ctx[k]; },
          },
        );

        with (scope) { return ${safeExpression}; }
      })();
    `);

    const result = script.runSync(context, { timeout: EXPR_TIMEOUT_MS });
    release(entry);
    return result;
  } catch (err) {
    // Determine if the isolate is still usable
    if (
      entry.isolate.isDisposed ||
      err.message.includes("disposed") ||
      err.message.includes("out of memory")
    ) {
      discard(entry);
    } else {
      release(entry);
    }

    console.warn(`Expression evaluation failed: {{ ${expression} }}`, err.message);
    return null;
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rewrites expressions that reference hyphenated node IDs into valid JS.
 * e.g. "anthropic-abc-123.result" → '$ctx["anthropic-abc-123"].result'
 */
function rewriteHyphenatedRefs(expr, nodeIds) {
  const sorted = [...nodeIds].sort((a, b) => b.length - a.length);
  let rewritten = expr;
  for (const id of sorted) {
    if (!id.includes("-")) continue;
    // Only process IDs that are safe alphanumeric+hyphen+underscore — reject anything else
    // to prevent regex injection or template breakout
    if (!/^[\w-]+$/.test(id)) continue;
    const pattern = new RegExp(`(?<!['"\\w])${escapeRegex(id)}(?=\\.|$|\\s|\\[)`, "g");
    rewritten = rewritten.replace(pattern, `$ctx["${id}"]`);
  }
  return rewritten;
}

/**
 * Recursively scans a configuration object and evaluates {{ expressions }}.
 *
 * @param config          — node config (may contain {{ }} at any depth)
 * @param currentItem     — $json: the current input item's data
 * @param executionContext — $node: map of nodeId → outputs from earlier nodes
 * @param itemIndex       — $runIndex: current item position in batch
 */
export function resolveConfig(
  config,
  currentItem,
  executionContext,
  itemIndex,
  _depth = 0,
) {
  if (_depth > MAX_RESOLVE_DEPTH) {
    console.warn("resolveConfig exceeded max depth");
    return config;
  }

  if (config === null || config === undefined) return config;

  if (typeof config === "string") {
    // Strip zero-width characters that copy/paste can introduce
    config = config.replace(/[\u200B-\u200D\uFEFF]/g, "");

    const regex = /\{\{([\s\S]+?)\}\}/g;

    // If the entire string is a single {{ expression }}, return the raw
    // result (preserves type — objects, arrays, numbers stay as-is)
    const exactMatch = config.match(/^\{\{([\s\S]+?)\}\}$/);
    if (exactMatch) {
      return evaluateExpression(
        exactMatch[1].trim(),
        currentItem,
        executionContext,
        itemIndex,
      );
    }

    // Mixed template: "Hello {{ $json.name }}, you have {{ $json.count }} items"
    // Each {{ }} is evaluated and coerced to string for interpolation.
    return config.replace(regex, (_, expression) => {
      const result = evaluateExpression(
        expression.trim(),
        currentItem,
        executionContext,
        itemIndex,
      );
      return result !== undefined && result !== null ? String(result) : "";
    });
  }

  if (Array.isArray(config)) {
    return config.map((item) =>
      resolveConfig(item, currentItem, executionContext, itemIndex, _depth + 1),
    );
  }

  if (typeof config === "object") {
    const resolved = {};
    for (const [key, value] of Object.entries(config)) {
      resolved[key] = resolveConfig(
        value,
        currentItem,
        executionContext,
        itemIndex,
        _depth + 1,
      );
    }
    return resolved;
  }

  return config;
}
