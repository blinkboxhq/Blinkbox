import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_DRAIN_BYTES = 64 * 1024 * 1024;
const STREAM_CAP_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 300_000;
const KILL_GRACE_MS = 2_000;
const PIPE_GRACE_MS = 250;
const READ_DEFAULT_BYTES = 1024 * 1024;
const READ_MAX_BYTES = 8 * 1024 * 1024;
const LIST_DEFAULT_ENTRIES = 1_000;
const LIST_MAX_ENTRIES = 10_000;
const MIN_TOKEN_LENGTH = 24;
const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SCRIPT_RUNTIMES = {
  bash: { ext: '.sh', command: '/bin/bash' },
  python: { ext: '.py', command: 'python3' },
  node: { ext: '.js', command: process.execPath },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (message) => new HttpError(400, message);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function sendJson(res, status, body) {
  if (res.headersSent || res.destroyed) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    req.on('data', (chunk) => {
      size += chunk.length;
      // Keep draining an oversized body so the client can read the 413 instead of a reset socket.
      if (size > MAX_DRAIN_BYTES) {
        req.destroy();
        settle(reject, new HttpError(413, 'Request body too large'));
        return;
      }
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > MAX_BODY_BYTES) settle(reject, new HttpError(413, 'Request body too large'));
      else settle(resolve, Buffer.concat(chunks));
    });
    req.on('error', (err) => settle(reject, err));
    req.on('close', () => settle(reject, new HttpError(400, 'Request aborted')));
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (raw.length === 0) return {};
  let body;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    throw badRequest('Body must be valid JSON');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Body must be a JSON object');
  return body;
}

function optionalString(value, field) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
  return value;
}

function optionalBool(value, field, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') throw badRequest(`${field} must be a boolean`);
  return value;
}

function optionalInt(value, field, { fallback, min, max }) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw badRequest(`${field} must be a number`);
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function parseEncoding(value) {
  if (value === undefined || value === null || value === '') return 'utf8';
  if (value === 'utf8' || value === 'utf-8') return 'utf8';
  if (value === 'base64') return 'base64';
  throw badRequest('encoding must be "utf8" or "base64"');
}

function collector(cap) {
  const chunks = [];
  let size = 0;
  let truncated = false;
  return {
    push(chunk) {
      if (size >= cap) {
        truncated = true;
        return;
      }
      const room = cap - size;
      if (chunk.length > room) {
        chunks.push(chunk.subarray(0, room));
        size = cap;
        truncated = true;
      } else {
        chunks.push(chunk);
        size += chunk.length;
      }
    },
    get truncated() {
      return truncated;
    },
    text() {
      return Buffer.concat(chunks).toString('utf8');
    },
  };
}

function killGroup(pid, signal) {
  if (!pid) return;
  try {
    process.kill(-pid, signal);
  } catch {
    // ESRCH: the group is already gone.
  }
}

function spawnErrorToHttp(err, command) {
  if (err?.code === 'ENOENT') return badRequest(`${path.basename(command)} is not installed on the computer`);
  if (err?.code === 'E2BIG') return badRequest('Command, arguments or environment are too large; use Run Script for long code');
  if (err?.code === 'EACCES') return badRequest(`Permission denied starting ${path.basename(command)}`);
  return err;
}

export function createComputerServer({ token, workspaceDir = '/workspace', maxConcurrent = 16 } = {}) {
  if (typeof token !== 'string' || token.length < MIN_TOKEN_LENGTH) {
    throw new TypeError(`createComputerServer needs a token of at least ${MIN_TOKEN_LENGTH} characters`);
  }
  const workspace = path.resolve(workspaceDir);
  const tokenDigest = sha256(token);
  const running = new Set();
  let active = 0;

  function isAuthorized(header) {
    if (typeof header !== 'string') return false;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) return false;
    return crypto.timingSafeEqual(sha256(match[1]), tokenDigest);
  }

  function resolvePath(value, field = 'path') {
    if (typeof value !== 'string' || !value.trim()) throw badRequest(`${field} is required`);
    if (value.includes('\0')) throw badRequest(`${field} contains a null byte`);
    return path.resolve(workspace, value.trim());
  }

  async function resolveCwd(value) {
    const cwd = value === undefined || value === null || value === '' ? workspace : resolvePath(value, 'cwd');
    let stat;
    try {
      stat = await fs.stat(cwd);
    } catch {
      throw badRequest(`Working directory does not exist: ${cwd}`);
    }
    if (!stat.isDirectory()) throw badRequest(`Working directory is not a directory: ${cwd}`);
    return cwd;
  }

  function buildEnv(extra) {
    const env = { ...process.env };
    delete env.COMPUTER_TOKEN;
    if (extra === undefined || extra === null) return env;
    if (typeof extra !== 'object' || Array.isArray(extra)) throw badRequest('env must be an object of string values');
    for (const [key, value] of Object.entries(extra)) {
      if (!ENV_KEY_RE.test(key)) throw badRequest(`Invalid environment variable name: ${key}`);
      if (typeof value !== 'string') throw badRequest(`env.${key} must be a string`);
      env[key] = value;
    }
    return env;
  }

  function acquireSlot() {
    if (active >= maxConcurrent) throw new HttpError(429, 'busy');
    active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active -= 1;
    };
  }

  function runProcess({ command, args, cwd, env, stdin, timeoutMs, signal }) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const stdout = collector(STREAM_CAP_BYTES);
      const stderr = collector(STREAM_CAP_BYTES);
      let child;
      try {
        child = spawn(command, args, { cwd, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err) {
        reject(spawnErrorToHttp(err, command));
        return;
      }

      let finished = false;
      let timedOut = false;
      let exitCode = null;
      let exitSignal = null;
      let spawnError = null;
      let graceTimer = null;
      const job = { child, kill: (sig) => killGroup(child.pid, sig) };
      running.add(job);

      const escalate = () => {
        job.kill('SIGTERM');
        setTimeout(() => job.kill('SIGKILL'), KILL_GRACE_MS).unref();
      };

      const timeoutTimer = setTimeout(() => {
        timedOut = true;
        escalate();
      }, timeoutMs);

      const onAbort = () => {
        if (!finished) escalate();
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutTimer);
        clearTimeout(graceTimer);
        signal?.removeEventListener('abort', onAbort);
        running.delete(job);
        child.stdin?.destroy();
        child.stdout?.destroy();
        child.stderr?.destroy();
        if (spawnError) {
          reject(spawnErrorToHttp(spawnError, command));
          return;
        }
        resolve({
          exitCode,
          signal: exitSignal,
          stdout: stdout.text(),
          stderr: stderr.text(),
          durationMs: Date.now() - startedAt,
          timedOut,
          truncated: stdout.truncated || stderr.truncated,
        });
      };

      const noop = () => {};
      child.stdin?.on('error', noop);
      child.stdout?.on('error', noop);
      child.stderr?.on('error', noop);
      child.stdout?.on('data', (chunk) => stdout.push(chunk));
      child.stderr?.on('data', (chunk) => stderr.push(chunk));

      child.once('error', (err) => {
        if (child.pid === undefined) {
          spawnError = err;
          finish();
        }
      });
      child.once('exit', (code, sig) => {
        exitCode = code;
        exitSignal = sig;
        // A backgrounded grandchild can hold the pipes open for its whole life; don't wait on it.
        graceTimer = setTimeout(finish, PIPE_GRACE_MS);
      });
      child.once('close', finish);

      try {
        if (typeof stdin === 'string' && stdin.length > 0) child.stdin?.end(stdin);
        else child.stdin?.end();
      } catch {
        // EPIPE when the process exits before reading stdin.
      }
    });
  }

  async function execRoute(body, signal) {
    const command = body.command;
    if (typeof command !== 'string' || !command.trim()) throw badRequest('command is required');
    const stdin = optionalString(body.stdin, 'stdin');
    const timeoutMs = optionalInt(body.timeoutMs, 'timeoutMs', { fallback: DEFAULT_TIMEOUT_MS, min: MIN_TIMEOUT_MS, max: MAX_TIMEOUT_MS });
    const env = buildEnv(body.env);
    const release = acquireSlot();
    try {
      const cwd = await resolveCwd(body.cwd);
      return await runProcess({ command: '/bin/bash', args: ['-c', command], cwd, env, stdin, timeoutMs, signal });
    } finally {
      release();
    }
  }

  async function scriptRoute(body, signal) {
    const runtime = Object.hasOwn(SCRIPT_RUNTIMES, body.language) ? SCRIPT_RUNTIMES[body.language] : null;
    if (!runtime) throw badRequest('language must be "bash", "python" or "node"');
    if (typeof body.code !== 'string' || !body.code.trim()) throw badRequest('code is required');
    let args = [];
    if (body.args !== undefined && body.args !== null) {
      if (!Array.isArray(body.args) || body.args.some((a) => typeof a !== 'string')) throw badRequest('args must be an array of strings');
      args = body.args;
    }
    const stdin = optionalString(body.stdin, 'stdin');
    const timeoutMs = optionalInt(body.timeoutMs, 'timeoutMs', { fallback: DEFAULT_TIMEOUT_MS, min: MIN_TIMEOUT_MS, max: MAX_TIMEOUT_MS });
    const env = buildEnv(body.env);
    const release = acquireSlot();
    let tmpDir = null;
    try {
      const cwd = await resolveCwd(body.cwd);
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'computer-script-'));
      const file = path.join(tmpDir, `script${runtime.ext}`);
      await fs.writeFile(file, body.code, { mode: 0o700 });
      return await runProcess({ command: runtime.command, args: [file, ...args], cwd, env, stdin, timeoutMs, signal });
    } finally {
      release();
      if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async function systemRoute() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(0, totalMem - freeMem);
    let disk = { path: workspace, totalBytes: null, freeBytes: null, usedBytes: null, usedPercent: null };
    try {
      const st = await fs.statfs(workspace);
      const totalBytes = st.blocks * st.bsize;
      const freeBytes = st.bavail * st.bsize;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      disk = { path: workspace, totalBytes, freeBytes, usedBytes, usedPercent: percent(usedBytes, totalBytes) };
    } catch {
      // Reported as nulls when the workspace volume can't be inspected.
    }
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptimeSec: Math.round(os.uptime()),
      loadavg: os.loadavg().map((n) => Math.round(n * 100) / 100),
      cpus: cpus.length || os.availableParallelism(),
      cpuModel: cpus[0]?.model?.trim() || null,
      memory: { totalBytes: totalMem, freeBytes: freeMem, usedBytes: usedMem, usedPercent: percent(usedMem, totalMem) },
      disk,
      workspaceDir: workspace,
    };
  }

  async function readRoute(body) {
    const target = resolvePath(body.path);
    const encoding = parseEncoding(body.encoding);
    const maxBytes = optionalInt(body.maxBytes, 'maxBytes', { fallback: READ_DEFAULT_BYTES, min: 1, max: READ_MAX_BYTES });
    const stat = await fs.stat(target);
    if (stat.isDirectory()) throw badRequest(`Path is a directory: ${target}`);
    if (!stat.isFile()) throw badRequest(`Path is not a regular file: ${target}`);
    const handle = await fs.open(target, 'r');
    try {
      const buffer = Buffer.alloc(maxBytes + 1);
      let total = 0;
      while (total < buffer.length) {
        const { bytesRead } = await handle.read(buffer, total, buffer.length - total, null);
        if (bytesRead === 0) break;
        total += bytesRead;
      }
      const truncated = total > maxBytes || stat.size > maxBytes;
      const content = buffer.subarray(0, Math.min(total, maxBytes));
      return {
        path: target,
        content: content.toString(encoding),
        encoding,
        sizeBytes: stat.size > 0 ? stat.size : total,
        truncated,
      };
    } finally {
      await handle.close();
    }
  }

  async function writeRoute(body) {
    const target = resolvePath(body.path);
    if (typeof body.content !== 'string') throw badRequest('content must be a string');
    const encoding = parseEncoding(body.encoding);
    const append = optionalBool(body.append, 'append', false);
    const mkdirs = optionalBool(body.mkdirs, 'mkdirs', true);
    const data = Buffer.from(body.content, encoding);
    if (mkdirs) await fs.mkdir(path.dirname(target), { recursive: true });
    if (append) await fs.appendFile(target, data);
    else await fs.writeFile(target, data);
    return { path: target, bytesWritten: data.length };
  }

  async function listRoute(body) {
    const root = resolvePath(body.path === undefined || body.path === null || body.path === '' ? '.' : body.path);
    const recursive = optionalBool(body.recursive, 'recursive', false);
    const maxEntries = optionalInt(body.maxEntries, 'maxEntries', { fallback: LIST_DEFAULT_ENTRIES, min: 1, max: LIST_MAX_ENTRIES });
    const rootStat = await fs.stat(root);
    if (!rootStat.isDirectory()) throw badRequest(`Path is not a directory: ${root}`);
    const entries = [];
    let truncated = false;
    const queue = [root];
    while (queue.length > 0 && !truncated) {
      const dir = queue.shift();
      let dirents;
      try {
        dirents = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        if (dir === root) throw err;
        continue;
      }
      dirents.sort((a, b) => a.name.localeCompare(b.name));
      for (const dirent of dirents) {
        if (entries.length >= maxEntries) {
          truncated = true;
          break;
        }
        const full = path.join(dir, dirent.name);
        let stat;
        try {
          stat = await fs.lstat(full);
        } catch {
          continue;
        }
        const type = stat.isSymbolicLink() ? 'symlink' : stat.isDirectory() ? 'dir' : stat.isFile() ? 'file' : 'other';
        entries.push({ name: dirent.name, path: full, type, sizeBytes: stat.size, modifiedAt: stat.mtime.toISOString() });
        if (recursive && type === 'dir') queue.push(full);
      }
    }
    return { path: root, entries, truncated };
  }

  async function deleteRoute(body) {
    const target = resolvePath(body.path);
    const recursive = optionalBool(body.recursive, 'recursive', false);
    if (target === path.parse(target).root) throw badRequest('Refusing to delete the filesystem root');
    if (target === workspace || workspace.startsWith(target + path.sep)) {
      throw badRequest('Refusing to delete the workspace directory or one of its parents');
    }
    const stat = await fs.lstat(target);
    if (stat.isDirectory()) {
      if (recursive) {
        await fs.rm(target, { recursive: true });
      } else {
        try {
          await fs.rmdir(target);
        } catch (err) {
          if (err?.code === 'ENOTEMPTY' || err?.code === 'EEXIST') throw badRequest(`Directory is not empty: ${target}. Turn on recursive to delete it`);
          throw err;
        }
      }
    } else {
      await fs.unlink(target);
    }
    return { path: target, deleted: true };
  }

  const routes = {
    'GET /system': () => systemRoute(),
    'POST /exec': (body, signal) => execRoute(body, signal),
    'POST /script': (body, signal) => scriptRoute(body, signal),
    'POST /files/read': (body) => readRoute(body),
    'POST /files/write': (body) => writeRoute(body),
    'POST /files/list': (body) => listRoute(body),
    'POST /files/delete': (body) => deleteRoute(body),
  };

  async function handle(req, res) {
    const { pathname } = new URL(req.url || '/', 'http://computer.local');
    const route = `${req.method} ${pathname}`;
    if (route === 'GET /health') {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (!isAuthorized(req.headers.authorization)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    const handler = routes[route];
    if (!handler) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    const body = req.method === 'POST' ? await readJson(req) : {};
    const aborter = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) aborter.abort();
    });
    const result = await handler(body, aborter.signal);
    sendJson(res, 200, result);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      try {
        if (err instanceof HttpError) {
          sendJson(res, err.status, { error: err.message });
        } else if (err?.code === 'ENOENT') {
          sendJson(res, 404, { error: `No such file or directory: ${err.path ?? ''}`.trim() });
        } else if (['EISDIR', 'ENOTDIR', 'ENOTEMPTY', 'EEXIST', 'ENAMETOOLONG', 'ELOOP', 'EINVAL', 'EACCES', 'EPERM', 'EROFS', 'ENOSPC'].includes(err?.code)) {
          sendJson(res, 400, { error: err.message });
        } else {
          console.error(JSON.stringify({ msg: 'request failed', route: `${req.method} ${req.url}`, error: err?.message }));
          sendJson(res, 500, { error: err?.message || 'Internal error' });
        }
      } catch {
        res.destroy();
      }
    });
  });

  server.killJobs = (sig = 'SIGTERM') => {
    for (const job of running) job.kill(sig);
  };

  return server;
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function isMainModule() {
  if (!process.argv[1]) return false;
  if (import.meta.url === pathToFileURL(process.argv[1]).href) return true;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

async function main() {
  const token = process.env.COMPUTER_TOKEN || '';
  if (token.length < MIN_TOKEN_LENGTH) {
    console.error(JSON.stringify({ msg: `COMPUTER_TOKEN must be set to at least ${MIN_TOKEN_LENGTH} characters` }));
    process.exit(1);
  }
  const port = Number.parseInt(process.env.PORT ?? '8080', 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(JSON.stringify({ msg: 'PORT must be an integer between 0 and 65535' }));
    process.exit(1);
  }
  const host = process.env.HOST || '::';
  const workspaceDir = path.resolve(process.env.WORKSPACE_DIR || '/workspace');
  await fs.mkdir(workspaceDir, { recursive: true });

  const server = createComputerServer({ token, workspaceDir });
  try {
    await listen(server, port, host);
  } catch (err) {
    if (host !== '::' || !['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(err?.code)) throw err;
    await listen(server, port, '0.0.0.0');
  }
  console.log(JSON.stringify({ msg: 'listening', port: server.address().port }));

  let stopping = false;
  const shutdown = () => {
    if (stopping) process.exit(0);
    stopping = true;
    server.close();
    server.closeIdleConnections?.();
    server.killJobs('SIGTERM');
    setTimeout(() => {
      server.killJobs('SIGKILL');
      process.exit(0);
    }, 500);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (isMainModule()) {
  main().catch((err) => {
    console.error(JSON.stringify({ msg: 'computer service failed to start', error: err?.message }));
    process.exit(1);
  });
}
