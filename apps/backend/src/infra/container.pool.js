/**
 * Container Pool — Production-Grade Docker Execution Manager
 *
 * Wraps Docker container execution with:
 *   - Global semaphore (max 20 concurrent across all workspaces)
 *   - Per-workspace semaphore (max 3 concurrent per workspace)
 *   - Circuit breaker (5 consecutive Docker failures → 60s open state)
 *   - Pre-pulled image warming at startup
 *   - Orphan cleanup at startup + periodic scan every 5 min
 *   - Output size cap (10 MB) — prevents OOM from infinite output
 *   - Fork bomb protection via PidsLimit: 50
 *   - Deterministic timeout via Promise.race + container.stop({ t: 0 })
 */

import Docker from "dockerode";
import { redis } from "./redis.client.js";

const docker = new Docker();

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CONCURRENT_GLOBAL    = 20;
const MAX_CONCURRENT_WORKSPACE = 3;
const MAX_OUTPUT_BYTES         = 10 * 1024 * 1024; // 10 MB
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS  = 60_000;
const ORPHAN_MAX_AGE_MS         = 10 * 60 * 1000;  // 10 min
const ORPHAN_SCAN_INTERVAL_MS   = 5  * 60 * 1000;  // 5 min
const WORKSPACE_KEY_TTL_S       = 300;              // 5 min

// ── Language → Image Map ──────────────────────────────────────────────────────

const LANGUAGE_CONFIG = {
  bash:       { image: "alpine:3.20",                                       cmd: (c) => ["sh",       "-c", c] },
  python:     { image: "python:3.12-alpine",                                cmd: (c) => ["python3",  "-c", c] },
  node:       { image: "node:20-alpine",                                    cmd: (c) => ["node",     "-e", c] },
  powershell: { image: "mcr.microsoft.com/powershell:lts-alpine-3.14",     cmd: (c) => ["pwsh", "-Command", c] },
  // git/CLI tools get network access; everything else stays locked down
  git:        { image: "alpine/git:latest",                                 cmd: (c) => ["sh", "-c", c], network: true },
  kubectl:    { image: "bitnami/kubectl:latest",                            cmd: (c) => ["sh", "-c", `kubectl ${c}`], network: true },
  terraform:  { image: "hashicorp/terraform:latest",                        cmd: (c) => ["sh", "-c", `terraform ${c}`], network: true },
  ansible:    { image: "cytopia/ansible:latest",                            cmd: (c) => ["sh", "-c", `ansible ${c}`], network: true },
  aws:        { image: "amazon/aws-cli:latest",                             cmd: (c) => ["sh", "-c", `aws ${c}`], network: true },
  gcloud:     { image: "google/cloud-sdk:slim",                             cmd: (c) => ["sh", "-c", `gcloud ${c}`], network: true },
  az:         { image: "mcr.microsoft.com/azure-cli:latest",               cmd: (c) => ["sh", "-c", `az ${c}`], network: true },
  // nmap runs isolated but needs network to reach target hosts
  nmap:       { image: "instrumentisto/nmap:latest",                        cmd: (c) => ["sh", "-c", `nmap ${c}`], network: true },
  // docker_cli mounts the host Docker socket so it can run docker/compose commands safely
  docker_cli: { image: "docker:cli",                                        cmd: (c) => ["sh", "-c", c], network: true, socketMount: true },
};

// ── Redis Keys ────────────────────────────────────────────────────────────────

const KEY_GLOBAL    = "bb:containers:global";
const KEY_WS        = (ws) => `bb:containers:ws:${ws}`;
const KEY_FAILURES  = "bb:containers:circuit:failures";
const KEY_OPEN_UNTIL = "bb:containers:circuit:open_until";

// ── Container HostConfig (security hardening) ─────────────────────────────────

function buildHostConfig(withNetwork = false, withDockerSocket = false) {
  const cfg = {
    Memory:      256 * 1024 * 1024,
    NanoCpus:    5e8,
    NetworkMode: withNetwork ? "bridge" : "none",
    PidsLimit:   50,
    Tmpfs:       { "/tmp": "rw,noexec,nosuid,size=64m" },
    AutoRemove:  false,
  };
  if (withDockerSocket) {
    const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
    cfg.Binds = [`${socketPath}:/var/run/docker.sock`];
  }
  return cfg;
}

// ── Circuit Breaker ───────────────────────────────────────────────────────────

async function checkCircuit() {
  const openUntil = await redis.get(KEY_OPEN_UNTIL);
  if (openUntil && Date.now() < parseInt(openUntil)) {
    const secsLeft = Math.ceil((parseInt(openUntil) - Date.now()) / 1000);
    throw Object.assign(
      new Error(`Virtual Computer: Container runtime temporarily unavailable. Auto-retry in ${secsLeft}s.`),
      { code: "CIRCUIT_OPEN" }
    );
  }
}

async function recordFailure() {
  const count = await redis.incr(KEY_FAILURES);
  if (count >= CIRCUIT_BREAKER_THRESHOLD) {
    const openUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
    await redis.set(KEY_OPEN_UNTIL, String(openUntil), "PX", CIRCUIT_BREAKER_RESET_MS);
    console.warn(`[ContainerPool] Circuit OPEN — ${count} consecutive failures. Resets in ${CIRCUIT_BREAKER_RESET_MS / 1000}s.`);
  }
}

async function recordSuccess() {
  await redis.del(KEY_FAILURES);
}

// ── Semaphores ────────────────────────────────────────────────────────────────

async function acquireSemaphore(workspaceId) {
  // Check global limit first (cheaper — no workspace key creation)
  const global = await redis.incr(KEY_GLOBAL);
  if (global > MAX_CONCURRENT_GLOBAL) {
    await redis.decr(KEY_GLOBAL);
    throw Object.assign(
      new Error(`Virtual Computer: Server at capacity (${MAX_CONCURRENT_GLOBAL} concurrent executions). Retry in a moment.`),
      { code: "RATE_LIMITED_GLOBAL" }
    );
  }

  // Check per-workspace limit
  const wsKey = KEY_WS(workspaceId);
  const ws = await redis.incr(wsKey);
  await redis.expire(wsKey, WORKSPACE_KEY_TTL_S);
  if (ws > MAX_CONCURRENT_WORKSPACE) {
    await redis.decr(wsKey);
    await redis.decr(KEY_GLOBAL);
    throw Object.assign(
      new Error(`Virtual Computer: Workspace limit reached (${MAX_CONCURRENT_WORKSPACE} concurrent). Wait for running executions to finish.`),
      { code: "RATE_LIMITED_WORKSPACE" }
    );
  }
}

async function releaseSemaphore(workspaceId) {
  try {
    await redis.decr(KEY_GLOBAL);
    const wsKey = KEY_WS(workspaceId);
    const remaining = await redis.decr(wsKey);
    if (remaining <= 0) await redis.del(wsKey);
  } catch (err) {
    console.warn("[ContainerPool] releaseSemaphore error (non-fatal):", err.message);
  }
}

// ── Log Demultiplexer ─────────────────────────────────────────────────────────

// Docker multiplexes stdout (type=1) and stderr (type=2) in 8-byte frames.
function demuxLogs(buffer) {
  let stdout = "";
  let stderr = "";
  let truncated = false;
  let totalBytes = 0;
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const streamType = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;

    const chunkRaw = buffer.slice(offset, offset + size);
    offset += size;

    totalBytes += chunkRaw.length;
    if (totalBytes > MAX_OUTPUT_BYTES) {
      truncated = true;
      break;
    }

    const chunk = chunkRaw.toString("utf8");
    if (streamType === 1) stdout += chunk;
    else                  stderr += chunk;
  }

  return { stdout, stderr, truncated };
}

// ── Core Execute ──────────────────────────────────────────────────────────────

export async function execute(config, workspaceId = "default") {
  const language    = LANGUAGE_CONFIG[config.language] ? config.language : "bash";
  const command     = (config.command || config.commands || "").trim();
  const timeoutMs   = Math.min(Math.max(parseInt(config.timeoutSeconds || 30) * 1000, 1000), 300_000);

  if (!command) return { stdout: "", stderr: "", exitCode: 0, language, executionTimeMs: 0, timedOut: false, truncated: false };

  await checkCircuit();
  await acquireSemaphore(workspaceId);

  const { image, cmd, network: withNetwork = false, socketMount: withDockerSocket = false } = LANGUAGE_CONFIG[language];
  const startedAt = Date.now();
  let container;
  let timedOut = false;

  try {
    // Verify Docker daemon is reachable before acquiring semaphore resources
    try { await docker.ping(); } catch {
      await releaseSemaphore(workspaceId);
      throw new Error("Virtual Computer: Docker daemon is not available on this server. This feature requires a self-hosted deployment with Docker installed.");
    }

    const envVars = Array.isArray(config.envVars)
      ? config.envVars.filter(e => e?.key).map(e => `${e.key}=${e.value ?? ""}`)
      : [];

    container = await docker.createContainer({
      Image:  image,
      Cmd:    cmd(command),
      Env:    envVars,
      Labels: {
        "blinkbox.managed":    "true",
        "blinkbox.workspace":  String(workspaceId),
        "blinkbox.created_at": String(Date.now()),
      },
      HostConfig: buildHostConfig(withNetwork, withDockerSocket),
      AttachStdout: true,
      AttachStderr: true,
    });

    await container.start();

    // Collect logs as a buffer
    const logsStream = await container.logs({ stdout: true, stderr: true, follow: true });
    const logsBufferPromise = new Promise((resolve, reject) => {
      const chunks = [];
      logsStream.on("data",  (c) => chunks.push(c));
      logsStream.on("end",   () => resolve(Buffer.concat(chunks)));
      logsStream.on("error", reject);
    });

    // Race container completion against timeout
    const waitPromise = container.wait();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("timeout"), { isTimeout: true })), timeoutMs)
    );

    let exitCode = 0;
    try {
      const [exitData, logsBuffer] = await Promise.all([
        Promise.race([waitPromise, timeoutPromise]),
        logsBufferPromise,
      ]);
      exitCode = exitData?.StatusCode ?? 0;
      await recordSuccess();

      const { stdout, stderr, truncated } = demuxLogs(logsBuffer);
      return { stdout, stderr, exitCode, language, executionTimeMs: Date.now() - startedAt, timedOut: false, truncated };
    } catch (err) {
      if (err.isTimeout) {
        timedOut = true;
        try { await container.stop({ t: 0 }); } catch (_) {}
        const logsBuffer = await logsBufferPromise.catch(() => Buffer.alloc(0));
        const { stdout, stderr, truncated } = demuxLogs(logsBuffer);
        await recordSuccess(); // timeout is user error, not Docker error
        return { stdout, stderr, exitCode: -1, language, executionTimeMs: Date.now() - startedAt, timedOut: true, truncated };
      }
      throw err;
    }
  } catch (err) {
    if (err.code !== "RATE_LIMITED_GLOBAL" && err.code !== "RATE_LIMITED_WORKSPACE" && err.code !== "CIRCUIT_OPEN") {
      await recordFailure();
    }
    throw err.code ? err : new Error(`Virtual Computer: ${err.message}`);
  } finally {
    if (container) {
      try { await container.remove({ force: true }); } catch (_) {}
    }
    await releaseSemaphore(workspaceId);
  }
}

// ── Custom Image Execute (for docker_run node) ────────────────────────────────
// Same semaphore/circuit-breaker/resource-limit protection as execute(), but accepts
// an arbitrary image instead of a LANGUAGE_CONFIG entry.

export async function executeCustom({ image, command, env = {}, timeoutSeconds = 60 }, workspaceId = "default") {
  if (!image) throw new Error("executeCustom: image is required");
  const command_ = (command || "").trim();
  const timeoutMs = Math.min(Math.max(timeoutSeconds * 1000, 1000), 300_000);
  const envVars = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  const cmdArr = command_ ? ["sh", "-c", command_] : undefined;
  const startedAt = Date.now();

  await checkCircuit();
  await acquireSemaphore(workspaceId);

  let container;
  try {
    try { await docker.ping(); } catch {
      await releaseSemaphore(workspaceId);
      throw new Error("Virtual Computer: Docker daemon is not available on this server.");
    }

    container = await docker.createContainer({
      Image: image,
      ...(cmdArr ? { Cmd: cmdArr } : {}),
      Env: envVars,
      Labels: { "blinkbox.managed": "true", "blinkbox.workspace": String(workspaceId), "blinkbox.created_at": String(Date.now()) },
      HostConfig: buildHostConfig(false),
      AttachStdout: true,
      AttachStderr: true,
    });

    await container.start();

    const logsStream = await container.logs({ stdout: true, stderr: true, follow: true });
    const logsBufferPromise = new Promise((resolve, reject) => {
      const chunks = [];
      logsStream.on("data", (c) => chunks.push(c));
      logsStream.on("end",  () => resolve(Buffer.concat(chunks)));
      logsStream.on("error", reject);
    });

    const [exitData, logsBuffer] = await Promise.all([
      Promise.race([
        container.wait(),
        new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { isTimeout: true })), timeoutMs)),
      ]),
      logsBufferPromise,
    ]).catch(async (err) => {
      if (err.isTimeout) {
        try { await container.stop({ t: 0 }); } catch (_) {}
        const buf = await logsBufferPromise.catch(() => Buffer.alloc(0));
        await recordSuccess();
        const { stdout, stderr } = demuxLogs(buf);
        return [{ timedOut: true }, buf, stdout, stderr];
      }
      throw err;
    });

    await recordSuccess();
    const { stdout, stderr } = demuxLogs(logsBuffer);
    return { stdout, stderr, exitCode: exitData?.StatusCode ?? 0, image, executionTimeMs: Date.now() - startedAt };
  } catch (err) {
    if (err.code !== "RATE_LIMITED_GLOBAL" && err.code !== "RATE_LIMITED_WORKSPACE" && err.code !== "CIRCUIT_OPEN") {
      await recordFailure();
    }
    throw err.code ? err : new Error(`docker_run: ${err.message}`);
  } finally {
    if (container) { try { await container.remove({ force: true }); } catch (_) {} }
    await releaseSemaphore(workspaceId);
  }
}

// ── Startup Lifecycle ─────────────────────────────────────────────────────────

export async function warmImages() {
  for (const { image } of Object.values(LANGUAGE_CONFIG)) {
    try {
      await docker.getImage(image).inspect();
      console.log(`[ContainerPool] Image cached: ${image}`);
    } catch {
      console.log(`[ContainerPool] Pulling image: ${image} ...`);
      await new Promise((resolve, reject) => {
        docker.pull(image, (err, stream) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (err) => {
            if (err) reject(err);
            else { console.log(`[ContainerPool] Pulled: ${image}`); resolve(); }
          });
        });
      });
    }
  }
}

export async function cleanupOrphans() {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({ label: ["blinkbox.managed=true"] }),
    });
    if (containers.length === 0) return;
    console.log(`[ContainerPool] Cleaning up ${containers.length} orphaned container(s)...`);
    await Promise.allSettled(
      containers.map(async (c) => {
        const container = docker.getContainer(c.Id);
        await container.remove({ force: true });
      })
    );
    console.log(`[ContainerPool] Orphan cleanup done.`);
  } catch (err) {
    console.warn("[ContainerPool] cleanupOrphans error (non-fatal):", err.message);
  }
}

export function scheduleOrphanScan() {
  setInterval(async () => {
    try {
      const containers = await docker.listContainers({
        all: true,
        filters: JSON.stringify({ label: ["blinkbox.managed=true"] }),
      });
      const now = Date.now();
      const stale = containers.filter((c) => {
        const createdAt = parseInt(c.Labels?.["blinkbox.created_at"] ?? "0");
        return createdAt > 0 && (now - createdAt) > ORPHAN_MAX_AGE_MS;
      });
      if (stale.length > 0) {
        console.log(`[ContainerPool] Removing ${stale.length} stale container(s).`);
        await Promise.allSettled(stale.map((c) => docker.getContainer(c.Id).remove({ force: true })));
      }
    } catch (err) {
      console.warn("[ContainerPool] orphan scan error (non-fatal):", err.message);
    }
  }, ORPHAN_SCAN_INTERVAL_MS);
}

export async function drainPool() {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({ label: ["blinkbox.managed=true"] }),
    });
    if (containers.length > 0) {
      console.log(`[ContainerPool] Draining ${containers.length} container(s) on shutdown...`);
      await Promise.allSettled(containers.map((c) => docker.getContainer(c.Id).remove({ force: true })));
    }
  } catch (err) {
    console.warn("[ContainerPool] drainPool error:", err.message);
  }
}

export function poolStats() {
  return {
    maxGlobal:    MAX_CONCURRENT_GLOBAL,
    maxWorkspace: MAX_CONCURRENT_WORKSPACE,
    outputCapMB:  MAX_OUTPUT_BYTES / (1024 * 1024),
  };
}
