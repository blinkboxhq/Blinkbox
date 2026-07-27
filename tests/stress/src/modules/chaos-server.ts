/**
 * Mock chaos webhook receiver — the "flaky third party" Blinkbox nodes call out to.
 *
 * Zero dependencies (node:http only) so the suite stays self-contained. Fault
 * selection is driven by a seeded PRNG: the same --seed replays the identical
 * fault sequence, which is what makes a retry/backoff regression bisectable.
 */
import http from "node:http";
import { c, log } from "../logger.js";

export type FaultMode = "delay" | "error" | "drop" | "ok";

export interface ChaosServerOptions {
  host: string;
  port: number;
  seed: number;
  delayMs: number;
  weights: { delay: number; error: number; drop: number; ok: number };
  errorCodes?: number[];
}

export interface Attempt {
  corr: string;
  at: number;
  mode: FaultMode;
  status: number | null;
  bytes: number;
  headers: Record<string, string>;
}

export interface ChaosStats {
  totalRequests: number;
  byMode: Record<FaultMode, number>;
  byStatus: Record<string, number>;
  uniqueCorrelations: number;
  attemptsByCorr: Record<string, number>;
  retriedCorrelations: number;
  maxAttemptsForOneCorr: number;
  backoffGapsMs: number[];
  openSocketsPeak: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ChaosServer {
  private server: http.Server | null = null;
  private rand: () => number;
  private readonly errorCodes: number[];
  readonly attempts: Attempt[] = [];
  private openSockets = 0;
  private openSocketsPeak = 0;
  private pendingTimers = new Set<NodeJS.Timeout>();

  constructor(private readonly o: ChaosServerOptions) {
    this.rand = mulberry32(o.seed);
    this.errorCodes = o.errorCodes ?? [429, 502, 503, 504];
  }

  get url(): string {
    return `http://${this.o.host}:${this.o.port}`;
  }

  private pickMode(): FaultMode {
    const { delay, error, drop, ok } = this.o.weights;
    const total = delay + error + drop + ok;
    const roll = this.rand() * total;
    if (roll < delay) return "delay";
    if (roll < delay + error) return "error";
    if (roll < delay + error + drop) return "drop";
    return "ok";
  }

  private correlationOf(req: http.IncomingMessage, body: string): string {
    const url = new URL(req.url ?? "/", "http://x");
    const fromQuery = url.searchParams.get("corr");
    if (fromQuery) return fromQuery;
    const fromHeader = req.headers["x-chaos-corr"];
    if (typeof fromHeader === "string") return fromHeader;
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (typeof parsed?.corr === "string") return parsed.corr;
    } catch {
      /* body is not JSON — fall through to the anonymous bucket */
    }
    return "anon";
  }

  async start(): Promise<void> {
    this.server = http.createServer((req, res) => {
      this.openSockets++;
      if (this.openSockets > this.openSocketsPeak) this.openSocketsPeak = this.openSockets;
      const done = () => {
        this.openSockets = Math.max(0, this.openSockets - 1);
      };
      res.on("close", done);

      let body = "";
      let bytes = 0;
      req.on("data", (chunk: Buffer) => {
        bytes += chunk.byteLength;
        if (body.length < 64 * 1024) body += chunk.toString("utf8");
      });
      req.on("error", done);

      req.on("end", () => {
        const url = new URL(req.url ?? "/", "http://x");

        if (url.pathname === "/__chaos/stats") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(this.stats()));
          return;
        }
        if (url.pathname === "/__chaos/health") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: true, attempts: this.attempts.length }));
          return;
        }

        const forced = url.searchParams.get("mode") as FaultMode | null;
        const mode: FaultMode = forced && ["delay", "error", "drop", "ok"].includes(forced) ? forced : this.pickMode();
        const corr = this.correlationOf(req, body);
        const record = (status: number | null) => {
          this.attempts.push({
            corr,
            at: Date.now(),
            mode,
            status,
            bytes,
            headers: Object.fromEntries(
              Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v ?? "")]),
            ),
          });
        };

        if (mode === "drop") {
          record(null);
          // Emit a partial response, then kill the socket mid-transmission so the
          // caller sees ECONNRESET rather than a clean short read.
          res.socket?.write("HTTP/1.1 200 OK\r\ncontent-length: 512\r\n\r\n{\"partial\":true,");
          res.socket?.destroy();
          done();
          return;
        }

        if (mode === "error") {
          const status = this.errorCodes[Math.floor(this.rand() * this.errorCodes.length)];
          record(status);
          const headers: Record<string, string> = { "content-type": "application/json" };
          if (status === 429 || status === 503) headers["retry-after"] = "2";
          res.writeHead(status, headers);
          res.end(JSON.stringify({ chaos: true, mode, status, corr }));
          return;
        }

        if (mode === "delay") {
          record(200);
          const timer = setTimeout(() => {
            this.pendingTimers.delete(timer);
            if (res.writableEnded || res.destroyed) return;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ chaos: true, mode, heldMs: this.o.delayMs, corr }));
          }, this.o.delayMs);
          this.pendingTimers.add(timer);
          return;
        }

        record(200);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ chaos: true, mode: "ok", corr, echoBytes: bytes }));
      });
    });

    this.server.keepAliveTimeout = 65_000;
    this.server.headersTimeout = 70_000;

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(this.o.port, this.o.host, () => resolve());
    });

    log.ok(
      `chaos receiver on ${c.cyan(this.url)} ` +
        c.dim(
          `(delay ${this.o.weights.delay}% @${this.o.delayMs}ms · error ${this.o.weights.error}% · drop ${this.o.weights.drop}% · ok ${this.o.weights.ok}%, seed ${this.o.seed})`,
        ),
    );
  }

  stats(): ChaosStats {
    const byMode: Record<FaultMode, number> = { delay: 0, error: 0, drop: 0, ok: 0 };
    const byStatus: Record<string, number> = {};
    const byCorr = new Map<string, number[]>();

    for (const a of this.attempts) {
      byMode[a.mode]++;
      const key = a.status == null ? "socket_drop" : String(a.status);
      byStatus[key] = (byStatus[key] ?? 0) + 1;
      if (a.corr === "anon") continue;
      const list = byCorr.get(a.corr) ?? [];
      list.push(a.at);
      byCorr.set(a.corr, list);
    }

    const attemptsByCorr: Record<string, number> = {};
    const gaps: number[] = [];
    let retried = 0;
    let maxAttempts = 0;

    for (const [corr, times] of byCorr) {
      attemptsByCorr[corr] = times.length;
      if (times.length > 1) {
        retried++;
        times.sort((a, b) => a - b);
        for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
      }
      if (times.length > maxAttempts) maxAttempts = times.length;
    }

    return {
      totalRequests: this.attempts.length,
      byMode,
      byStatus,
      uniqueCorrelations: byCorr.size,
      attemptsByCorr,
      retriedCorrelations: retried,
      maxAttemptsForOneCorr: maxAttempts,
      backoffGapsMs: gaps.sort((a, b) => a - b),
      openSocketsPeak: this.openSocketsPeak,
    };
  }

  async stop(): Promise<void> {
    for (const t of this.pendingTimers) clearTimeout(t);
    this.pendingTimers.clear();
    if (!this.server) return;
    await new Promise<void>((resolve) => {
      this.server!.closeAllConnections?.();
      this.server!.close(() => resolve());
    });
    this.server = null;
  }
}

/** `npm run chaos:server` — run the flaky peer on its own to point other tools at it. */
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k: string, d: number) => {
    const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
    const n = hit ? Number(hit.split("=")[1]) : NaN;
    return Number.isFinite(n) ? n : d;
  };
  const server = new ChaosServer({
    host: "127.0.0.1",
    port: arg("chaos-port", 4599),
    seed: arg("seed", 1337),
    delayMs: arg("chaos-delay", 29_000),
    weights: {
      delay: arg("chaos-w-delay", 30),
      error: arg("chaos-w-error", 30),
      drop: arg("chaos-w-drop", 10),
      ok: arg("chaos-w-ok", 30),
    },
  });
  await server.start();
  log.ok(`chaos receiver on ${server.url} — stats at ${server.url}/__chaos/stats`);
  log.info(`force a fault with ?mode=delay|error|drop|ok`);
  process.on("SIGINT", () => {
    void server.stop().then(() => process.exit(0));
  });
}
