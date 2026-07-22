/**
 * Isolate Pool — Warm Worker Contexts for Code Node Execution
 *
 * Maintains a pool of pre-created isolated-vm isolates to eliminate cold-start
 * latency (~50ms per isolate creation). Each isolate is a full V8 instance with
 * hard memory limits enforced at the C++ level.
 *
 * Pool behaviour:
 *   - On startup, pre-warms MIN_POOL_SIZE isolates in the background.
 *   - acquire() returns a warm isolate instantly if available, or creates a
 *     fresh one on-demand if the pool is exhausted (up to MAX_POOL_SIZE).
 *   - release() resets the isolate's context and returns it to the pool.
 *     Isolates that have been used too many times are disposed and replaced
 *     to prevent memory fragmentation.
 *   - Isolates that get OOM-killed or corrupted are detected and discarded.
 *
 * Limits:
 *   - 64 MB memory per isolate (V8 hard cap — process survives OOM)
 *   - 500 ms wall-clock execution timeout (infinite loop protection)
 */

import ivm from "isolated-vm";

// ── Configuration ─────────────────────────────────────────────────────────────

const MIN_POOL_SIZE = 5;
const MAX_POOL_SIZE = 10;
const MEMORY_LIMIT_MB = 64;
const MAX_REUSES = 50; // Dispose after N executions to prevent heap fragmentation

export const EXECUTION_TIMEOUT_MS = 500;
export const MAX_EXECUTION_TIMEOUT_MS = 5000;
export const MAX_VARIABLES_BYTES = 5 * 1024 * 1024; // 5 MB payload guard

// ── Pool Entry ────────────────────────────────────────────────────────────────

interface PoolEntry {
  isolate: ivm.Isolate;
  useCount: number;
}

// ── Pool State ────────────────────────────────────────────────────────────────

const pool: PoolEntry[] = [];
let activeCount = 0; // entries currently checked out

// ── Internal Helpers ──────────────────────────────────────────────────────────

function createEntry(): PoolEntry {
  return {
    isolate: new ivm.Isolate({ memoryLimit: MEMORY_LIMIT_MB }),
    useCount: 0,
  };
}

function isHealthy(entry: PoolEntry): boolean {
  return !entry.isolate.isDisposed && entry.useCount < MAX_REUSES;
}

function disposeEntry(entry: PoolEntry): void {
  try {
    if (!entry.isolate.isDisposed) {
      entry.isolate.dispose();
    }
  } catch {
    // Already disposed — ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pre-warm the pool with MIN_POOL_SIZE isolates.
 * Call once at server boot (non-blocking — errors are swallowed).
 */
export function warmPool(): void {
  const toCreate = MIN_POOL_SIZE - pool.length;
  for (let i = 0; i < toCreate; i++) {
    pool.push(createEntry());
  }
  console.log(
    `[IsolatePool] Warmed ${toCreate} isolates (pool: ${pool.length}, limit: ${MAX_POOL_SIZE})`,
  );
}

/**
 * Acquire a warm isolate from the pool. Returns instantly if one is available,
 * otherwise creates a fresh isolate on-demand.
 */
export function acquire(): PoolEntry {
  // Try to grab a healthy entry from the pool
  while (pool.length > 0) {
    const entry = pool.pop()!;
    if (isHealthy(entry)) {
      activeCount++;
      return entry;
    }
    // Unhealthy — dispose and try the next one
    disposeEntry(entry);
  }

  // Pool exhausted — create on-demand (up to MAX_POOL_SIZE active)
  if (activeCount >= MAX_POOL_SIZE) {
    throw new Error(
      `Code Node: All ${MAX_POOL_SIZE} isolate slots are in use. ` +
        "Too many concurrent code executions — retry shortly.",
    );
  }

  activeCount++;
  return createEntry();
}

/**
 * Return an isolate to the pool after use.
 * Stale or unhealthy isolates are disposed and replaced.
 */
export function release(entry: PoolEntry): void {
  activeCount = Math.max(0, activeCount - 1);
  entry.useCount++;

  if (isHealthy(entry)) {
    pool.push(entry);
  } else {
    // Dispose the worn-out isolate
    disposeEntry(entry);
    // Replenish pool to MIN_POOL_SIZE if below threshold
    if (pool.length + activeCount < MIN_POOL_SIZE) {
      pool.push(createEntry());
    }
  }
}

/**
 * Force-release a broken isolate (OOM, disposed mid-execution).
 * Does not return it to the pool — creates a replacement if needed.
 */
export function discard(entry: PoolEntry): void {
  activeCount = Math.max(0, activeCount - 1);
  disposeEntry(entry);

  // Replenish if pool is below minimum
  if (pool.length + activeCount < MIN_POOL_SIZE) {
    pool.push(createEntry());
  }
}

/**
 * Execute user code inside a pooled isolate with strict limits.
 * Handles acquire/release/discard lifecycle automatically.
 *
 * @returns The parsed result of $output from the user's code.
 */
export async function executeInPool(
  code: string,
  variables: Record<string, unknown>,
  options: {
    timeout?: number;
    onConsole?: (logs: { level: string; text: string }[]) => void;
  } = {},
): Promise<unknown> {
  // Pre-flight: reject oversized payloads before touching the pool
  const serialized = JSON.stringify(variables ?? {});
  if (Buffer.byteLength(serialized, "utf-8") > MAX_VARIABLES_BYTES) {
    throw new Error(
      "Code Node: Variables payload exceeds 5 MB limit. Reduce input size upstream.",
    );
  }

  const timeoutMs = Math.min(
    MAX_EXECUTION_TIMEOUT_MS,
    Math.max(100, Number(options.timeout) || EXECUTION_TIMEOUT_MS),
  );
  const entry = acquire();

  try {
    const context = await entry.isolate.createContext();
    const jail = context.global;

    // Inject variables via deep-copy (no host references leak in)
    await jail.set(
      "__vars",
      new ivm.ExternalCopy(variables ?? {}).copyInto(),
    );

    const wrapper = `
      (function () {
        const $input = __vars;
        const input  = __vars;
        let   $output = JSON.parse(JSON.stringify(__vars));

        const __logs = [];
        const __fmt = function (args) {
          return Array.prototype.map.call(args, function (x) {
            if (typeof x === "string") return x;
            try { return JSON.stringify(x); } catch (e) { return String(x); }
          }).join(" ");
        };
        const __push = function (level, args) {
          if (__logs.length >= 200) return;
          var text = __fmt(args);
          if (text.length > 2000) text = text.slice(0, 2000) + "…";
          __logs.push({ level: level, text: text });
        };
        const console = {
          log:   function () { __push("log", arguments); },
          info:  function () { __push("info", arguments); },
          warn:  function () { __push("warn", arguments); },
          error: function () { __push("error", arguments); },
          debug: function () { __push("log", arguments); },
        };

        const __ret = (function () {
          ${code}
        })();

        return JSON.stringify({ data: __ret !== undefined ? __ret : $output, logs: __logs });
      })()
    `;

    const script = await entry.isolate.compileScript(wrapper);

    // runSync with wall-clock timeout — kills infinite loops at the V8 level
    const resultStr = script.runSync(context, {
      timeout: timeoutMs,
    });

    if (typeof resultStr !== "string") {
      throw new Error(
        "Code Node: Script must return a value via $output. Got undefined.",
      );
    }

    // Success — return to pool
    release(entry);
    const envelope = JSON.parse(resultStr) as {
      data: unknown;
      logs?: { level: string; text: string }[];
    };
    if (options.onConsole && Array.isArray(envelope.logs)) {
      options.onConsole(envelope.logs);
    }
    return envelope.data;
  } catch (err: unknown) {
    const error = err as Error;

    // Determine if the isolate is still usable
    if (
      entry.isolate.isDisposed ||
      error.message.includes("disposed") ||
      error.message.includes("out of memory")
    ) {
      // Isolate is dead — discard and replace
      discard(entry);
    } else {
      // Isolate survived (timeout, syntax error, etc.) — return to pool
      release(entry);
    }

    // Translate errors into user-friendly messages
    if (error.message.includes("Script execution timed out")) {
      throw new Error(
        `Code Node: Execution timed out after ${timeoutMs}ms. ` +
          "Check for infinite loops or expensive operations.",
      );
    }
    if (
      error.message.includes("disposed") ||
      error.message.includes("out of memory")
    ) {
      throw new Error(
        `Code Node: Isolate killed — exceeded ${MEMORY_LIMIT_MB}MB memory limit.`,
      );
    }
    if (
      error.message.includes("CompileError") ||
      error.message.includes("SyntaxError")
    ) {
      throw new Error(`Code Node: Compilation failed — ${error.message}`);
    }

    throw new Error(`Code Node: Execution failed — ${error.message}`);
  }
}

/**
 * Drain and dispose all isolates. Call on graceful shutdown.
 */
export function drainPool(): void {
  while (pool.length > 0) {
    const entry = pool.pop()!;
    disposeEntry(entry);
  }
  console.log("[IsolatePool] Drained — all isolates disposed.");
}

/**
 * Pool diagnostics for monitoring/health checks.
 */
export function poolStats(): {
  available: number;
  active: number;
  total: number;
  maxSize: number;
} {
  return {
    available: pool.length,
    active: activeCount,
    total: pool.length + activeCount,
    maxSize: MAX_POOL_SIZE,
  };
}
