import ivm from "isolated-vm";

const MIN_POOL_SIZE = 5;
const MAX_POOL_SIZE = 10;
const MEMORY_LIMIT_MB = 64;
const MAX_REUSES = 50;

export const EXECUTION_TIMEOUT_MS = 500;
export const MAX_VARIABLES_BYTES = 5 * 1024 * 1024;

const pool = [];
let activeCount = 0;

function createEntry() {
  return { isolate: new ivm.Isolate({ memoryLimit: MEMORY_LIMIT_MB }), useCount: 0 };
}

function isHealthy(entry) {
  return !entry.isolate.isDisposed && entry.useCount < MAX_REUSES;
}

function disposeEntry(entry) {
  try { if (!entry.isolate.isDisposed) entry.isolate.dispose(); } catch {}
}

export function warmPool() {
  const toCreate = MIN_POOL_SIZE - pool.length;
  for (let i = 0; i < toCreate; i++) pool.push(createEntry());
  console.log(`[IsolatePool] Warmed ${toCreate} isolates (pool: ${pool.length}, limit: ${MAX_POOL_SIZE})`);
}

export function acquire() {
  while (pool.length > 0) {
    const entry = pool.pop();
    if (isHealthy(entry)) { activeCount++; return entry; }
    disposeEntry(entry);
  }
  if (activeCount >= MAX_POOL_SIZE) {
    throw new Error(`Code Node: All ${MAX_POOL_SIZE} isolate slots are in use. Too many concurrent code executions — retry shortly.`);
  }
  activeCount++;
  return createEntry();
}

export function release(entry) {
  activeCount = Math.max(0, activeCount - 1);
  entry.useCount++;
  if (isHealthy(entry)) {
    pool.push(entry);
  } else {
    disposeEntry(entry);
    if (pool.length + activeCount < MIN_POOL_SIZE) pool.push(createEntry());
  }
}

export function discard(entry) {
  activeCount = Math.max(0, activeCount - 1);
  disposeEntry(entry);
  if (pool.length + activeCount < MIN_POOL_SIZE) pool.push(createEntry());
}

export async function executeInPool(code, variables) {
  const serialized = JSON.stringify(variables ?? {});
  if (Buffer.byteLength(serialized, "utf-8") > MAX_VARIABLES_BYTES) {
    throw new Error("Code Node: Variables payload exceeds 5 MB limit. Reduce input size upstream.");
  }

  const entry = acquire();

  try {
    const context = await entry.isolate.createContext();
    const jail = context.global;

    await jail.set("__vars", new ivm.ExternalCopy(variables ?? {}).copyInto());

    const wrapper = `
      (function () {
        const $input  = __vars;
        let   $output = JSON.parse(JSON.stringify(__vars));
        const console = { log() {}, warn() {}, error() {}, info() {} };
        ${code}
        return JSON.stringify($output);
      })()
    `;

    const script = await entry.isolate.compileScript(wrapper);
    const resultStr = script.runSync(context, { timeout: EXECUTION_TIMEOUT_MS });

    if (typeof resultStr !== "string") {
      throw new Error("Code Node: Script must return a value via $output. Got undefined.");
    }

    release(entry);
    return JSON.parse(resultStr);
  } catch (err) {
    if (entry.isolate.isDisposed || err.message.includes("disposed") || err.message.includes("out of memory")) {
      discard(entry);
    } else {
      release(entry);
    }

    if (err.message.includes("Script execution timed out")) {
      throw new Error(`Code Node: Execution timed out after ${EXECUTION_TIMEOUT_MS}ms. Check for infinite loops or expensive operations.`);
    }
    if (err.message.includes("disposed") || err.message.includes("out of memory")) {
      throw new Error(`Code Node: Isolate killed — exceeded ${MEMORY_LIMIT_MB}MB memory limit.`);
    }
    if (err.message.includes("CompileError") || err.message.includes("SyntaxError")) {
      throw new Error(`Code Node: Compilation failed — ${err.message}`);
    }
    throw new Error(`Code Node: Execution failed — ${err.message}`);
  }
}

export function drainPool() {
  while (pool.length > 0) {
    const entry = pool.pop();
    disposeEntry(entry);
  }
  console.log("[IsolatePool] Drained — all isolates disposed.");
}

export function poolStats() {
  return { available: pool.length, active: activeCount, total: pool.length + activeCount, maxSize: MAX_POOL_SIZE };
}
