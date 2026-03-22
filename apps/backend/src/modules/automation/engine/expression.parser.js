import ivm from "isolated-vm";

const MAX_RESOLVE_DEPTH = 20;

/**
 * Rewrites expressions that reference hyphenated node IDs into valid JS.
 * e.g. "anthropic-abc-123.result" → '$ctx["anthropic-abc-123"].result'
 * This is needed because hyphens are subtraction operators in JS.
 */
function rewriteHyphenatedRefs(expr, nodeIds) {
  // Sort longest first so more specific IDs match before prefixes
  const sorted = [...nodeIds].sort((a, b) => b.length - a.length);
  let rewritten = expr;
  for (const id of sorted) {
    if (!id.includes("-")) continue;
    // Node IDs are alphanumeric + hyphens, only escape the hyphens
    const escaped = id.replace(/-/g, "\\-");
    const pattern = new RegExp(`(?<!['"\\w])${escaped}(?=\\.|$|\\s|\\[)`, "g");
    rewritten = rewritten.replace(pattern, `$ctx["${id}"]`);
  }
  return rewritten;
}

/**
 * Executes the string as JavaScript within a heavily restricted V8 Isolate
 */
function evaluateExpression(expression, $json, $node, $runIndex) {
  const isolate = new ivm.Isolate({ memoryLimit: 8 });

  try {
    const context = isolate.createContextSync();
    const jail = context.global;

    // Safe serialization — handle non-serializable values
    let safeJson;
    try {
      safeJson = JSON.stringify($json || {});
    } catch (e) {
      console.warn("Failed to serialize $json for expression:", e.message);
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

    jail.setSync("__raw_json", safeJson);
    jail.setSync("__raw_context", safeContext);

    // Rewrite hyphenated node ID refs into bracket notation before eval
    const nodeIds = ($node && typeof $node === "object") ? Object.keys($node) : [];
    const safeExpression = rewriteHyphenatedRefs(expression, nodeIds);

    const script = isolate.compileScriptSync(`
      (() => {
        const $json = JSON.parse(__raw_json);
        const $ctx  = JSON.parse(__raw_context);
        const Math  = globalThis.Math;
        const Date  = globalThis.Date;

        const scope = new Proxy({ $json, Math, Date }, {
          has(t, k) { return k in t || k in $ctx; },
          get(t, k) { return k in t ? t[k] : $ctx[k]; },
        });

        with (scope) { return ${safeExpression}; }
      })();
    `);

    const result = script.runSync(context, { timeout: 50 });
    return result;
  } catch (err) {
    console.warn(`Expression evaluation failed: ${expression}`, err.message);
    return null;
  } finally {
    isolate.dispose();
  }
}

/**
 * Recursively scans a configuration object and evaluates {{ expressions }}
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

    const exactMatch = config.match(/^\{\{([\s\S]+?)\}\}$/);
    if (exactMatch) {
      return evaluateExpression(
        exactMatch[1].trim(),
        currentItem,
        executionContext,
        itemIndex,
      );
    }

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
