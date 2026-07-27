/**
 * Module 3 — Mock Chaos Webhook Receiver.
 *
 * Stands up a deliberately hostile HTTP peer (30% 29-second holds, 30% 429/502/
 * 503/504, 10% mid-transmission TCP kill, 30% clean 200) and points a Blinkbox
 * http_request node at it. The question is not whether calls fail — they are
 * designed to. It is what the engine does about it:
 *   · does it retry at all, and with growing gaps (exponential backoff)?
 *   · does a 29-second peer hold a worker hostage, or does the request time out?
 *   · do executions reach a terminal state, or pile up in "running" forever?
 *   · does the rest of the engine stay responsive while a peer misbehaves?
 */
import { c, fmtMs, log, sleep } from "../logger.js";
import { registry } from "../metrics.js";
import { makeAgent, request } from "../http-client.js";
import { runPool } from "../runner.js";
import { callerWorkflow } from "../blinkbox-api.js";
import { finishReport, type ModuleCtx } from "../context.js";
import { ChaosServer, type Attempt } from "./chaos-server.js";
import type { Check, MetricsSnapshot, ModuleReport } from "../types.js";

interface RetryAnalysis {
  correlations: number;
  retried: number;
  maxAttempts: number;
  gapsMs: number[];
  growingSeries: number;
  flatSeries: number;
  medianFirstGapMs: number | null;
  medianLastGapMs: number | null;
}

function analyseRetries(attempts: Attempt[]): RetryAnalysis {
  const byCorr = new Map<string, number[]>();
  for (const a of attempts) {
    if (a.corr === "anon" || a.corr.startsWith("selftest")) continue;
    const list = byCorr.get(a.corr) ?? [];
    list.push(a.at);
    byCorr.set(a.corr, list);
  }

  const gapsMs: number[] = [];
  const firstGaps: number[] = [];
  const lastGaps: number[] = [];
  let retried = 0;
  let maxAttempts = 0;
  let growingSeries = 0;
  let flatSeries = 0;

  for (const times of byCorr.values()) {
    times.sort((x, y) => x - y);
    maxAttempts = Math.max(maxAttempts, times.length);
    if (times.length < 2) continue;
    retried++;
    const series: number[] = [];
    for (let i = 1; i < times.length; i++) series.push(times[i] - times[i - 1]);
    gapsMs.push(...series);
    firstGaps.push(series[0]);
    lastGaps.push(series[series.length - 1]);
    if (series.length >= 2) {
      // "Growing" is deliberately lenient: jitter on top of exponential backoff
      // means strict doubling almost never shows up in a real trace.
      if (series[series.length - 1] >= series[0] * 1.5) growingSeries++;
      else flatSeries++;
    }
  }

  const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);

  return {
    correlations: byCorr.size,
    retried,
    maxAttempts,
    gapsMs: gapsMs.sort((a, b) => a - b),
    growingSeries,
    flatSeries,
    medianFirstGapMs: median(firstGaps),
    medianLastGapMs: median(lastGaps),
  };
}

export async function runFlakyWebhook(ctx: ModuleCtx): Promise<ModuleReport> {
  const startedAtMs = Date.now();
  const startedAt = new Date().toISOString();
  const checks: Check[] = [];
  const notes: string[] = [];
  const metrics: MetricsSnapshot[] = [];

  log.section("Module 3 — Mock Chaos Webhook Receiver");
  ctx.dash.setPhase("flaky · starting receiver");

  const chaos = new ChaosServer({
    host: ctx.cfg.chaosHost,
    port: ctx.cfg.chaosPort,
    seed: ctx.cfg.seed,
    delayMs: ctx.cfg.chaosDelayMs,
    weights: ctx.cfg.chaosWeights,
  });

  try {
    await chaos.start();
  } catch (e) {
    checks.push({
      name: "chaos receiver",
      verdict: "FAIL",
      detail: `Could not bind the mock receiver on ${ctx.cfg.chaosHost}:${ctx.cfg.chaosPort}: ${(e as Error).message}. Pass --chaos-port to pick a free port.`,
    });
    return finishReport({ module: "flaky", title: "Mock Chaos Webhook Receiver", startedAt, startedAtMs, checks, notes });
  }

  try {
    // ── Self-test: prove the mock actually produces the specified mix ───────
    ctx.dash.setPhase("flaky · receiver self-test");
    const selfAgent = makeAgent(8);
    const selfRec = registry.create("flaky:receiver-selftest");
    const probeCount = 40;
    await runPool(Array.from({ length: probeCount }, (_, i) => i), 8, async (i) =>
      request({
        method: "POST",
        url: `${chaos.url}/selftest?corr=selftest-${i}`,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ probe: i }),
        agent: selfAgent,
        // Short timeout: the point is to observe the hold, not to wait it out.
        timeoutMs: 1500,
      }),
    );
    selfRec.seal();
    const selfSnap = selfRec.snapshot();
    metrics.push(selfSnap);
    selfAgent.destroy();

    const sawDelay = selfSnap.byClass.timeout > 0;
    const sawErrors = selfSnap.byClass.http_429 + selfSnap.byClass.http_5xx > 0;
    const sawDrops = selfSnap.byClass.socket_drop > 0;
    const sawOk = selfSnap.byClass.ok > 0;
    checks.push({
      name: "receiver fault injection",
      verdict: sawDelay && sawErrors && sawOk ? "PASS" : "WARN",
      detail:
        `Mock peer produced ${selfSnap.byClass.ok} × 200, ${selfSnap.byClass.http_429 + selfSnap.byClass.http_5xx} × error ` +
        `(${JSON.stringify(selfSnap.byStatus)}), ${selfSnap.byClass.socket_drop} × mid-transmission reset and ` +
        `${selfSnap.byClass.timeout} × socket hold over ${probeCount} probes. ` +
        (sawDrops ? "" : "No TCP drop landed in this sample (10% mode, small sample). "),
      evidence: { byClass: selfSnap.byClass, byStatus: selfSnap.byStatus, seed: ctx.cfg.seed },
    });

    const selfTestAttempts = chaos.attempts.length;

    // ── Wire Blinkbox to the hostile peer ──────────────────────────────────
    ctx.dash.setPhase("flaky · provisioning caller");
    const caller = await ctx.api.createAutomation(
      callerWorkflow(`chaos-flaky-${Date.now()}`, `${chaos.url}/hook?corr={{ $json.corr }}`),
    );
    ctx.trackAutomation(caller._id);
    if (!(await ctx.api.activate(caller._id))) {
      checks.push({ name: "provisioning", verdict: "FAIL", detail: "Could not activate the flaky-peer caller automation." });
      return finishReport({ module: "flaky", title: "Mock Chaos Webhook Receiver", startedAt, startedAtMs, checks, notes, metrics });
    }
    const callerUrl = ctx.api.webhookUrl(caller._id);

    // Preflight: on a loopback target the SSRF guard blocks 127.0.0.1 unless the
    // backend runs with ALLOW_LOCAL_REQUESTS=true. Without this probe an SSRF
    // block would read as "the engine never retried" — a false FAIL.
    ctx.dash.setPhase("flaky · preflight");
    await request({
      method: "POST",
      url: callerUrl,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hop: 0, corr: "preflight" }),
      timeoutMs: ctx.cfg.requestTimeoutMs,
      silent: true,
    });
    await sleep(5000);
    const reachable = chaos.attempts.slice(selfTestAttempts).some((a) => a.corr === "preflight");

    if (!reachable) {
      checks.push({
        name: "engine → peer reachability",
        verdict: "SKIPPED",
        detail:
          `No outbound call reached the mock peer at ${chaos.url}. The SSRF guard in httpRequest.node.js blocks loopback destinations unless the backend is started with ALLOW_LOCAL_REQUESTS=true. ` +
          "Retry/backoff verdicts are skipped rather than failed — restart the backend with that flag to exercise them.",
        evidence: { chaosUrl: chaos.url },
      });
      notes.push("retry/backoff analysis skipped: outbound calls never reached the mock peer");
      const health = await ctx.api.health();
      checks.push({
        name: "engine health",
        verdict: health.status === 200 ? "PASS" : "FAIL",
        detail: `/health returned ${health.status ?? health.errorClass} in ${fmtMs(health.latencyMs)}.`,
      });
      return finishReport({
        module: "flaky",
        title: "Mock Chaos Webhook Receiver",
        startedAt,
        startedAtMs,
        checks,
        metrics,
        notes,
        data: { chaosStats: chaos.stats() },
      });
    }

    // ── Drive traffic through the flaky peer ───────────────────────────────
    ctx.dash.setPhase(`flaky · driving ${ctx.cfg.flakyRequests} executions`);
    const driveAgent = makeAgent(Math.min(ctx.cfg.concurrency, 32));
    const driveRec = registry.create("flaky:drive");
    const driveStart = Date.now();
    const attemptsBeforeDrive = chaos.attempts.length;

    await runPool(
      Array.from({ length: ctx.cfg.flakyRequests }, (_, i) => i),
      Math.min(ctx.cfg.concurrency, 32),
      async (i) =>
        request({
          method: "POST",
          url: callerUrl,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hop: 0, corr: `flaky-${i}` }),
          agent: driveAgent,
          timeoutMs: ctx.cfg.requestTimeoutMs,
        }),
    );
    driveRec.seal();
    metrics.push(driveRec.snapshot());
    driveAgent.destroy();

    // ── Observe: retries land here, well after ingest returned ─────────────
    const observeMs = ctx.cfg.flakyObserveSec * 1000;
    const watchAgent = makeAgent(4);
    const healthLatencies: number[] = [];
    let healthFailures = 0;
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
        await sleep(1000);
      }
    })();

    const observeUntil = Date.now() + observeMs;
    while (Date.now() < observeUntil) {
      const remaining = Math.ceil((observeUntil - Date.now()) / 1000);
      const seen = chaos.attempts.length - attemptsBeforeDrive;
      ctx.dash.setPhase(`flaky · observing retries ${remaining}s left · peer hits ${seen}`);
      await sleep(2000);
    }
    watching = false;
    await watchdog;
    watchAgent.destroy();

    const engineAttempts = chaos.attempts.slice(attemptsBeforeDrive);
    const analysis = analyseRetries(engineAttempts);
    const stats = chaos.stats();

    log.info(
      `  peer saw ${engineAttempts.length} calls across ${analysis.correlations} correlations · ` +
        `${analysis.retried} retried (max ${analysis.maxAttempts} attempts) · ` +
        `gaps ${analysis.gapsMs.length ? `${analysis.gapsMs[0]}–${analysis.gapsMs[analysis.gapsMs.length - 1]}ms` : "n/a"}`,
    );

    checks.push({
      name: "engine → peer reachability",
      verdict: engineAttempts.length > 0 ? "PASS" : "FAIL",
      detail:
        engineAttempts.length > 0
          ? `${engineAttempts.length} outbound calls reached the mock peer from ${ctx.cfg.flakyRequests} triggered executions.`
          : "The peer received no calls during the drive window even though the preflight landed.",
    });

    checks.push({
      name: "retry on transient failure",
      verdict: analysis.retried > 0 ? "PASS" : "WARN",
      detail:
        analysis.retried > 0
          ? `${analysis.retried} of ${analysis.correlations} correlations were attempted more than once (deepest: ${analysis.maxAttempts} attempts). The engine re-drives failed outbound calls.`
          : `Every correlation was attempted exactly once against a peer that fails ~70% of calls. There is no retry queue on the http_request path — transient 502/503/504s become permanent execution failures.`,
      evidence: {
        correlations: analysis.correlations,
        retried: analysis.retried,
        maxAttempts: analysis.maxAttempts,
        peerStatusMix: stats.byStatus,
      },
    });

    if (analysis.retried === 0) {
      checks.push({
        name: "exponential backoff",
        verdict: "SKIPPED",
        detail: "No retries occurred, so backoff shape could not be measured.",
      });
    } else if (analysis.growingSeries + analysis.flatSeries === 0) {
      checks.push({
        name: "exponential backoff",
        verdict: "WARN",
        detail: `Retries happened but no correlation reached 3 attempts, so a growth trend cannot be established. Median retry gap ${analysis.medianFirstGapMs} ms.`,
        evidence: { gapsMs: analysis.gapsMs.slice(0, 40) },
      });
    } else {
      const growing = analysis.growingSeries >= analysis.flatSeries;
      checks.push({
        name: "exponential backoff",
        verdict: growing ? "PASS" : "FAIL",
        detail: growing
          ? `Retry gaps widen across attempts (${analysis.growingSeries} growing vs ${analysis.flatSeries} flat series; median first gap ${analysis.medianFirstGapMs} ms → median last gap ${analysis.medianLastGapMs} ms). Backoff is doing its job.`
          : `Retry gaps stay flat (${analysis.flatSeries} flat vs ${analysis.growingSeries} growing; median ${analysis.medianFirstGapMs} ms → ${analysis.medianLastGapMs} ms). Fixed-interval retries against a struggling peer are a self-inflicted DDoS — the gap must grow.`,
        evidence: {
          growingSeries: analysis.growingSeries,
          flatSeries: analysis.flatSeries,
          medianFirstGapMs: analysis.medianFirstGapMs,
          medianLastGapMs: analysis.medianLastGapMs,
          gapsMs: analysis.gapsMs.slice(0, 40),
        },
      });
    }

    // A 29s hold must not pin a worker for the whole window. If the engine has a
    // request timeout below the hold, delayed calls abandon early and the peer
    // sees the retry sooner than 29s.
    const delayAttempts = engineAttempts.filter((a) => a.mode === "delay").length;
    checks.push({
      name: "slow-peer socket handling",
      verdict: healthFailures === 0 ? "PASS" : "FAIL",
      detail:
        healthFailures === 0
          ? `The engine stayed responsive while ${delayAttempts} calls were held open for ${(ctx.cfg.chaosDelayMs / 1000).toFixed(0)}s each — ${healthLatencies.length} health probes, all 200.`
          : `/health failed ${healthFailures} times while the peer was holding sockets open — slow peers are consuming the engine's capacity.`,
      evidence: {
        heldCalls: delayAttempts,
        holdMs: ctx.cfg.chaosDelayMs,
        healthProbes: healthLatencies.length,
        healthFailures,
      },
    });

    // Terminal-state check: an execution still "running" long after a 29s peer
    // hold means the outbound call has no timeout and the cursor is stranded.
    const execs = await ctx.api.listExecutions(caller._id);
    const recent = execs.filter((e) => (e.createdAt ? Date.parse(e.createdAt) >= driveStart - 1000 : true));
    const statusMix: Record<string, number> = {};
    for (const e of recent) statusMix[e.status ?? "unknown"] = (statusMix[e.status ?? "unknown"] ?? 0) + 1;
    const stranded = (statusMix.running ?? 0) + (statusMix.pending ?? 0);
    checks.push({
      name: "executions reach a terminal state",
      verdict: recent.length === 0 ? "WARN" : stranded === 0 ? "PASS" : "FAIL",
      detail:
        recent.length === 0
          ? "No executions were visible for the flaky caller, so terminal-state behaviour could not be checked."
          : stranded === 0
            ? `All ${recent.length} sampled executions settled (${JSON.stringify(statusMix)}). Failure against a hostile peer is recorded, not hung.`
            : `${stranded} executions are still running/pending ${(ctx.cfg.flakyObserveSec).toFixed(0)}s after the drive finished (${JSON.stringify(statusMix)}). Outbound calls to a dead peer are stranding cursors.`,
      evidence: { statusMix, sampled: recent.length },
    });

    const health = await ctx.api.health();
    checks.push({
      name: "post-chaos recovery",
      verdict: health.status === 200 ? "PASS" : "FAIL",
      detail: `/health returned ${health.status ?? health.errorClass} in ${fmtMs(health.latencyMs)} after the chaos window.`,
    });

    notes.push(
      `peer mode mix during engine phase: ${JSON.stringify(
        engineAttempts.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.mode]: (acc[a.mode] ?? 0) + 1 }), {}),
      )}`,
    );

    return finishReport({
      module: "flaky",
      title: "Mock Chaos Webhook Receiver",
      startedAt,
      startedAtMs,
      checks,
      metrics,
      notes,
      resources: { baseline: null, peak: ctx.sampler.peakBetween(driveStart, Date.now()), final: await ctx.sampler.snapshot() },
      data: {
        chaosUrl: chaos.url,
        weights: ctx.cfg.chaosWeights,
        delayMs: ctx.cfg.chaosDelayMs,
        peerCalls: engineAttempts.length,
        retryAnalysis: {
          correlations: analysis.correlations,
          retried: analysis.retried,
          maxAttempts: analysis.maxAttempts,
          medianFirstGapMs: analysis.medianFirstGapMs,
          medianLastGapMs: analysis.medianLastGapMs,
          gapsMs: analysis.gapsMs.slice(0, 100),
        },
        peerStats: { byMode: stats.byMode, byStatus: stats.byStatus, openSocketsPeak: stats.openSocketsPeak },
        healthProbes: { count: healthLatencies.length, failures: healthFailures },
      },
    });
  } finally {
    await chaos.stop();
    log.info(c.dim("  chaos receiver stopped"));
  }
}
