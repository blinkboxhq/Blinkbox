/**
 * Module 1 — Dynamic Payload Escalation.
 *
 * Walks a payload ladder from 1 KB to 50 MB against the public webhook ingest
 * path and answers three questions per rung:
 *   1. does the body cap reject cleanly (413) or does the process degrade
 *      (5xx / timeout / reset)?  A clean rejection is a PASS, not a failure.
 *   2. does latency stay proportional to size, or does it cliff?
 *   3. does resident memory come back down after the rung settles, or does the
 *      target retain a slice of every payload it has ever parsed?
 *
 * Blinkbox mounts express.json({ limit: "2mb" }), so rungs above 2 MB are
 * expected to 413. The rungs below that boundary are where a real leak hides.
 */
import { fmtBytes, fmtMs, log, sleep } from "../logger.js";
import { registry } from "../metrics.js";
import { request } from "../http-client.js";
import { runPool } from "../runner.js";
import { sinkWorkflow } from "../blinkbox-api.js";
import { finishReport, type ModuleCtx } from "../context.js";
import type { Check, MetricsSnapshot, ModuleReport, ResourceSample } from "../types.js";

interface RungResult {
  bytes: number;
  label: string;
  concurrency: number;
  metrics: MetricsSnapshot;
  before: ResourceSample;
  after: ResourceSample;
  settled: ResourceSample;
  retainedMb: number | null;
  dominantOutcome: string;
}

function buildPayload(bytes: number, corr: string): Buffer {
  const head = Buffer.from(`{"corr":"${corr}","size":${bytes},"filler":"`, "utf8");
  const tail = Buffer.from(`"}`, "utf8");
  const fillLen = Math.max(1, bytes - head.byteLength - tail.byteLength);
  return Buffer.concat([head, Buffer.alloc(fillLen, 0x78), tail]);
}

const rungLabel = (b: number) => fmtBytes(b).replace(" ", "");

export async function runPayloadEscalation(ctx: ModuleCtx): Promise<ModuleReport> {
  const startedAtMs = Date.now();
  const startedAt = new Date().toISOString();
  const checks: Check[] = [];
  const notes: string[] = [];
  const rungs: RungResult[] = [];
  const metrics: MetricsSnapshot[] = [];

  log.section("Module 1 — Dynamic Payload Escalation");
  ctx.dash.setPhase("payload · provisioning");

  const automation = await ctx.api.createAutomation(sinkWorkflow(`chaos-payload-${Date.now()}`));
  ctx.trackAutomation(automation._id);
  const activated = await ctx.api.activate(automation._id);
  if (!activated) {
    checks.push({
      name: "provisioning",
      verdict: "FAIL",
      detail: "Could not activate the ingest sink automation; the public webhook rejects inactive graphs.",
    });
    return finishReport({ module: "payload", title: "Dynamic Payload Escalation", startedAt, startedAtMs, checks, notes });
  }

  const url = ctx.api.webhookUrl(automation._id);
  const baseline = await ctx.sampler.snapshot();
  notes.push(
    `baseline RSS ${baseline.targetRssMb ? `${baseline.targetRssMb.toFixed(1)} MB` : "unavailable (remote target)"}`,
  );

  let guardRung: number | null = null;
  let degradedRung: RungResult | null = null;

  for (const bytes of ctx.cfg.payloadLadderBytes) {
    const label = rungLabel(bytes);
    // Big rungs are throttled: 32 concurrent 50 MB buffers would OOM the harness
    // before the target, and the harness must never be the thing that breaks.
    const concurrency = Math.max(1, Math.min(ctx.cfg.concurrency, Math.floor((96 * 1024 ** 2) / bytes), 32));
    const iterations = ctx.cfg.payloadIterationsPerRung;

    ctx.dash.setPhase(`payload · rung ${label} ×${iterations} @c${concurrency}`);
    const rec = registry.create(`payload:${label}`);
    const before = await ctx.sampler.snapshot();
    const payload = buildPayload(bytes, `payload-${label}`);

    await runPool(Array.from({ length: iterations }, (_, i) => i), concurrency, async (i) =>
      request({
        method: "POST",
        url,
        headers: { "content-type": "application/json", "x-chaos-rung": label, "x-chaos-seq": String(i) },
        body: payload,
        agent: undefined,
        timeoutMs: ctx.cfg.requestTimeoutMs,
      }),
    );

    rec.seal();
    const after = await ctx.sampler.snapshot();
    await sleep(ctx.cfg.payloadSettleMs);
    const settled = await ctx.sampler.snapshot();

    const snap = rec.snapshot();
    metrics.push(snap);

    const outcomes = Object.entries(snap.byClass)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const dominantOutcome = outcomes.length ? outcomes[0][0] : "none";
    const retainedMb =
      baseline.targetRssMb != null && settled.targetRssMb != null ? settled.targetRssMb - baseline.targetRssMb : null;

    const rung: RungResult = { bytes, label, concurrency, metrics: snap, before, after, settled, retainedMb, dominantOutcome };
    rungs.push(rung);

    const accepted = snap.byClass.ok;
    const rejected = snap.byClass.http_413;
    const degraded = snap.byClass.http_5xx + snap.byClass.timeout + snap.byClass.socket_drop + snap.byClass.connect_error;

    log.info(
      `  ${label.padEnd(7)} accepted ${String(accepted).padStart(3)} · 413 ${String(rejected).padStart(3)} · ` +
        `degraded ${String(degraded).padStart(3)} · p99 ${fmtMs(snap.latency.p99Ms)} · ` +
        `target RSS ${settled.targetRssMb ? `${settled.targetRssMb.toFixed(0)} MB` : "n/a"}`,
    );

    if (rejected > 0 && guardRung == null) guardRung = bytes;
    if (degraded > 0 && !degradedRung) degradedRung = rung;

    // Once the cap rejects everything there is nothing left to learn from bigger
    // rungs except how fast the socket is torn down — keep going, it is cheap,
    // but stop if the target has started refusing connections outright.
    if (snap.byClass.connect_error === snap.total && snap.total > 0) {
      notes.push(`aborted ladder at ${label}: target stopped accepting connections`);
      checks.push({
        name: "target availability during escalation",
        verdict: "FAIL",
        detail: `Target refused all connections at the ${label} rung — ingest is not shedding load, it is falling over.`,
        evidence: { rung: label },
      });
      break;
    }
  }

  const firstRung = rungs[0];
  const lastRung = rungs[rungs.length - 1];

  if (firstRung) {
    checks.push({
      name: "small-payload baseline",
      verdict: firstRung.metrics.byClass.ok > 0 ? "PASS" : "FAIL",
      detail:
        firstRung.metrics.byClass.ok > 0
          ? `${firstRung.label} payloads accepted, p99 ${fmtMs(firstRung.metrics.latency.p99Ms)}.`
          : `${firstRung.label} payloads did not succeed — ingest is broken independently of size (dominant outcome: ${firstRung.dominantOutcome}).`,
      evidence: { rung: firstRung.label, byClass: firstRung.metrics.byClass },
    });
  }

  checks.push(
    guardRung != null
      ? {
          name: "body-size guard",
          verdict: "PASS",
          detail: `Ingest rejects oversized bodies with 413 starting at ${rungLabel(guardRung)} — the express.json 2 MB cap is enforced before the engine sees the payload.`,
          evidence: { guardRungBytes: guardRung },
        }
      : {
          name: "body-size guard",
          verdict: "WARN",
          detail: `No 413 anywhere on the ladder up to ${lastRung ? lastRung.label : "n/a"}. Either the cap is above the ladder or oversized bodies are being buffered — raise --payload-ladder and re-run.`,
        },
  );

  checks.push(
    degradedRung
      ? {
          name: "oversize failure mode",
          verdict: "FAIL",
          detail: `At ${degradedRung.label} the target produced ${degradedRung.metrics.byClass.http_5xx} 5xx, ${degradedRung.metrics.byClass.timeout} timeouts and ${degradedRung.metrics.byClass.socket_drop} socket drops. Oversized input must be refused, not survived.`,
          evidence: { rung: degradedRung.label, byClass: degradedRung.metrics.byClass },
        }
      : {
          name: "oversize failure mode",
          verdict: "PASS",
          detail: "Every rung terminated in a clean HTTP status — no timeouts, socket hangs or 5xx anywhere on the ladder.",
        },
  );

  const largestAccepted = [...rungs].reverse().find((r) => r.metrics.byClass.ok > 0);
  const finalRetained = lastRung?.retainedMb ?? null;

  if (finalRetained == null) {
    checks.push({
      name: "memory retention",
      verdict: "WARN",
      detail:
        "Target RSS could not be sampled (remote host or unknown PID), so heap retention is unverified. Pass --target-pid to enable this check.",
    });
  } else if (largestAccepted) {
    const budgetMb = (largestAccepted.bytes / 1024 ** 2) * (ctx.cfg.payloadLeakRetentionPct / 100);
    const leaked = finalRetained > Math.max(budgetMb, 24);
    checks.push({
      name: "memory retention",
      verdict: leaked ? "FAIL" : "PASS",
      detail: leaked
        ? `Target RSS is ${finalRetained.toFixed(1)} MB above baseline after the ladder settled — more than the ${Math.max(budgetMb, 24).toFixed(1)} MB budget for the largest accepted payload (${largestAccepted.label}). Payload buffers are being retained.`
        : `Target RSS returned to within ${finalRetained.toFixed(1)} MB of baseline after settling — no payload retention detected.`,
      evidence: {
        baselineRssMb: baseline.targetRssMb,
        finalRssMb: lastRung?.settled.targetRssMb ?? null,
        budgetMb: Math.max(budgetMb, 24),
      },
    });
  }

  const monotonic =
    rungs.length >= 3 &&
    rungs.every((r) => r.retainedMb != null) &&
    rungs.every((r, i) => i === 0 || (r.retainedMb as number) >= (rungs[i - 1].retainedMb as number) - 1);
  if (monotonic && (lastRung?.retainedMb ?? 0) > 32) {
    checks.push({
      name: "monotonic growth",
      verdict: "WARN",
      detail: `Post-settle RSS never came back down between rungs (final +${lastRung!.retainedMb!.toFixed(1)} MB). That is the shape of a slow leak rather than fragmentation — re-run with a longer --payload-settle to confirm.`,
    });
  }

  const health = await ctx.api.health();
  checks.push({
    name: "post-escalation health",
    verdict: health.status === 200 ? "PASS" : "FAIL",
    detail:
      health.status === 200
        ? `/health returned 200 in ${fmtMs(health.latencyMs)} after the ladder.`
        : `/health returned ${health.status ?? health.errorClass} after the ladder — the target did not recover.`,
  });

  return finishReport({
    module: "payload",
    title: "Dynamic Payload Escalation",
    startedAt,
    startedAtMs,
    checks,
    metrics,
    notes,
    resources: { baseline, peak: ctx.sampler.peakBetween(startedAtMs, Date.now()), final: lastRung?.settled ?? null },
    data: {
      rungs: rungs.map((r) => ({
        rung: r.label,
        bytes: r.bytes,
        concurrency: r.concurrency,
        accepted: r.metrics.byClass.ok,
        rejected413: r.metrics.byClass.http_413,
        degraded:
          r.metrics.byClass.http_5xx + r.metrics.byClass.timeout + r.metrics.byClass.socket_drop,
        p99Ms: Number(r.metrics.latency.p99Ms.toFixed(1)),
        targetRssMbAfterSettle: r.settled.targetRssMb,
        retainedMb: r.retainedMb,
      })),
    },
  });
}
