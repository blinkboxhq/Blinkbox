/**
 * Load-shaping primitives.
 *
 * `openLoop` is deliberately not a worker pool: a closed-loop driver silently
 * throttles itself when the target slows down, which hides exactly the
 * backpressure collapse this suite exists to find. It emits on a schedule and
 * lets the in-flight count grow, so coordinated omission does not mask latency.
 */
import { sleep } from "./logger.js";

export async function runPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
  return results;
}

/**
 * Prepare N tasks, hold them at a gate, release them in one tick. This is how
 * the race hammer maximises the odds of genuinely simultaneous arrival rather
 * than a staircase of requests spread over the ramp-up.
 */
export async function barrierFanOut<R>(count: number, task: (index: number) => Promise<R>): Promise<R[]> {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const started = Array.from({ length: count }, async (_, i) => {
    await gate;
    return task(i);
  });
  await sleep(25);
  release();
  return Promise.all(started);
}

export interface OpenLoopOptions {
  targetRps: number;
  durationMs: number;
  maxInFlight: number;
  onEmit: (seq: number) => Promise<unknown>;
  onTick?: (stats: { emitted: number; inFlight: number; shed: number; elapsedMs: number }) => void;
}

export interface OpenLoopResult {
  emitted: number;
  shed: number;
  achievedRps: number;
  durationMs: number;
  maxObservedInFlight: number;
}

export async function openLoop(o: OpenLoopOptions): Promise<OpenLoopResult> {
  const start = performance.now();
  const intervalMs = 1000 / o.targetRps;
  let emitted = 0;
  let shed = 0;
  let inFlight = 0;
  let maxObservedInFlight = 0;
  const pending = new Set<Promise<unknown>>();

  while (performance.now() - start < o.durationMs) {
    const dueBy = performance.now() - start;
    const shouldHaveEmitted = Math.floor(dueBy / intervalMs) + 1;
    const batch = Math.min(shouldHaveEmitted - emitted, Math.max(1, Math.ceil(o.targetRps / 50)));

    for (let i = 0; i < batch; i++) {
      if (inFlight >= o.maxInFlight) {
        // Client-side shed: the harness must not become the bottleneck, and an
        // unbounded socket queue would OOM the harness before the target.
        shed++;
        emitted++;
        continue;
      }
      inFlight++;
      if (inFlight > maxObservedInFlight) maxObservedInFlight = inFlight;
      const seq = emitted++;
      const p = o
        .onEmit(seq)
        .catch(() => undefined)
        .finally(() => {
          inFlight--;
          pending.delete(p);
        });
      pending.add(p);
    }

    o.onTick?.({ emitted, inFlight, shed, elapsedMs: performance.now() - start });
    await sleep(Math.max(1, Math.min(20, intervalMs)));
  }

  await Promise.allSettled([...pending]);
  const durationMs = performance.now() - start;
  return { emitted, shed, achievedRps: (emitted / durationMs) * 1000, durationMs, maxObservedInFlight };
}

/** Poll `probe` until it returns a truthy value or the deadline passes. */
export async function waitFor<T>(
  probe: () => Promise<T | null | undefined | false>,
  { timeoutMs, intervalMs = 250 }: { timeoutMs: number; intervalMs?: number },
): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await probe();
    if (v) return v as T;
    if (Date.now() >= deadline) return null;
    await sleep(intervalMs);
  }
}
