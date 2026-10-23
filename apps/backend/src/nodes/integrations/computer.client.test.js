import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.COMPUTER_URL = "";
process.env.COMPUTER_TOKEN = "";
process.env.COMPUTER_ALLOWED_WORKSPACES = "ws-test";

const lookup = { next: null, calls: 0, lastId: null };
mock.module("../../models/user.model.js", {
  defaultExport: {
    findById: (id) => ({
      select: () => ({
        lean: async () => {
          lookup.calls += 1;
          lookup.lastId = id;
          if (lookup.next instanceof Error) throw lookup.next;
          return lookup.next;
        },
      }),
    }),
  },
});

const client = await import("./computer.client.js");
const { default: computerCommand } = await import("./computerCommand.node.js");
const { default: computerScript } = await import("./computerScript.node.js");
const { default: computerFiles } = await import("./computerFiles.node.js");
const { default: computerInfo } = await import("./computerInfo.node.js");

const {
  toText,
  toBool,
  toEnv,
  toArgs,
  commandTimeoutMs,
  runOptions,
  commandResult,
  callComputer,
  assertComputerAccess,
} = client;

let handler = (req, res) => res.end();
const requests = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    requests.push({ method: req.method, url: req.url, headers: req.headers, body });
    handler(req, res, body);
  });
});
let base;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

const reply = (status, body) => (req, res) => {
  res.statusCode = status;
  if (body !== undefined) {
    res.setHeader("Content-Type", "application/json");
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  } else {
    res.end();
  }
};
const settings = () => ({ url: base, token: "tok-123" });
const NOT_CONNECTED = "Computer not connected — set COMPUTER_URL and COMPUTER_TOKEN on the backend";
const DENIED = "The computer is owner-only and this account is not allowed to use it";
const OWNER_HINT = "Only the owner account can use the computer.";

test("toText stringifies values", () => {
  assert.equal(toText(undefined), "");
  assert.equal(toText(null), "");
  assert.equal(toText({ a: 1 }), '{"a":1}');
  assert.equal(toText(5), "5");
  assert.equal(toText(true), "true");
});

test("toBool reads toggle-ish values with a fallback", () => {
  for (const v of ["yes", " ON ", "1", 2]) assert.equal(toBool(v, false), true);
  for (const v of ["off", "0", "No", 0]) assert.equal(toBool(v, true), false);
  assert.equal(toBool("maybe", true), true);
  assert.equal(toBool(null, false), false);
  assert.equal(toBool(undefined, true), true);
});

test("toEnv accepts rows, objects and KEY=value lines", () => {
  assert.deepEqual(
    toEnv([{ key: "A", value: 1 }, { name: "B", value: "x" }, { key: " ", value: "y" }, null]),
    { A: "1", B: "x" },
  );
  assert.deepEqual(toEnv({ A: 1, B: null }), { A: "1", B: "" });
  assert.deepEqual(toEnv("A=1\nB=x=y\n=bad\nnoeq"), { A: "1", B: "x=y" });
  assert.deepEqual(toEnv(undefined), {});
  assert.deepEqual(toEnv(5), {});
});

test("toArgs splits lines and drops blanks", () => {
  assert.deepEqual(toArgs("a\n b \n\n"), ["a", "b"]);
  assert.deepEqual(toArgs([1, null, " x ", ""]), ["1", "x"]);
  assert.deepEqual(toArgs(""), []);
  assert.deepEqual(toArgs(undefined), []);
  assert.deepEqual(toArgs(null), []);
  assert.deepEqual(toArgs(7), ["7"]);
});

test("commandTimeoutMs defaults, floors and caps", () => {
  for (const v of [undefined, "0", "-5", "abc", "", null]) assert.equal(commandTimeoutMs(v), 60000);
  assert.equal(commandTimeoutMs(0.2), 1000);
  assert.equal(commandTimeoutMs(10), 10000);
  assert.equal(commandTimeoutMs(300), 295000);
  assert.equal(commandTimeoutMs(400), 295000);
});

test("runOptions builds the request body and flags", () => {
  const defaults = { body: { timeoutMs: 60000 }, failOnError: true, parseJson: false };
  assert.deepEqual(runOptions({}), defaults);
  assert.deepEqual(runOptions(), defaults);
  assert.deepEqual(
    runOptions({
      cwd: "x",
      env: [{ key: "A", value: "1" }],
      stdin: "in",
      timeoutSeconds: 5,
      failOnError: "false",
      parseJson: "on",
    }),
    { body: { timeoutMs: 5000, cwd: "x", env: { A: "1" }, stdin: "in" }, failOnError: false, parseJson: true },
  );
  assert.deepEqual(runOptions({ cwd: "  ", env: [], stdin: "" }), defaults);
});

test("commandResult returns a clean result on exit 0", () => {
  assert.deepEqual(commandResult({ exitCode: 0, stdout: "hi\n\n", stderr: "", durationMs: 12 }), {
    success: true,
    exitCode: 0,
    output: "hi",
    stdout: "hi\n\n",
    stderr: "",
    durationMs: 12,
    timedOut: false,
    truncated: false,
    json: null,
  });
});

test("commandResult turns a non-zero exit into a code error", () => {
  const res = { exitCode: 3, stdout: "", stderr: "bad thing\n" };
  assert.throws(() => commandResult(res), {
    message: "Command exited with code 3: bad thing",
    category: "code",
    hint: /Stop the run on error/,
  });
  assert.throws(() => commandResult(res, { noun: "Script" }), { message: "Script exited with code 3: bad thing" });
  assert.throws(() => commandResult({ exitCode: 3, stdout: "out", stderr: "" }), {
    message: "Command exited with code 3: out",
  });
  assert.throws(() => commandResult({ exitCode: 3, stdout: "", stderr: "" }), {
    message: "Command exited with code 3",
  });

  const soft = commandResult(res, { failOnError: false });
  assert.equal(soft.success, false);
  assert.equal(soft.error, "Command exited with code 3: bad thing");
  assert.equal(soft.exitCode, 3);
});

test("commandResult reports timeouts and signals", () => {
  assert.throws(() => commandResult({ exitCode: null, timedOut: true }, { timeoutMs: 5000 }), {
    message: "Timed out after 5s and was stopped",
    category: "timeout",
  });
  assert.throws(() => commandResult({ exitCode: null, signal: "SIGKILL" }), {
    message: "Stopped by SIGKILL before it finished",
    category: "code",
  });
  assert.throws(() => commandResult({ exitCode: null }), { message: "Stopped by a signal before it finished" });
});

test("commandResult parses JSON output when asked", () => {
  assert.deepEqual(commandResult({ exitCode: 0, stdout: '{"a":1}\n' }, { parseJson: true }).json, { a: 1 });
  assert.throws(() => commandResult({ exitCode: 0, stdout: "nope" }, { parseJson: true }), {
    message: "Output is not valid JSON: nope",
    category: "parse",
  });
  const soft = commandResult({ exitCode: 0, stdout: "nope" }, { parseJson: true, failOnError: false });
  assert.equal(soft.success, false);
  assert.equal(soft.json, null);
  assert.throws(() => commandResult({ exitCode: 2, stdout: "nope", stderr: "err" }, { parseJson: true }), {
    message: "Command exited with code 2: err",
  });
  assert.equal(commandResult({ exitCode: 0, stdout: "" }, { parseJson: true }).success, true);
  assert.equal(commandResult({ exitCode: 0 }, { extra: { language: "python" } }).language, "python");
});

test("commandResult keeps only the tail of long stderr", () => {
  const stderr = "x".repeat(600) + "END";
  assert.throws(() => commandResult({ exitCode: 1, stderr }), {
    message: `Command exited with code 1: …${stderr.slice(-500)}`,
  });
});

test("callComputer sends an authenticated JSON request", async () => {
  handler = reply(200, { ok: 1 });
  requests.length = 0;
  assert.deepEqual(await callComputer("POST", "/exec", { command: "ls" }, { settings: settings() }), { ok: 1 });
  const [req] = requests;
  assert.equal(req.method, "POST");
  assert.equal(req.url, "/exec");
  assert.equal(req.headers.authorization, "Bearer tok-123");
  assert.equal(req.headers["content-type"], "application/json");
  assert.equal(req.body, '{"command":"ls"}');

  requests.length = 0;
  await callComputer("GET", "/system", undefined, { settings: { url: `${base}///`, token: "  tok-123  " } });
  assert.equal(requests[0].url, "/system");
  assert.equal(requests[0].headers.authorization, "Bearer tok-123");
  assert.equal(requests[0].headers["content-type"], undefined);
});

test("callComputer maps HTTP errors to categories", async () => {
  const cases = [
    [401, undefined, "auth", "The computer rejected the token"],
    [413, undefined, "config", "Request too large for the computer (over 8 MiB)"],
    [429, undefined, "rate_limit", "The computer is busy running other commands"],
    [502, undefined, "network", "The computer is unavailable (HTTP 502)"],
    [503, undefined, "network", "The computer is unavailable (HTTP 503)"],
    [504, undefined, "network", "The computer is unavailable (HTTP 504)"],
    [500, { error: "boom" }, "code", "The computer hit an error: boom"],
    [500, undefined, "code", "The computer hit an error: HTTP 500"],
    [400, { error: "x" }, "config", "x"],
    [400, undefined, "config", "HTTP 400"],
    [404, { error: "No such file or directory: /workspace/a" }, "config", "No such file or directory: /workspace/a"],
  ];
  for (const [status, body, category, message] of cases) {
    handler = reply(status, body);
    await assert.rejects(callComputer("GET", "/system", undefined, { settings: settings() }), { message, category });
  }
});

test("callComputer rejects answers that are not the computer service", async () => {
  for (const body of ["hello", "", "[1]", "null", "5"]) {
    handler = (req, res) => res.end(body);
    await assert.rejects(callComputer("GET", "/system", undefined, { settings: settings() }), {
      message: "COMPUTER_URL answered, but not like the computer service",
      category: "config",
    });
  }
});

test("callComputer explains missing or bad settings", async () => {
  for (const s of [{ token: "t" }, { url: base }, { url: "   ", token: "t" }]) {
    await assert.rejects(callComputer("GET", "/system", undefined, { settings: s }), {
      message: NOT_CONNECTED,
      category: "config",
    });
  }
  for (const url of ["ftp://x", "not a url"]) {
    await assert.rejects(callComputer("GET", "/system", undefined, { settings: { url, token: "t" } }), {
      message: "COMPUTER_URL must be a full http:// or https:// address",
      category: "config",
    });
  }
});

test("callComputer reports an unreachable computer as a network error", async () => {
  const closed = http.createServer();
  await new Promise((resolve) => closed.listen(0, "127.0.0.1", resolve));
  const port = closed.address().port;
  await new Promise((resolve) => closed.close(resolve));
  await assert.rejects(
    callComputer("GET", "/system", undefined, { settings: { url: `http://127.0.0.1:${port}`, token: "t" } }),
    { message: "Could not reach the computer (ECONNREFUSED)", category: "network" },
  );
});

test("assertComputerAccess allows listed workspaces without a DB lookup", async () => {
  const s = { allowedWorkspaces: " a , ws-1 ,b" };
  const calls = lookup.calls;
  await assertComputerAccess({ workspaceId: "ws-1" }, s);
  await assertComputerAccess({ workspaceId: " ws-1 " }, s);
  assert.equal(lookup.calls, calls);
  await assertComputerAccess({ workspaceId: "ws-test" });
});

test("assertComputerAccess denies unknown or missing workspaces", async () => {
  const s = { allowedWorkspaces: " a , ws-1 ,b" };
  for (const ctx of [{}, undefined, { workspaceId: "  " }]) {
    await assert.rejects(assertComputerAccess(ctx, s), { message: DENIED, category: "config", hint: OWNER_HINT });
  }
  await assert.rejects(assertComputerAccess({ workspaceId: "ws-x" }, s), {
    message: DENIED,
    hint: `${OWNER_HINT} To allow this account set COMPUTER_ALLOWED_WORKSPACES=ws-x on the backend.`,
  });
});

test("assertComputerAccess lets the owner or an admin through", async () => {
  const id = "64b7f0c2a1b2c3d4e5f60718";
  const s = { allowedWorkspaces: "" };

  lookup.next = { role: "admin" };
  await assertComputerAccess({ workspaceId: id }, s);
  assert.equal(String(lookup.lastId), id);

  lookup.next = { isOwner: true, role: "user" };
  await assertComputerAccess({ workspaceId: id }, s);

  for (const user of [{ role: "user" }, null]) {
    lookup.next = user;
    await assert.rejects(assertComputerAccess({ workspaceId: id }, s), { message: DENIED, category: "config" });
  }

  const dbErr = new Error("db down");
  lookup.next = dbErr;
  await assert.rejects(assertComputerAccess({ workspaceId: id }, s), (err) => {
    assert.equal(err.message, "Could not verify computer access: db down");
    assert.equal(err.category, undefined);
    assert.equal(err.cause, dbErr);
    return true;
  });
  lookup.next = null;
});

test("computer nodes validate config before calling the computer", async () => {
  const ctx = { workspaceId: "ws-test" };
  await assert.rejects(computerCommand.run({ command: "  " }, {}, ctx), {
    message: "Command is required",
    category: "config",
  });
  await assert.rejects(computerCommand.run({ command: "ls" }, {}, { workspaceId: "ws-other" }), {
    message: DENIED,
    category: "config",
  });
  await assert.rejects(computerScript.run({ language: "ruby", code: "p 1" }, {}, ctx), {
    message: 'Unsupported language "ruby"',
  });
  await assert.rejects(computerScript.run({ language: "python", code: "  " }, {}, ctx), {
    message: "Code is required",
  });
  await assert.rejects(computerScript.run({ code: "print(1)" }, {}, ctx), { message: NOT_CONNECTED });
  await assert.rejects(computerFiles.run({ operation: "move", path: "a" }, {}, ctx), {
    message: 'Unknown file operation "move"',
  });
  await assert.rejects(computerFiles.run({ operation: "read" }, {}, ctx), { message: "Path is required" });
  await assert.rejects(computerFiles.run({ selectedAction: "Delete File" }, {}, ctx), {
    message: "Path is required",
  });
  await assert.rejects(computerFiles.run({ operation: "list" }, {}, ctx), { message: NOT_CONNECTED });
  await assert.rejects(computerInfo.run({}, {}, ctx), { message: NOT_CONNECTED });
});

test("computer nodes allow long-running commands", () => {
  for (const node of [computerCommand, computerScript, computerFiles, computerInfo]) {
    assert.equal(node.timeoutMs, 330000);
  }
});
