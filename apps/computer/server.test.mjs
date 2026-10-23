import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { createComputerServer } from './server.mjs';

const TOKEN = 'computer-test-token-0123456789abcdef';
const SERVER_PATH = fileURLToPath(new URL('./server.mjs', import.meta.url));
const hasPython = spawnSync('python3', ['--version'], { timeout: 10_000 }).status === 0;
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const detectsModules = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 7);

async function startServer(options = {}) {
  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'computer-ws-'));
  const server = createComputerServer({ token: TOKEN, workspaceDir, ...options });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function call(method, route, body, { authorization = `Bearer ${TOKEN}`, raw, signal } = {}) {
    const headers = {};
    if (authorization) headers.authorization = authorization;
    let payload;
    if (raw !== undefined) payload = raw;
    else if (body !== undefined) payload = JSON.stringify(body);
    if (payload !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(base + route, { method, headers, body: payload, signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, body: json };
  }

  async function close() {
    server.killJobs('SIGKILL');
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(workspaceDir, { recursive: true, force: true });
  }

  return { workspaceDir, call, close };
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

async function waitForExit(pid, ms = 5000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    await sleep(50);
  }
  return !isAlive(pid);
}

async function readPid(file) {
  for (let i = 0; i < 100; i++) {
    const text = await fs.readFile(file, 'utf8').catch(() => '');
    const pid = Number(text.trim());
    if (pid > 0) return pid;
    await sleep(50);
  }
  throw new Error(`no pid written to ${file}`);
}

describe('computer server', () => {
  let ctx;
  before(async () => {
    ctx = await startServer();
  });
  after(async () => {
    await ctx.close();
  });

  describe('auth', () => {
    test('health needs no token', async () => {
      const res = await ctx.call('GET', '/health', undefined, { authorization: null });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { ok: true });
    });

    test('rejects a missing, wrong or non-bearer token', async () => {
      for (const authorization of [null, 'Bearer wrong-token-wrong-token-wrong', `Basic ${TOKEN}`, TOKEN]) {
        const res = await ctx.call('GET', '/system', undefined, { authorization });
        assert.equal(res.status, 401, String(authorization));
        assert.deepEqual(res.body, { error: 'Unauthorized' });
      }
    });

    test('unknown routes are 401 without a token and 404 with one', async () => {
      assert.equal((await ctx.call('GET', '/nope', undefined, { authorization: null })).status, 401);
      assert.equal((await ctx.call('GET', '/nope')).status, 404);
      assert.equal((await ctx.call('GET', '/exec')).status, 404);
    });

    test('refuses to start without a strong token', () => {
      assert.throws(() => createComputerServer({ token: 'short' }), /at least 24/);
      assert.throws(() => createComputerServer({}), /at least 24/);
    });
  });

  describe('GET /system', () => {
    test('reports host, memory and workspace disk stats', async () => {
      const res = await ctx.call('GET', '/system');
      assert.equal(res.status, 200);
      const s = res.body;
      assert.equal(typeof s.hostname, 'string');
      assert.equal(s.platform, process.platform);
      assert.equal(s.arch, process.arch);
      assert.equal(typeof s.release, 'string');
      assert.ok(Number.isInteger(s.uptimeSec));
      assert.equal(s.loadavg.length, 3);
      assert.ok(s.cpus >= 1);
      assert.ok(s.memory.totalBytes > 0);
      assert.ok(s.memory.usedPercent >= 0 && s.memory.usedPercent <= 100);
      assert.ok(s.disk.totalBytes > 0);
      assert.ok(s.disk.freeBytes >= 0);
      assert.equal(s.disk.path, ctx.workspaceDir);
      assert.equal(s.workspaceDir, ctx.workspaceDir);
    });
  });

  describe('POST /exec', () => {
    test('captures stdout and exit code', async () => {
      const res = await ctx.call('POST', '/exec', { command: 'echo hello' });
      assert.equal(res.status, 200);
      assert.equal(res.body.stdout, 'hello\n');
      assert.equal(res.body.stderr, '');
      assert.equal(res.body.exitCode, 0);
      assert.equal(res.body.signal, null);
      assert.equal(res.body.timedOut, false);
      assert.equal(res.body.truncated, false);
      assert.equal(typeof res.body.durationMs, 'number');
    });

    test('a non-zero exit is still a 200 with stderr', async () => {
      const res = await ctx.call('POST', '/exec', { command: 'echo oops >&2; exit 3' });
      assert.equal(res.status, 200);
      assert.equal(res.body.exitCode, 3);
      assert.equal(res.body.stderr, 'oops\n');
    });

    test('pipes stdin and passes env', async () => {
      const piped = await ctx.call('POST', '/exec', { command: 'cat', stdin: 'piped in' });
      assert.equal(piped.body.stdout, 'piped in');
      const env = await ctx.call('POST', '/exec', { command: 'printf %s "$FOO"', env: { FOO: 'bar baz' } });
      assert.equal(env.body.stdout, 'bar baz');
    });

    test('never passes COMPUTER_TOKEN to the command', async () => {
      const previous = process.env.COMPUTER_TOKEN;
      process.env.COMPUTER_TOKEN = TOKEN;
      try {
        const res = await ctx.call('POST', '/exec', { command: 'printf %s "${COMPUTER_TOKEN:-none}"' });
        assert.equal(res.body.stdout, 'none');
      } finally {
        if (previous === undefined) delete process.env.COMPUTER_TOKEN;
        else process.env.COMPUTER_TOKEN = previous;
      }
    });

    test('rejects bad env, timeout and command values', async () => {
      const bodies = [
        { command: 'true', env: { '1BAD': 'x' } },
        { command: 'true', env: { FOO: 1 } },
        { command: 'true', env: ['FOO=1'] },
        { command: 'true', timeoutMs: 'soon' },
        { command: '' },
        {},
      ];
      for (const body of bodies) {
        const res = await ctx.call('POST', '/exec', body);
        assert.equal(res.status, 400, JSON.stringify(body));
        assert.equal(typeof res.body.error, 'string');
      }
    });

    test('runs in the workspace and resolves relative cwd inside it', async () => {
      const root = await ctx.call('POST', '/exec', { command: 'pwd' });
      assert.equal(await fs.realpath(root.body.stdout.trim()), await fs.realpath(ctx.workspaceDir));
      await fs.mkdir(path.join(ctx.workspaceDir, 'sub'));
      const sub = await ctx.call('POST', '/exec', { command: 'pwd', cwd: 'sub' });
      assert.ok(sub.body.stdout.trim().endsWith(`${path.sep}sub`), sub.body.stdout);
    });

    test('a missing cwd is a 400', async () => {
      const res = await ctx.call('POST', '/exec', { command: 'pwd', cwd: 'does/not/exist' });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /Working directory does not exist/);
    });

    test('returns when the shell exits even if a background job holds the pipes', async () => {
      const started = Date.now();
      const res = await ctx.call('POST', '/exec', { command: 'sleep 5 & echo $!' });
      assert.ok(Date.now() - started < 3000, `took ${Date.now() - started}ms`);
      assert.equal(res.body.exitCode, 0);
      const pid = Number(res.body.stdout.trim());
      assert.ok(isAlive(pid), 'a normal exit must not kill background jobs');
      process.kill(pid, 'SIGKILL');
    });

    test('kills the whole process group on timeout', async () => {
      const started = Date.now();
      const res = await ctx.call('POST', '/exec', { command: 'sleep 30 & echo $! > bg.pid; sleep 30', timeoutMs: 1000 });
      assert.ok(Date.now() - started < 5000, `took ${Date.now() - started}ms`);
      assert.equal(res.status, 200);
      assert.equal(res.body.timedOut, true);
      assert.equal(res.body.exitCode, null);
      assert.equal(res.body.signal, 'SIGTERM');
      const pid = await readPid(path.join(ctx.workspaceDir, 'bg.pid'));
      assert.ok(await waitForExit(pid), 'background child survived the timeout');
    });

    test('kills the command when the caller disconnects', async () => {
      const controller = new AbortController();
      const pending = ctx.call('POST', '/exec', { command: 'echo $$ > dc.pid; sleep 30' }, { signal: controller.signal });
      const pid = await readPid(path.join(ctx.workspaceDir, 'dc.pid'));
      controller.abort();
      await assert.rejects(pending);
      assert.ok(await waitForExit(pid), 'command survived the disconnect');
    });

    test('caps each stream at 256 KiB', async () => {
      const res = await ctx.call('POST', '/exec', { command: 'yes a | head -c 300000' });
      assert.equal(res.status, 200);
      assert.equal(res.body.stdout.length, 256 * 1024);
      assert.equal(res.body.truncated, true);
    });
  });

  describe('POST /script', () => {
    test('runs bash with args', async () => {
      const res = await ctx.call('POST', '/script', { language: 'bash', code: 'echo "$1-$2"', args: ['x', 'y'] });
      assert.equal(res.status, 200);
      assert.equal(res.body.stdout, 'x-y\n');
    });

    test('runs node', async () => {
      const code = 'console.log(JSON.stringify({ sum: 1 + 2, argv: process.argv.slice(2) }))';
      const res = await ctx.call('POST', '/script', { language: 'node', code, args: ['a'] });
      assert.equal(res.body.exitCode, 0, res.body.stderr);
      assert.deepEqual(JSON.parse(res.body.stdout), { sum: 3, argv: ['a'] });
    });

    test('runs node written as an ES module', { skip: !detectsModules && 'needs Node >= 22.7' }, async () => {
      const code = "import os from 'node:os';\nconsole.log(typeof os.hostname());";
      const res = await ctx.call('POST', '/script', { language: 'node', code });
      assert.equal(res.body.exitCode, 0, res.body.stderr);
      assert.equal(res.body.stdout, 'string\n');
    });

    test('runs python', { skip: !hasPython && 'python3 is not installed' }, async () => {
      const code = 'import sys, json\nprint(json.dumps({"args": sys.argv[1:]}))';
      const res = await ctx.call('POST', '/script', { language: 'python', code, args: ['p'] });
      assert.equal(res.body.exitCode, 0, res.body.stderr);
      assert.deepEqual(JSON.parse(res.body.stdout), { args: ['p'] });
    });

    test('pipes stdin and reports the exit code', async () => {
      const res = await ctx.call('POST', '/script', { language: 'bash', code: 'cat; exit 5', stdin: 'in' });
      assert.equal(res.body.stdout, 'in');
      assert.equal(res.body.exitCode, 5);
    });

    test('removes the temporary script afterwards', async () => {
      const res = await ctx.call('POST', '/script', { language: 'bash', code: 'echo "$0"' });
      const scriptPath = res.body.stdout.trim();
      assert.equal(path.basename(scriptPath), 'script.sh');
      await assert.rejects(fs.access(path.dirname(scriptPath)), { code: 'ENOENT' });
    });

    test('validates language, code and args', async () => {
      const bodies = [
        { language: 'ruby', code: 'puts 1' },
        { language: 'toString', code: 'x' },
        { language: 'bash' },
        { language: 'bash', code: 'echo', args: 'x' },
        { language: 'bash', code: 'echo', args: [1] },
      ];
      for (const body of bodies) {
        const res = await ctx.call('POST', '/script', body);
        assert.equal(res.status, 400, JSON.stringify(body));
      }
    });
  });

  describe('files', () => {
    test('write, read and append round-trip', async () => {
      const written = await ctx.call('POST', '/files/write', { path: 'notes/a.txt', content: 'hello' });
      assert.equal(written.status, 200);
      assert.equal(written.body.path, path.join(ctx.workspaceDir, 'notes', 'a.txt'));
      assert.equal(written.body.bytesWritten, 5);

      await ctx.call('POST', '/files/write', { path: 'notes/a.txt', content: ' world', append: true });
      const read = await ctx.call('POST', '/files/read', { path: 'notes/a.txt' });
      assert.deepEqual(read.body, {
        path: path.join(ctx.workspaceDir, 'notes', 'a.txt'),
        content: 'hello world',
        encoding: 'utf8',
        sizeBytes: 11,
        truncated: false,
      });

      const empty = await ctx.call('POST', '/files/write', { path: 'empty.txt', content: '' });
      assert.equal(empty.body.bytesWritten, 0);
    });

    test('round-trips base64 and truncates reads at maxBytes', async () => {
      const content = Buffer.from([0, 1, 2, 255]).toString('base64');
      const written = await ctx.call('POST', '/files/write', { path: 'bin.dat', content, encoding: 'base64' });
      assert.equal(written.body.bytesWritten, 4);
      const read = await ctx.call('POST', '/files/read', { path: 'bin.dat', encoding: 'base64' });
      assert.equal(read.body.content, content);

      const head = await ctx.call('POST', '/files/read', { path: 'notes/a.txt', maxBytes: 5 });
      assert.equal(head.body.content, 'hello');
      assert.equal(head.body.truncated, true);
      assert.equal(head.body.sizeBytes, 11);
    });

    test('write without mkdirs into a missing directory is a 404', async () => {
      const res = await ctx.call('POST', '/files/write', { path: 'nowhere/x.txt', content: 'x', mkdirs: false });
      assert.equal(res.status, 404);
    });

    test('lists entries, recursively and with a cap', async () => {
      await fs.mkdir(path.join(ctx.workspaceDir, 'tree', 'inner'), { recursive: true });
      await fs.writeFile(path.join(ctx.workspaceDir, 'tree', 'b.txt'), 'bb');
      await fs.writeFile(path.join(ctx.workspaceDir, 'tree', 'inner', 'c.txt'), 'c');

      const flat = await ctx.call('POST', '/files/list', { path: 'tree' });
      assert.equal(flat.status, 200);
      assert.equal(flat.body.truncated, false);
      assert.deepEqual(flat.body.entries.map((e) => [e.name, e.type]), [['b.txt', 'file'], ['inner', 'dir']]);
      assert.equal(flat.body.entries[0].sizeBytes, 2);
      assert.equal(flat.body.entries[0].path, path.join(ctx.workspaceDir, 'tree', 'b.txt'));
      assert.ok(!Number.isNaN(Date.parse(flat.body.entries[0].modifiedAt)));

      const deep = await ctx.call('POST', '/files/list', { path: 'tree', recursive: true });
      assert.deepEqual(deep.body.entries.map((e) => e.name), ['b.txt', 'inner', 'c.txt']);

      const capped = await ctx.call('POST', '/files/list', { path: 'tree', recursive: true, maxEntries: 1 });
      assert.equal(capped.body.entries.length, 1);
      assert.equal(capped.body.truncated, true);

      const root = await ctx.call('POST', '/files/list', {});
      assert.equal(root.body.path, ctx.workspaceDir);
    });

    test('maps filesystem errors to 400 and 404', async () => {
      assert.equal((await ctx.call('POST', '/files/read', { path: 'tree' })).status, 400);
      assert.equal((await ctx.call('POST', '/files/read', { path: 'missing.txt' })).status, 404);
      assert.equal((await ctx.call('POST', '/files/list', { path: 'tree/b.txt' })).status, 400);
      assert.equal((await ctx.call('POST', '/files/list', { path: 'missing' })).status, 404);
      assert.equal((await ctx.call('POST', '/files/read', {})).status, 400);
      assert.equal((await ctx.call('POST', '/files/read', { path: 'tree/b.txt', encoding: 'latin1' })).status, 400);
      assert.equal((await ctx.call('POST', '/files/write', { path: 'x.txt' })).status, 400);
    });

    test('deletes files and directories with guard rails', async () => {
      const notEmpty = await ctx.call('POST', '/files/delete', { path: 'tree' });
      assert.equal(notEmpty.status, 400);
      assert.match(notEmpty.body.error, /not empty/);

      const file = await ctx.call('POST', '/files/delete', { path: 'tree/b.txt' });
      assert.deepEqual(file.body, { path: path.join(ctx.workspaceDir, 'tree', 'b.txt'), deleted: true });

      const dir = await ctx.call('POST', '/files/delete', { path: 'tree', recursive: true });
      assert.equal(dir.status, 200);
      await assert.rejects(fs.access(path.join(ctx.workspaceDir, 'tree')), { code: 'ENOENT' });

      assert.equal((await ctx.call('POST', '/files/delete', { path: 'tree' })).status, 404);
      for (const target of ['.', '/', '..', ctx.workspaceDir]) {
        const res = await ctx.call('POST', '/files/delete', { path: target, recursive: true });
        assert.equal(res.status, 400, target);
      }
      await fs.access(ctx.workspaceDir);
    });
  });

  describe('limits', () => {
    test('rejects malformed and non-object JSON', async () => {
      assert.equal((await ctx.call('POST', '/exec', undefined, { raw: '{nope' })).status, 400);
      assert.equal((await ctx.call('POST', '/exec', undefined, { raw: '[1,2]' })).status, 400);
    });

    test('rejects bodies over 8 MiB', async () => {
      const res = await ctx.call('POST', '/files/write', undefined, { raw: 'x'.repeat(9 * 1024 * 1024) });
      assert.equal(res.status, 413);
    });

    test('an oversized command is a 400, not a crash', async () => {
      const res = await ctx.call('POST', '/exec', { command: `echo ${'x'.repeat(4_000_000)}` });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /too large/);
    });

    test('caps concurrent processes', async () => {
      const busy = await startServer({ maxConcurrent: 1 });
      try {
        const first = busy.call('POST', '/exec', { command: 'sleep 1' });
        await sleep(300);
        const second = await busy.call('POST', '/exec', { command: 'echo hi' });
        assert.equal(second.status, 429);
        assert.deepEqual(second.body, { error: 'busy' });
        assert.equal((await first).status, 200);
        assert.equal((await busy.call('POST', '/exec', { command: 'echo again' })).status, 200);
      } finally {
        await busy.close();
      }
    });
  });
});

describe('process entrypoint', () => {
  test('exits when COMPUTER_TOKEN is missing or short', () => {
    const result = spawnSync(process.execPath, [SERVER_PATH], {
      env: { ...process.env, COMPUTER_TOKEN: 'short', PORT: '0' },
      encoding: 'utf8',
      timeout: 10_000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /COMPUTER_TOKEN/);
  });

  test('listens, creates the workspace, serves /health and exits on SIGTERM', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'computer-main-'));
    const workspaceDir = path.join(tmp, 'ws');
    const child = spawn(process.execPath, [SERVER_PATH], {
      env: { ...process.env, COMPUTER_TOKEN: TOKEN, PORT: '0', HOST: '127.0.0.1', WORKSPACE_DIR: workspaceDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
    try {
      const port = await new Promise((resolve, reject) => {
        let buffered = '';
        child.stdout.on('data', (chunk) => {
          buffered += chunk;
          const line = buffered.split('\n').find((l) => l.includes('"listening"'));
          if (line) resolve(JSON.parse(line).port);
        });
        exited.then(({ code }) => reject(new Error(`server exited early with code ${code}`)));
      });
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      assert.deepEqual(await res.json(), { ok: true });
      await fs.access(workspaceDir);
      child.kill('SIGTERM');
      assert.deepEqual(await exited, { code: 0, signal: null });
    } finally {
      child.kill('SIGKILL');
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
