/**
 * Resource sampling for both sides of the test.
 *
 * The harness can only read the target's heap directly if it happens to be on
 * the same box, so target footprint is sampled out-of-band via `ps` on the
 * listening PID. On a remote target these fields stay null and the leak checks
 * downgrade to WARN rather than silently passing.
 */
import { execFile } from "node:child_process";
import { monitorEventLoopDelay, type IntervalHistogram } from "node:perf_hooks";
import { promisify } from "node:util";
import type { ResourceSample } from "./types.js";

const exec = promisify(execFile);

export async function detectListenerPid(port: number): Promise<number | null> {
  if (process.platform === "win32") return null;
  try {
    const { stdout } = await exec("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { timeout: 4000 });
    const pid = Number(stdout.trim().split(/\s+/)[0]);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

async function sampleProcess(pid: number): Promise<{ rssMb: number; cpuPct: number } | null> {
  if (process.platform === "win32") return null;
  try {
    const { stdout } = await exec("ps", ["-o", "rss=,%cpu=", "-p", String(pid)], { timeout: 4000 });
    const [rssKb, cpu] = stdout.trim().split(/\s+/).map(Number);
    if (!Number.isFinite(rssKb)) return null;
    return { rssMb: rssKb / 1024, cpuPct: Number.isFinite(cpu) ? cpu : 0 };
  } catch {
    return null;
  }
}

export class ResourceSampler {
  private loopLag: IntervalHistogram;
  private timer: NodeJS.Timeout | null = null;
  private lastCpu = process.cpuUsage();
  private lastCpuAt = Date.now();
  private targetCache: { rssMb: number; cpuPct: number } | null = null;
  latest: ResourceSample;
  peak: ResourceSample | null = null;
  readonly samples: ResourceSample[] = [];

  constructor(readonly targetPid: number | null, private readonly intervalMs = 1000) {
    this.loopLag = monitorEventLoopDelay({ resolution: 10 });
    this.loopLag.enable();
    this.latest = this.readSync();
  }

  private readSync(): ResourceSample {
    const mem = process.memoryUsage();
    const now = Date.now();
    const cpu = process.cpuUsage(this.lastCpu);
    const wallUs = Math.max(1, (now - this.lastCpuAt) * 1000);
    return {
      at: now,
      harnessHeapUsedMb: mem.heapUsed / 1024 ** 2,
      harnessRssMb: mem.rss / 1024 ** 2,
      harnessCpuPct: ((cpu.user + cpu.system) / wallUs) * 100,
      eventLoopLagP99Ms: this.loopLag.percentile(99) / 1e6,
      targetRssMb: this.targetCache?.rssMb ?? null,
      targetCpuPct: this.targetCache?.cpuPct ?? null,
    };
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    this.timer.unref();
  }

  private async tick(): Promise<void> {
    if (this.targetPid) this.targetCache = await sampleProcess(this.targetPid);
    const s = this.readSync();
    this.lastCpu = process.cpuUsage();
    this.lastCpuAt = s.at;
    this.loopLag.reset();
    this.latest = s;
    this.samples.push(s);
    if (this.samples.length > 5000) this.samples.shift();
    if (!this.peak || (s.targetRssMb ?? s.harnessRssMb) > (this.peak.targetRssMb ?? this.peak.harnessRssMb)) {
      this.peak = s;
    }
  }

  /** Force a fresh out-of-band read; used around memory checkpoints. */
  async snapshot(): Promise<ResourceSample> {
    if (this.targetPid) this.targetCache = await sampleProcess(this.targetPid);
    const s = this.readSync();
    this.latest = s;
    return s;
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.loopLag.disable();
  }

  /** Peak within a window, by target RSS when available and harness RSS otherwise. */
  peakBetween(fromAt: number, toAt: number): ResourceSample | null {
    const inWindow = this.samples.filter((s) => s.at >= fromAt && s.at <= toAt);
    if (!inWindow.length) return null;
    return inWindow.reduce((a, b) =>
      (b.targetRssMb ?? b.harnessRssMb) > (a.targetRssMb ?? a.harnessRssMb) ? b : a,
    );
  }
}
