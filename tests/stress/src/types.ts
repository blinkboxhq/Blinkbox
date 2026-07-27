export type ErrorClass =
  | "ok"
  | "http_3xx"
  | "http_4xx"
  | "http_413"
  | "http_429"
  | "http_5xx"
  | "timeout"
  | "socket_drop"
  | "connect_error"
  | "dns_error"
  | "other";

export interface RequestResult {
  ok: boolean;
  status: number | null;
  errorClass: ErrorClass;
  latencyMs: number;
  bytesSent: number;
  bytesReceived: number;
  body: string | null;
  errorMessage: string | null;
  startedAt: number;
  finishedAt: number;
}

export interface LatencySnapshot {
  count: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface MetricsSnapshot {
  label: string;
  total: number;
  succeeded: number;
  failed: number;
  inFlight: number;
  peakInFlight: number;
  rps: number;
  peakRps: number;
  elapsedMs: number;
  bytesSent: number;
  bytesReceived: number;
  byClass: Record<ErrorClass, number>;
  byStatus: Record<string, number>;
  latency: LatencySnapshot;
}

export interface ResourceSample {
  at: number;
  harnessHeapUsedMb: number;
  harnessRssMb: number;
  harnessCpuPct: number;
  eventLoopLagP99Ms: number;
  targetRssMb: number | null;
  targetCpuPct: number | null;
}

export type Verdict = "PASS" | "FAIL" | "WARN" | "SKIPPED" | "INFO";

export interface Check {
  name: string;
  verdict: Verdict;
  detail: string;
  evidence?: Record<string, unknown>;
}

export interface ModuleReport {
  module: string;
  title: string;
  verdict: Verdict;
  startedAt: string;
  durationMs: number;
  checks: Check[];
  metrics?: MetricsSnapshot[];
  resources?: {
    baseline: ResourceSample | null;
    peak: ResourceSample | null;
    final: ResourceSample | null;
  };
  notes: string[];
  data?: Record<string, unknown>;
}

export interface RunReport {
  suite: "chaos-cascade";
  version: string;
  target: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  seed: number;
  verdict: Verdict;
  environment: {
    node: string;
    platform: string;
    arch: string;
    cpus: number;
    totalMemMb: number;
    targetPid: number | null;
  };
  modules: ModuleReport[];
  summary: {
    totalRequests: number;
    totalFailures: number;
    passed: number;
    failed: number;
    warned: number;
    skipped: number;
  };
}
