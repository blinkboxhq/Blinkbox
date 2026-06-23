import axios from "axios";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 100 * 1024 * 1024;
const MAX_BODY_BYTES = 100 * 1024 * 1024;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;
const MAX_RETRY_AFTER_MS = 30_000;

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
// Connection never reached the server — safe to retry for any HTTP method.
const PRE_CONNECT_CODES = new Set(["ECONNREFUSED", "EAI_AGAIN", "ENETUNREACH", "EHOSTUNREACH"]);
// May have died mid-flight — only safe to retry for idempotent methods.
const MID_FLIGHT_CODES = new Set(["ECONNRESET", "ECONNABORTED", "ETIMEDOUT", "EPIPE"]);
const IDEMPOTENT = new Set(["get", "head", "options"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isStreamLike(data) {
  return data != null && (typeof data.pipe === "function" || typeof data.getBoundary === "function");
}

function retryDelayMs(err, attempt) {
  const raw = err.response?.headers?.["retry-after"];
  if (raw) {
    const secs = Number(raw);
    const ms = Number.isFinite(secs) ? secs * 1000 : Date.parse(raw) - Date.now();
    if (Number.isFinite(ms) && ms > 0) return Math.min(ms, MAX_RETRY_AFTER_MS);
  }
  return BASE_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * 250);
}

function isRetryable(err, attempt) {
  const cfg = err?.config;
  if (!cfg || attempt >= MAX_RETRIES) return false;
  if (isStreamLike(cfg.data)) return false;
  const method = String(cfg.method || "get").toLowerCase();
  const status = err.response?.status;
  if (status != null) {
    if (status === 429) return true;
    return RETRYABLE_STATUS.has(status) && IDEMPOTENT.has(method);
  }
  if (PRE_CONNECT_CODES.has(err.code)) return true;
  return MID_FLIGHT_CODES.has(err.code) && IDEMPOTENT.has(method);
}

let installed = false;

export function installHttpHardening(instance = axios) {
  if (installed) return;
  installed = true;

  instance.interceptors.request.use((cfg) => {
    if (cfg.__bbSkipHardening) return cfg;
    if (cfg.timeout == null || cfg.timeout === 0) cfg.timeout = DEFAULT_TIMEOUT_MS;
    if (cfg.maxContentLength == null || cfg.maxContentLength === -1) cfg.maxContentLength = MAX_RESPONSE_BYTES;
    if (cfg.maxBodyLength == null || cfg.maxBodyLength === -1 || cfg.maxBodyLength === Infinity) {
      cfg.maxBodyLength = MAX_BODY_BYTES;
    }
    return cfg;
  });

  instance.interceptors.response.use(undefined, async (err) => {
    const cfg = err?.config;
    if (!cfg || cfg.__bbSkipHardening) throw err;
    const attempt = cfg.__bbAttempt || 0;
    if (!isRetryable(err, attempt)) throw err;
    cfg.__bbAttempt = attempt + 1;
    await sleep(retryDelayMs(err, attempt));
    return instance.request(cfg);
  });
}
