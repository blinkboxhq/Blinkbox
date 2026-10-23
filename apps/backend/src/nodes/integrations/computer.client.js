import mongoose from "mongoose";
import { COMPUTER_URL, COMPUTER_TOKEN, COMPUTER_ALLOWED_WORKSPACES } from "../../config/env.js";
import User from "../../models/user.model.js";

export const NODE_TIMEOUT_MS = 330000;
const DEFAULT_TIMEOUT_SECONDS = 60;
const MAX_TIMEOUT_SECONDS = 300;
// Node's fetch gives up waiting for response headers after 300s, and the
// computer needs a couple of seconds past the deadline to kill and report.
const MAX_COMMAND_MS = 295000;
const REQUEST_GRACE_MS = 15000;
const FILE_REQUEST_MS = 60000;
const ERROR_TAIL_CHARS = 500;

const NOT_CONNECTED_HINT =
  "Deploy the apps/computer service on Railway, then set COMPUTER_URL (e.g. http://computer.railway.internal:8080) and the same COMPUTER_TOKEN on the backend.";
const UNREACHABLE_HINT =
  "Check that the computer service is running on Railway and that COMPUTER_URL on the backend points at it.";
const OWNER_HINT = "Only the owner account can use the computer.";

export function computerError(message, category, hint) {
  const err = new Error(message);
  err.category = category;
  if (hint) err.hint = hint;
  return err;
}

export function computerSettings() {
  return { url: COMPUTER_URL, token: COMPUTER_TOKEN, allowedWorkspaces: COMPUTER_ALLOWED_WORKSPACES };
}

export async function assertComputerAccess(context = {}, settings = computerSettings()) {
  const workspaceId = context?.workspaceId == null ? "" : String(context.workspaceId).trim();
  const denied = () =>
    computerError(
      "The computer is owner-only and this account is not allowed to use it",
      "config",
      workspaceId
        ? `${OWNER_HINT} To allow this account set COMPUTER_ALLOWED_WORKSPACES=${workspaceId} on the backend.`
        : OWNER_HINT,
    );
  if (!workspaceId) throw denied();

  const allowed = String(settings.allowedWorkspaces || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (allowed.includes(workspaceId)) return;
  if (!mongoose.isObjectIdOrHexString(workspaceId)) throw denied();

  let user;
  try {
    user = await User.findById(workspaceId).select("role isOwner").lean();
  } catch (err) {
    throw new Error(`Could not verify computer access: ${err?.message || err}`, { cause: err });
  }
  if (user && (user.role === "admin" || user.isOwner === true)) return;
  throw denied();
}

function transportError(err, waitedMs) {
  if (err?.name === "TimeoutError" || err?.name === "AbortError") {
    return computerError(
      `The computer did not answer within ${Math.round(waitedMs / 1000)}s`,
      "timeout",
      "The computer may be overloaded or stuck. Check its logs on Railway.",
    );
  }
  const detail = err?.cause?.code || err?.code || err?.cause?.message || err?.message || "fetch failed";
  return computerError(`Could not reach the computer (${detail})`, "network", UNREACHABLE_HINT);
}

function statusError(status, data) {
  const reason = typeof data?.error === "string" && data.error ? data.error : `HTTP ${status}`;
  if (status === 401) {
    return computerError(
      "The computer rejected the token",
      "auth",
      "COMPUTER_TOKEN on the backend must match COMPUTER_TOKEN on the computer service.",
    );
  }
  if (status === 413) {
    return computerError("Request too large for the computer (over 8 MiB)", "config", "Send less data per run.");
  }
  if (status === 429) {
    return computerError(
      "The computer is busy running other commands",
      "rate_limit",
      "Too many commands are running at once. Try again shortly.",
    );
  }
  if (status === 502 || status === 503 || status === 504) {
    return computerError(`The computer is unavailable (HTTP ${status})`, "network", UNREACHABLE_HINT);
  }
  if (status >= 500) {
    return computerError(`The computer hit an error: ${reason}`, "code", "Check the computer service logs on Railway.");
  }
  return computerError(reason, "config", "Check the node's settings.");
}

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function callComputer(method, path, body, { timeoutMs = FILE_REQUEST_MS, settings = computerSettings() } = {}) {
  const base = String(settings.url || "").trim().replace(/\/+$/, "");
  const token = String(settings.token || "").trim();
  if (!base || !token) {
    throw computerError("Computer not connected — set COMPUTER_URL and COMPUTER_TOKEN on the backend", "config", NOT_CONNECTED_HINT);
  }
  let protocol = "";
  try {
    protocol = new URL(base).protocol;
  } catch {
    protocol = "";
  }
  if (protocol !== "http:" && protocol !== "https:") {
    throw computerError("COMPUTER_URL must be a full http:// or https:// address", "config", NOT_CONNECTED_HINT);
  }

  // No SSRF guard: COMPUTER_URL is operator config from env, never user input.
  const waitMs = timeoutMs + REQUEST_GRACE_MS;
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res;
  let text;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(waitMs),
    });
    text = await res.text();
  } catch (err) {
    throw transportError(err, waitMs);
  }

  const data = parseBody(text);
  if (!res.ok) throw statusError(res.status, data);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw computerError("COMPUTER_URL answered, but not like the computer service", "config", NOT_CONNECTED_HINT);
  }
  return data;
}

export function toText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function toBool(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }
  return fallback;
}

export function toEnv(value) {
  const env = {};
  const put = (key, val) => {
    const name = toText(key).trim();
    if (name) env[name] = toText(val);
  };
  if (Array.isArray(value)) {
    for (const row of value) {
      if (row && typeof row === "object") put(row.key ?? row.name, row.value);
    }
  } else if (value && typeof value === "object") {
    for (const [key, val] of Object.entries(value)) put(key, val);
  } else if (typeof value === "string") {
    for (const line of value.split(/\r?\n/)) {
      const eq = line.indexOf("=");
      if (eq > 0) put(line.slice(0, eq), line.slice(eq + 1));
    }
  }
  return env;
}

export function toArgs(value) {
  if (value === undefined || value === null || value === "") return [];
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n/) : [value];
  return list
    .filter((arg) => arg !== undefined && arg !== null)
    .map((arg) => (typeof arg === "string" ? arg.trim() : toText(arg)))
    .filter((arg) => arg !== "");
}

export function commandTimeoutMs(seconds) {
  const parsed = Number(seconds);
  const s = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_TIMEOUT_SECONDS) : DEFAULT_TIMEOUT_SECONDS;
  return Math.min(Math.max(Math.round(s * 1000), 1000), MAX_COMMAND_MS);
}

export function runOptions(config = {}) {
  const options = { timeoutMs: commandTimeoutMs(config.timeoutSeconds) };
  const cwd = toText(config.cwd).trim();
  if (cwd) options.cwd = cwd;
  const env = toEnv(config.env);
  if (Object.keys(env).length) options.env = env;
  const stdin = toText(config.stdin);
  if (stdin) options.stdin = stdin;
  return {
    body: options,
    failOnError: toBool(config.failOnError, true),
    parseJson: toBool(config.parseJson, false),
  };
}

function tail(text) {
  const t = toText(text).trim();
  return t.length > ERROR_TAIL_CHARS ? `…${t.slice(-ERROR_TAIL_CHARS)}` : t;
}

export function commandResult(res, { failOnError = true, parseJson = false, timeoutMs, noun = "Command", extra = {} } = {}) {
  const stdout = toText(res?.stdout);
  const stderr = toText(res?.stderr);
  const result = {
    success: true,
    exitCode: typeof res?.exitCode === "number" ? res.exitCode : null,
    output: stdout.replace(/\s+$/, ""),
    stdout,
    stderr,
    durationMs: typeof res?.durationMs === "number" ? res.durationMs : null,
    timedOut: res?.timedOut === true,
    truncated: res?.truncated === true,
    json: null,
    ...extra,
  };

  let failure = null;
  if (result.timedOut) {
    failure = computerError(
      `Timed out after ${Math.round((timeoutMs || 0) / 1000)}s and was stopped`,
      "timeout",
      "Raise Timeout (seconds) up to 300, or start long jobs in the background with nohup … &.",
    );
  } else if (result.exitCode === null) {
    failure = computerError(
      `Stopped by ${res?.signal || "a signal"} before it finished`,
      "code",
      "The process was killed, often because the computer ran out of memory.",
    );
  } else if (result.exitCode !== 0) {
    const detail = tail(stderr) || tail(stdout);
    failure = computerError(
      `${noun} exited with code ${result.exitCode}${detail ? `: ${detail}` : ""}`,
      "code",
      "Check stderr in the run output. Turn off \"Stop the run on error\" to continue with success false instead.",
    );
  }

  if (parseJson && result.output) {
    try {
      result.json = JSON.parse(result.output);
    } catch {
      failure ||= computerError(
        `Output is not valid JSON: ${result.output.trim().slice(0, 200)}`,
        "parse",
        "Print exactly one JSON value to stdout, or turn off \"Parse output as JSON\".",
      );
    }
  }

  if (!failure) return result;
  if (failOnError) throw failure;
  return { ...result, success: false, error: failure.message };
}
