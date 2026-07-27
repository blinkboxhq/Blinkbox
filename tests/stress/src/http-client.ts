/**
 * Minimal instrumented HTTP client built on node:http.
 *
 * We deliberately avoid fetch(): the suite needs to tell a genuine TCP reset
 * apart from a read timeout apart from a connect refusal, needs exact byte
 * accounting on 50 MB uploads, and needs to pin a fixed socket pool so that
 * "concurrency" means sockets rather than promises.
 */
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import type { ErrorClass, RequestResult } from "./types.js";
import { registry } from "./metrics.js";

export interface RequestOptions {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: Buffer | string | null;
  timeoutMs?: number;
  agent?: http.Agent | https.Agent;
  /** Skip metrics accounting — used by watchdog probes that must not skew RPS. */
  silent?: boolean;
  maxResponseBytes?: number;
}

export function makeAgent(maxSockets: number, keepAlive = true): http.Agent {
  return new http.Agent({ keepAlive, maxSockets, maxFreeSockets: maxSockets, scheduling: "fifo" });
}

export function makeHttpsAgent(maxSockets: number, keepAlive = true): https.Agent {
  return new https.Agent({ keepAlive, maxSockets, maxFreeSockets: maxSockets });
}

function classify(status: number | null, err: NodeJS.ErrnoException | null, timedOut: boolean): ErrorClass {
  if (timedOut) return "timeout";
  if (err) {
    const code = err.code ?? "";
    if (code === "ECONNRESET" || code === "EPIPE" || /socket hang up/i.test(err.message)) return "socket_drop";
    if (code === "ECONNREFUSED" || code === "EHOSTUNREACH" || code === "ENETUNREACH") return "connect_error";
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "dns_error";
    if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") return "timeout";
    return "other";
  }
  if (status == null) return "other";
  if (status === 413) return "http_413";
  if (status === 429) return "http_429";
  if (status >= 500) return "http_5xx";
  if (status >= 400) return "http_4xx";
  if (status >= 300) return "http_3xx";
  return "ok";
}

export async function request(opts: RequestOptions): Promise<RequestResult> {
  const url = new URL(opts.url);
  const secure = url.protocol === "https:";
  const lib = secure ? https : http;
  const body =
    opts.body == null ? null : Buffer.isBuffer(opts.body) ? opts.body : Buffer.from(opts.body, "utf8");
  const timeoutMs = opts.timeoutMs ?? 35_000;
  const maxResponseBytes = opts.maxResponseBytes ?? 256 * 1024;
  const rec = opts.silent ? null : registry.active;

  const headers: Record<string, string> = { connection: "keep-alive", ...(opts.headers ?? {}) };
  if (body) headers["content-length"] = String(body.byteLength);

  rec?.open();
  const startedAt = Date.now();
  const t0 = performance.now();

  return new Promise<RequestResult>((resolve) => {
    let settled = false;
    let timedOut = false;
    let received = 0;
    const chunks: Buffer[] = [];

    const finish = (status: number | null, err: NodeJS.ErrnoException | null) => {
      if (settled) return;
      settled = true;
      const latencyMs = performance.now() - t0;
      const errorClass = classify(status, err, timedOut);
      const result: RequestResult = {
        ok: errorClass === "ok",
        status,
        errorClass,
        latencyMs,
        bytesSent: body ? body.byteLength : 0,
        bytesReceived: received,
        body: chunks.length ? Buffer.concat(chunks).toString("utf8") : null,
        errorMessage: err ? `${err.code ?? "ERR"}: ${err.message}` : timedOut ? "client timeout" : null,
        startedAt,
        finishedAt: Date.now(),
      };
      rec?.close(result);
      resolve(result);
    };

    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (secure ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: opts.method ?? "GET",
        headers,
        agent: opts.agent,
      },
      (res) => {
        res.on("data", (chunk: Buffer) => {
          received += chunk.byteLength;
          if (received <= maxResponseBytes) chunks.push(chunk);
        });
        res.on("end", () => finish(res.statusCode ?? null, null));
        res.on("error", (e) => finish(res.statusCode ?? null, e as NodeJS.ErrnoException));
        res.on("aborted", () =>
          finish(res.statusCode ?? null, Object.assign(new Error("response aborted"), { code: "ECONNRESET" })),
        );
      },
    );

    req.setTimeout(timeoutMs, () => {
      timedOut = true;
      req.destroy();
    });
    req.on("error", (e) => finish(null, e as NodeJS.ErrnoException));

    if (body) req.end(body);
    else req.end();
  });
}

export const json = (r: RequestResult): any => {
  if (!r.body) return null;
  try {
    return JSON.parse(r.body);
  } catch {
    return null;
  }
};
