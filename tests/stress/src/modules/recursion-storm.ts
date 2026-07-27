/**
 * Module 2 — Recursive & Circular Loop Trigger.
 *
 * Blinkbox rejects cyclic graphs statically (validateAutomation), so a cycle has
 * to be built the way a real user would accidentally build one: two automations
 * that webhook each other (A → B → A), plus one that calls its own webhook.
 * Nothing in the static validator can see across automation boundaries — the
 * only thing standing between this and an infinite loop is the runtime: the
 * per-automation webhook rate limiter and the 500-cursor execution cap.
 *
 * The storm then drives the entry webhook open-loop at 1000+ ops/sec while a
 * watchdog on a *separate socket pool* polls /health. That separation is the
 * whole point: if the event loop is wedged, health latency explodes even though
 * the storm's own sockets are queued behind it.
 */
import { fmtMs, log, sleep } from "../logger.js";
import { registry } from "../metrics.js";
import { makeAgent, request } from "../http-client.js";
import { openLoop } from "../runner.js";
import { callerWorkflow, type Automation } from "../blinkbox-api.js";
import { finishReport, type ModuleCtx } from "../context.js";
import type { Check, MetricsSnapshot, ModuleReport } from "../types.js";

interface Pulse {
  newestAtMs: number;
  windowCount: number;
  statuses: Record<string, number>;
  maxCursors: number;
}

async function pulse(ctx: ModuleCtx, automationId: string, sinceMs: number): Promise<Pulse> {
  const execs = await ctx.api.listExecutions(automationId);
  let newestAtMs = 0;
  let windowCount = 0;
  let maxCursors = 0;
  const statuses: Record<string, number> = {};
  for (const e of execs) {
    const at = e.createdAt ? Date.parse(e.createdAt) : 0;
    if (at > newestAtMs) newestAtMs = at;
    if (at >= sinceMs) windowCount++;
    statuses[e.status ?? "unknown"] = (statuses[e.status ?? "unknown"] ?? 0) + 1;
    if (Array.isArray(e.cursors) && e.cursors.length > maxCursors) maxCursors = e.cursors.length;
  }
  return { newestAtMs, windowCount, statuses, maxCursors };
}

export async function runRecursionStorm(ctx: ModuleCtx): Promise<ModuleReport> {
  const startedAtMs = Date.now();
  const startedAt = new Date().toISOString();
  const checks: Check[] = [];
  const notes: string[] = [];
  const metrics: MetricsSnapshot[] = [];

  log.section("Module 2 — Recursive & Circular Loop Trigger");
  ctx.dash.setPhase("recursion · wiring A→B→A");

  const stamp = Date.now();
  const placeholder = ctx.api.webhookUrl("000000000000000000000000");

  let a: Automation;
  let b: Automation;
  let selfLoop: Automation;
  try {
    a = await ctx.api.createAutomation(callerWorkflow(`chaos-loop-a-${stamp}`, placeholder));
    ctx.trackAutomation(a._id);
    b = await ctx.api.createAutomation(callerWorkflow(`chaos-loop-b-${stamp}`, ctx.api.webhookUrl(a._id)));
    ctx.trackAutomation(b._id);
    selfLoop = await ctx.api.createAutomation(callerWorkflow(`chaos-loop-self-${stamp}`, placeholder));
    ctx.trackAutomation(selfLoop._id);
  } catch (e) {
    checks.push({
      name: "loop provisioning",
      verdict: "FAIL",
      detail: `Could not create the loop automations: ${(e as Error).message}`,
    });
    return finishReport({ module: "recursion", title: "Recursive & Circular Loop Trigger", startedAt, startedAtMs, checks, notes });
  }

  // A and the self-loop can only be pointed at their targets after those targets
  // exist, so both are created with a placeholder and repointed here.
  const repointedA = await ctx.api.updateAutomation(a._id, callerWorkflow(`chaos-loop-a-${stamp}`, ctx.api.webhookUrl(b._id)));
  const repointedSelf = await ctx.api.updateAutomation(
    selfLoop._id,
    callerWorkflow(`chaos-loop-self-${stamp}`, ctx.api.webhookUrl(selfLoop._id)),
  );

  const cycleAccepted = repointedA && repointedSelf;
  checks.push({
    name: "cross-automation cycle accepted",
    verdict: cycleAccepted ? "INFO" : "INFO",
    detail: cycleAccepted
      ? "The control plane accepted A→B→A and a self-calling automation. Static validation only sees one graph at a time, so runtime guards are the only defence."
      : "The control plane refused to save the loop wiring — cross-automation cycles are rejected before they can run.",
  });

  const activated = (await Promise.all([a, b, selfLoop].map((x) => ctx.api.activate(x._id)))).every(Boolean);
  if (!activated) {
    checks.push({
      name: "loop provisioning",
      verdict: "FAIL",
      detail: "One or more loop automations failed to activate; the public webhook 404s on inactive graphs.",
    });
    return finishReport({ module: "recursion", title: "Recursive & Circular Loop Trigger", startedAt, startedAtMs, checks, notes });
  }

  const aUrl = ctx.api.webhookUrl(a._id);
  const selfUrl = ctx.api.webhookUrl(selfLoop._id);

  // ── Preflight: does the outbound hop actually land? ───────────────────────
  // guardUrl() in httpRequest.node.js blocks loopback unless the backend runs
  // with ALLOW_LOCAL_REQUESTS=true. If it blocks, the loop never amplifies and
  // the amplification verdicts below would be false PASSes.
  ctx.dash.setPhase("recursion · preflight");
  const preflightAt = Date.now();
  await request({
    method: "POST",
    url: aUrl,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hop: 0, corr: `preflight-${stamp}` }),
    timeoutMs: ctx.cfg.requestTimeoutMs,
    silent: true,
  });
  await sleep(4000);
  const bPulse = await pulse(ctx, b._id, preflightAt);
  const hopLands = bPulse.windowCount > 0;
  notes.push(hopLands ? "outbound hop A→B confirmed" : "outbound hop A→B did not land (SSRF guard or executor failure)");

  if (!hopLands) {
    checks.push({
      name: "loop amplification reachable",
      verdict: "WARN",
      detail:
        "The A→B hop produced no execution on B, so the engine never actually recursed. On a loopback target this is the SSRF guard in httpRequest.node.js doing its job — restart the backend with ALLOW_LOCAL_REQUESTS=true to exercise real recursion. Ingest-side limiter and liveness results below are still valid.",
    });
  } else {
    checks.push({
      name: "loop amplification reachable",
      verdict: "INFO",
      detail: "A→B→A hops are landing; the storm below drives a genuinely self-feeding cycle.",
    });
  }

  // ── The storm ────────────────────────────────────────────────────────────
  const stormAgent = makeAgent(ctx.cfg.maxSockets);
  const watchAgent = makeAgent(4);
  const rec = registry.create("recursion:storm");
  const healthLatencies: number[] = [];
  let healthFailures = 0;
  let healthBreaches = 0;
  let watching = true;

  const watchdog = (async () => {
    while (watching) {
      const r = await request({
        method: "GET",
        url: `${ctx.api.base}/health`,
        agent: watchAgent,
        timeoutMs: 10_000,
        silent: true,
      });
      healthLatencies.push(r.latencyMs);
      if (!r.ok) healthFailures++;
      if (r.latencyMs > ctx.cfg.recursionHealthBudgetMs) healthBreaches++;
      await sleep(250);
    }
  })();

  const stormStart = Date.now();
  ctx.dash.setPhase(`recursion · storm ${ctx.cfg.recursionTargetRps} rps × ${ctx.cfg.recursionDurationSec}s`);

  const loop = await openLoop({
    targetRps: ctx.cfg.recursionTargetRps,
    durationMs: ctx.cfg.recursionDurationSec * 1000,
    maxInFlight: ctx.cfg.maxSockets * 4,
    onEmit: (seq) =>
      request({
        method: "POST",
        url: seq % 2 === 0 ? aUrl : selfUrl,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hop: 0, corr: `storm-${seq}`, seq }),
        agent: stormAgent,
        timeoutMs: ctx.cfg.requestTimeoutMs,
      }),
  });

  rec.seal();
  watching = false;
  await watchdog;
  const snap = rec.snapshot();
  metrics.push(snap);

  healthLatencies.sort((x, y) => x - y);
  const healthP99 = healthLatencies.length
    ? healthLatencies[Math.min(healthLatencies.length - 1, Math.ceil(healthLatencies.length * 0.99) - 1)]
    : 0;
  const healthMax = healthLatencies.length ? healthLatencies[healthLatencies.length - 1] : 0;

  log.info(
    `  emitted ${loop.emitted} (shed ${loop.shed}) · achieved ${loop.achievedRps.toFixed(0)} rps · ` +
      `429 ${snap.byClass.http_429} · 2xx ${snap.byClass.ok} · 5xx ${snap.byClass.http_5xx} · ` +
      `health p99 ${fmtMs(healthP99)}`,
  );

  // ── Verdicts ─────────────────────────────────────────────────────────────
  const offered = loop.emitted - loop.shed;
  checks.push({
    name: "offered load",
    verdict: loop.achievedRps >= 1000 ? "PASS" : "WARN",
    detail: `Harness offered ${loop.achievedRps.toFixed(0)} req/s for ${(loop.durationMs / 1000).toFixed(1)}s (${offered} sent, ${loop.shed} shed client-side). The spec calls for 1000+.`,
    evidence: { achievedRps: Number(loop.achievedRps.toFixed(1)), emitted: loop.emitted, shed: loop.shed },
  });

  const intercepted = snap.byClass.http_429;
  const interceptRate = snap.total ? intercepted / snap.total : 0;
  checks.push({
    name: "rate limiter interception",
    verdict: intercepted > 0 ? "PASS" : "FAIL",
    detail:
      intercepted > 0
        ? `Webhook limiter intercepted ${intercepted} of ${snap.total} requests (${(interceptRate * 100).toFixed(1)}%) with 429 — the 60/min per-automation budget held under a ${loop.achievedRps.toFixed(0)} rps flood.`
        : `No 429s at ${loop.achievedRps.toFixed(0)} rps. The per-automation limiter did not engage; a recursive chain would be free to amplify without bound.`,
    evidence: { byClass: snap.byClass, byStatus: snap.byStatus },
  });

  const hardFailures = snap.byClass.http_5xx + snap.byClass.timeout + snap.byClass.socket_drop + snap.byClass.connect_error;
  checks.push({
    name: "graceful shedding",
    verdict: hardFailures === 0 ? "PASS" : hardFailures / Math.max(1, snap.total) < 0.01 ? "WARN" : "FAIL",
    detail:
      hardFailures === 0
        ? "Every shed request was shed as an HTTP status. No 5xx, timeouts, resets or refused connections."
        : `${hardFailures} of ${snap.total} requests failed below the HTTP layer (${snap.byClass.http_5xx} 5xx, ${snap.byClass.timeout} timeout, ${snap.byClass.socket_drop} reset, ${snap.byClass.connect_error} refused). Backpressure is leaking into connection failures instead of status codes.`,
    evidence: { byClass: snap.byClass },
  });

  checks.push({
    name: "event loop liveness (no thread lock)",
    verdict: healthFailures > 0 || healthP99 > ctx.cfg.recursionHealthBudgetMs ? "FAIL" : healthBreaches > 0 ? "WARN" : "PASS",
    detail:
      healthFailures > 0
        ? `/health failed ${healthFailures} times during the storm — the process stopped answering while under recursive load.`
        : healthP99 > ctx.cfg.recursionHealthBudgetMs
          ? `/health p99 was ${fmtMs(healthP99)} (max ${fmtMs(healthMax)}) against a ${fmtMs(ctx.cfg.recursionHealthBudgetMs)} budget — the event loop is being starved, which is what "locked threads" looks like in a single-threaded runtime.`
          : `/health stayed responsive throughout: p99 ${fmtMs(healthP99)}, max ${fmtMs(healthMax)} across ${healthLatencies.length} probes on an independent socket pool.`,
    evidence: {
      probes: healthLatencies.length,
      p99Ms: Number(healthP99.toFixed(1)),
      maxMs: Number(healthMax.toFixed(1)),
      failures: healthFailures,
      breaches: healthBreaches,
      harnessLoopLagP99Ms: Number(ctx.sampler.latest.eventLoopLagP99Ms.toFixed(2)),
    },
  });

  // ── Decay: does the cycle stop on its own once we stop pushing? ──────────
  ctx.dash.setPhase(`recursion · decay watch ${ctx.cfg.recursionDecayWatchSec}s`);
  const decaySamples: Array<{ tMs: number; aWindow: number; bWindow: number; selfWindow: number }> = [];
  let lastNewest = 0;
  let maxCursorsSeen = 0;

  for (let elapsed = 0; elapsed < ctx.cfg.recursionDecayWatchSec * 1000; elapsed += 4000) {
    await sleep(4000);
    const [pa, pb, ps] = await Promise.all([
      pulse(ctx, a._id, stormStart),
      pulse(ctx, b._id, stormStart),
      pulse(ctx, selfLoop._id, stormStart),
    ]);
    lastNewest = Math.max(pa.newestAtMs, pb.newestAtMs, ps.newestAtMs);
    maxCursorsSeen = Math.max(maxCursorsSeen, pa.maxCursors, pb.maxCursors, ps.maxCursors);
    decaySamples.push({ tMs: Date.now() - stormStart, aWindow: pa.windowCount, bWindow: pb.windowCount, selfWindow: ps.windowCount });
  }

  const stormEnd = stormStart + loop.durationMs;
  const stillFiringSec = lastNewest > stormEnd ? (lastNewest - stormEnd) / 1000 : 0;
  const settleBudgetSec = Math.max(15, ctx.cfg.recursionDecayWatchSec * 0.6);

  checks.push({
    name: "loop termination",
    verdict: !hopLands ? "SKIPPED" : stillFiringSec <= settleBudgetSec ? "PASS" : "FAIL",
    detail: !hopLands
      ? "Skipped: outbound hops never landed, so no self-feeding cycle existed to terminate. Re-run with ALLOW_LOCAL_REQUESTS=true on the backend."
      : stillFiringSec <= settleBudgetSec
        ? `Last self-triggered execution appeared ${stillFiringSec.toFixed(1)}s after the storm stopped — the cycle drains instead of sustaining itself.`
        : `Executions were still being created ${stillFiringSec.toFixed(1)}s after the storm stopped (budget ${settleBudgetSec.toFixed(0)}s). The cycle is self-sustaining: nothing is breaking the A→B→A chain.`,
    evidence: { stillFiringSec: Number(stillFiringSec.toFixed(1)), decaySamples },
  });

  checks.push({
    name: "cursor cap (runtime recursion depth)",
    verdict: maxCursorsSeen === 0 ? "SKIPPED" : maxCursorsSeen <= 500 ? "PASS" : "FAIL",
    detail:
      maxCursorsSeen === 0
        ? "No cursor data was returned by the executions API, so the 500-cursor cap could not be observed directly."
        : maxCursorsSeen <= 500
          ? `Deepest execution held ${maxCursorsSeen} cursors, within the MAX_CURSORS_PER_EXECUTION = 500 guard.`
          : `An execution accumulated ${maxCursorsSeen} cursors, past the 500 cap — the runtime cycle guard did not fire.`,
    evidence: { maxCursorsSeen },
  });

  const health = await ctx.api.health();
  checks.push({
    name: "post-storm recovery",
    verdict: health.status === 200 ? "PASS" : "FAIL",
    detail:
      health.status === 200
        ? `/health returned 200 in ${fmtMs(health.latencyMs)} after the storm and decay window.`
        : `/health returned ${health.status ?? health.errorClass} after the storm — the target did not recover.`,
  });

  stormAgent.destroy();
  watchAgent.destroy();

  return finishReport({
    module: "recursion",
    title: "Recursive & Circular Loop Trigger",
    startedAt,
    startedAtMs,
    checks,
    metrics,
    notes,
    resources: {
      baseline: null,
      peak: ctx.sampler.peakBetween(stormStart, Date.now()),
      final: await ctx.sampler.snapshot(),
    },
    data: {
      automations: { a: a._id, b: b._id, selfLoop: selfLoop._id },
      offeredRps: Number(loop.achievedRps.toFixed(1)),
      emitted: loop.emitted,
      shed: loop.shed,
      maxObservedInFlight: loop.maxObservedInFlight,
      healthProbes: {
        count: healthLatencies.length,
        p99Ms: Number(healthP99.toFixed(1)),
        maxMs: Number(healthMax.toFixed(1)),
        failures: healthFailures,
      },
      hopLands,
    },
  });
}
