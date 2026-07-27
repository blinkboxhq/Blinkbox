/**
 * Latency + throughput accounting.
 *
 * Latency uses a log-linear bucketed histogram rather than a sample array: at
 * 1000+ rps for minutes, retaining every sample costs more memory than the
 * system under test is allowed to leak, which would poison the leak detector.
 * Bucket width is ~0.9% of value, so p99 error stays under 1%.
 */
import type { ErrorClass, LatencySnapshot, MetricsSnapshot, RequestResult } from "./types.js";

const SUB_BUCKETS = 8;
const MAX_BUCKET = 1 << 12;

export class Histogram {
  private buckets = new Uint32Array(MAX_BUCKET);
  count = 0;
  sum = 0;
  min = Number.POSITIVE_INFINITY;
  max = 0;

  private static index(ms: number): number {
    const v = Math.max(0, ms);
    const i = Math.floor(Math.log2(v + 1) * SUB_BUCKETS);
    return Math.min(MAX_BUCKET - 1, i);
  }

  private static value(index: number): number {
    return 2 ** ((index + 0.5) / SUB_BUCKETS) - 1;
  }

  record(ms: number): void {
    this.buckets[Histogram.index(ms)]++;
    this.count++;
    this.sum += ms;
    if (ms < this.min) this.min = ms;
    if (ms > this.max) this.max = ms;
  }

  percentile(p: number): number {
    if (this.count === 0) return 0;
    const target = Math.ceil((p / 100) * this.count);
    let seen = 0;
    for (let i = 0; i < MAX_BUCKET; i++) {
      seen += this.buckets[i];
      if (seen >= target) return Math.min(this.max, Histogram.value(i));
    }
    return this.max;
  }

  snapshot(): LatencySnapshot {
    return {
      count: this.count,
      minMs: this.count ? this.min : 0,
      maxMs: this.max,
      avgMs: this.count ? this.sum / this.count : 0,
      p50Ms: this.percentile(50),
      p95Ms: this.percentile(95),
      p99Ms: this.percentile(99),
    };
  }
}

const EMPTY_CLASSES: Record<ErrorClass, number> = {
  ok: 0,
  http_3xx: 0,
  http_4xx: 0,
  http_413: 0,
  http_429: 0,
  http_5xx: 0,
  timeout: 0,
  socket_drop: 0,
  connect_error: 0,
  dns_error: 0,
  other: 0,
};

export class Recorder {
  readonly label: string;
  readonly startedAt = Date.now();
  private hist = new Histogram();
  private byClass: Record<ErrorClass, number> = { ...EMPTY_CLASSES };
  private byStatus = new Map<number, number>();
  private secondBuckets = new Map<number, number>();
  total = 0;
  succeeded = 0;
  failed = 0;
  inFlight = 0;
  peakInFlight = 0;
  peakRps = 0;
  bytesSent = 0;
  bytesReceived = 0;
  finishedAt: number | null = null;

  constructor(label: string) {
    this.label = label;
  }

  open(): void {
    this.inFlight++;
    if (this.inFlight > this.peakInFlight) this.peakInFlight = this.inFlight;
  }

  close(r: RequestResult): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
    this.total++;
    this.hist.record(r.latencyMs);
    this.byClass[r.errorClass]++;
    this.bytesSent += r.bytesSent;
    this.bytesReceived += r.bytesReceived;
    if (r.status != null) this.byStatus.set(r.status, (this.byStatus.get(r.status) ?? 0) + 1);
    if (r.ok) this.succeeded++;
    else this.failed++;

    const sec = Math.floor(r.finishedAt / 1000);
    const n = (this.secondBuckets.get(sec) ?? 0) + 1;
    this.secondBuckets.set(sec, n);
    if (n > this.peakRps) this.peakRps = n;
    if (this.secondBuckets.size > 600) {
      const oldest = Math.min(...this.secondBuckets.keys());
      this.secondBuckets.delete(oldest);
    }
  }

  seal(): void {
    this.finishedAt = Date.now();
  }

  /** Throughput over the trailing `windowSec`, excluding the in-progress second. */
  currentRps(windowSec = 5): number {
    const now = Math.floor(Date.now() / 1000);
    let sum = 0;
    let counted = 0;
    for (let s = now - windowSec; s < now; s++) {
      sum += this.secondBuckets.get(s) ?? 0;
      counted++;
    }
    return counted ? sum / counted : 0;
  }

  snapshot(): MetricsSnapshot {
    const elapsedMs = (this.finishedAt ?? Date.now()) - this.startedAt;
    const byStatus: Record<string, number> = {};
    for (const [k, v] of [...this.byStatus.entries()].sort((a, b) => a[0] - b[0])) byStatus[String(k)] = v;
    return {
      label: this.label,
      total: this.total,
      succeeded: this.succeeded,
      failed: this.failed,
      inFlight: this.inFlight,
      peakInFlight: this.peakInFlight,
      rps: elapsedMs > 0 ? (this.total / elapsedMs) * 1000 : 0,
      peakRps: this.peakRps,
      elapsedMs,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      byClass: { ...this.byClass },
      byStatus,
      latency: this.hist.snapshot(),
    };
  }
}

/** Every Recorder registers here so the live dashboard can render without plumbing. */
class Registry {
  private recorders: Recorder[] = [];
  active: Recorder | null = null;

  create(label: string): Recorder {
    const r = new Recorder(label);
    this.recorders.push(r);
    this.active = r;
    return r;
  }

  all(): Recorder[] {
    return this.recorders;
  }

  totals(): { requests: number; failures: number } {
    return this.recorders.reduce(
      (acc, r) => ({ requests: acc.requests + r.total, failures: acc.failures + r.failed }),
      { requests: 0, failures: 0 },
    );
  }
}

export const registry = new Registry();
