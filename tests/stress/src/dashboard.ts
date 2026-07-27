/**
 * Live terminal dashboard. Renders the active Recorder + ResourceSampler in
 * place on a TTY; degrades to a periodic one-line digest when piped to a file
 * or CI log.
 */
import { c, fmtBytes, fmtMs } from "./logger.js";
import { registry } from "./metrics.js";
import type { ResourceSampler } from "./resources.js";
import type { ErrorClass } from "./types.js";

const HOT: ErrorClass[] = ["http_4xx", "http_413", "http_429", "http_5xx", "timeout", "socket_drop", "connect_error"];

const CLASS_LABEL: Record<ErrorClass, string> = {
  ok: "2xx",
  http_3xx: "3xx",
  http_4xx: "4xx",
  http_413: "413",
  http_429: "429",
  http_5xx: "5xx",
  timeout: "timeout",
  socket_drop: "sockdrop",
  connect_error: "connerr",
  dns_error: "dns",
  other: "other",
};

const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));
const lpad = (s: string, n: number) => (s.length >= n ? s : " ".repeat(n - s.length) + s);

export class Dashboard {
  private timer: NodeJS.Timeout | null = null;
  private linesDrawn = 0;
  private phase = "";

  constructor(
    private readonly sampler: ResourceSampler,
    private readonly live: boolean,
    private readonly intervalMs = 500,
  ) {}

  setPhase(p: string): void {
    this.phase = p;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.render(), this.live ? this.intervalMs : 5000);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.live && this.linesDrawn) {
      process.stdout.write(`\x1b[${this.linesDrawn}A\x1b[0J`);
      this.linesDrawn = 0;
    }
  }

  private render(): void {
    const rec = registry.active;
    if (!rec) return;
    const s = rec.snapshot();
    const r = this.sampler.latest;

    if (!this.live) {
      const errs = HOT.filter((k) => s.byClass[k] > 0)
        .map((k) => `${CLASS_LABEL[k]}=${s.byClass[k]}`)
        .join(" ");
      console.log(
        `[${this.phase || s.label}] n=${s.total} rps=${rec.currentRps().toFixed(0)} inflight=${s.inFlight} ` +
          `p99=${fmtMs(s.latency.p99Ms)} ok=${s.byClass.ok} ${errs} ` +
          `heap=${r.harnessHeapUsedMb.toFixed(0)}MB target=${r.targetRssMb ? `${r.targetRssMb.toFixed(0)}MB` : "n/a"}`,
      );
      return;
    }

    const errCells = HOT.map((k) => {
      const v = s.byClass[k];
      const cell = `${CLASS_LABEL[k]} ${lpad(String(v), 5)}`;
      return v > 0 ? c.red(cell) : c.dim(cell);
    });

    const lines = [
      `${c.bold(c.magenta("CHAOS CASCADE"))} ${c.dim("│")} ${c.cyan(pad(this.phase || s.label, 44))}${c.dim(
        `t+${((Date.now() - s.elapsedMs > 0 ? s.elapsedMs : 0) / 1000).toFixed(0)}s`,
      )}`,
      `${c.dim("conns")} ${lpad(String(s.inFlight), 5)} ${c.dim(`(peak ${s.peakInFlight})`)}   ` +
        `${c.dim("rps")} ${lpad(rec.currentRps().toFixed(0), 6)} ${c.dim(`(peak ${s.peakRps})`)}   ` +
        `${c.dim("sent")} ${pad(fmtBytes(s.bytesSent), 10)}`,
      `${c.dim("total")} ${lpad(String(s.total), 5)}   ${c.green(`ok ${lpad(String(s.succeeded), 6)}`)}   ` +
        `${s.failed ? c.red(`fail ${lpad(String(s.failed), 5)}`) : c.dim(`fail ${lpad("0", 5)}`)}   ` +
        `${c.dim("err%")} ${lpad(s.total ? ((s.failed / s.total) * 100).toFixed(1) : "0.0", 5)}`,
      `${c.dim("lat")}  avg ${pad(fmtMs(s.latency.avgMs), 9)} p50 ${pad(fmtMs(s.latency.p50Ms), 9)} ` +
        `p95 ${pad(fmtMs(s.latency.p95Ms), 9)} p99 ${pad(fmtMs(s.latency.p99Ms), 9)}`,
      `${c.dim("errs")} ${errCells.join(" ")}`,
      `${c.dim("host")} harness heap ${pad(`${r.harnessHeapUsedMb.toFixed(0)}MB`, 8)} rss ${pad(
        `${r.harnessRssMb.toFixed(0)}MB`,
        8,
      )} cpu ${pad(`${r.harnessCpuPct.toFixed(0)}%`, 6)} loop-p99 ${fmtMs(r.eventLoopLagP99Ms)}`,
      `${c.dim("under test")} rss ${pad(r.targetRssMb ? `${r.targetRssMb.toFixed(0)}MB` : "n/a", 8)} cpu ${pad(
        r.targetCpuPct != null ? `${r.targetCpuPct.toFixed(0)}%` : "n/a",
        6,
      )} ${c.dim(this.sampler.targetPid ? `pid ${this.sampler.targetPid}` : "pid unknown — pass --target-pid")}`,
    ];

    if (this.linesDrawn) process.stdout.write(`\x1b[${this.linesDrawn}A\x1b[0J`);
    process.stdout.write(lines.join("\n") + "\n");
    this.linesDrawn = lines.length;
  }
}
