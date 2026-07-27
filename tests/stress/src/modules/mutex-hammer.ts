/**
 * Module 4 — State Mutex & Race Condition Hammer.
 *
 * Three races, all released from a barrier so the requests genuinely collide
 * rather than arriving in a staircase:
 *
 *   A. Read-modify-write on one automation document. N workers each GET the
 *      record, append their own token, and PUT it back. Every token that is
 *      missing at the end is a lost update.
 *   B. N identical `x-idempotency-key` requests to POST /api/automation/:id/execute.
 *      Exactly one execution may exist afterwards; the rest must be reuses.
 *   C. N identical `Idempotency-Key` requests to POST /api/execution/start/:id,
 *      which is a check-then-create — the classic TOCTOU window.
 *
 * B and C are separate implementations of the same guarantee in this codebase,
 * which is precisely why both are hammered.
 */
import { log, sleep } from "../logger.js";
import { registry } from "../metrics.js";
import { json, makeAgent, request } from "../http-client.js";
import { barrierFanOut } from "../runner.js";
import { sinkWorkflow } from "../blinkbox-api.js";
import { finishReport, type ModuleCtx } from "../context.js";
import type { Check, MetricsSnapshot, ModuleReport } from "../types.js";

interface RoundResult {
  round: number;
  workers: number;
  distinctIds: string[];
  created: number;
  reused: number;
  errors: number;
  conflicts: number;
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

export async function runMutexHammer(ctx: ModuleCtx): Promise<ModuleReport> {
  const startedAtMs = Date.now();
  const startedAt = new Date().toISOString();
  const checks: Check[] = [];
  const notes: string[] = [];
  const metrics: MetricsSnapshot[] = [];
  const workers = ctx.cfg.mutexWorkers;

  log.section("Module 4 — State Mutex & Race Condition Hammer");
  ctx.dash.setPhase("mutex · provisioning");

  const name = `chaos-mutex-${Date.now()}`;
  const automation = await ctx.api.createAutomation(sinkWorkflow(name));
  ctx.trackAutomation(automation._id);
  if (!(await ctx.api.activate(automation._id))) {
    checks.push({ name: "provisioning", verdict: "FAIL", detail: "Could not activate the race-target automation." });
    return finishReport({ module: "mutex", title: "State Mutex & Race Condition Hammer", startedAt, startedAtMs, checks, notes });
  }

  // Give the hammer its own socket pool so `workers` means concurrent sockets.
  const agent = makeAgent(Math.max(workers, ctx.cfg.maxSockets));

  // ── A. Lost-update hammer on shared document state ───────────────────────
  ctx.dash.setPhase(`mutex · read-modify-write ×${workers}`);
  const rmwRec = registry.create("mutex:read-modify-write");
  const token = (i: number) => `#${i}`;
  const rmwRounds: Array<{ round: number; expected: number; present: number; lost: number }> = [];

  for (let round = 0; round < ctx.cfg.mutexRounds; round++) {
    await ctx.api.updateAutomation(automation._id, { ...sinkWorkflow(name), description: "seed" });
    await sleep(150);

    await barrierFanOut(workers, async (i) => {
      const read = await request({
        method: "GET",
        url: `${ctx.api.base}/api/automation/${automation._id}`,
        headers: authOf(ctx),
        agent,
        timeoutMs: ctx.cfg.requestTimeoutMs,
      });
      const current = (json(read)?.automation?.description as string) ?? "";
      return request({
        method: "PUT",
        url: `${ctx.api.base}/api/automation/${automation._id}`,
        headers: authOf(ctx),
        body: JSON.stringify({ ...sinkWorkflow(name), description: `${current}${token(i)}` }),
        agent,
        timeoutMs: ctx.cfg.requestTimeoutMs,
      });
    });

    await sleep(250);
    const after = await ctx.api.getAutomation(automation._id);
    const desc = after?.description ?? "";
    let present = 0;
    for (let i = 0; i < workers; i++) if (desc.includes(token(i))) present++;
    rmwRounds.push({ round, expected: workers, present, lost: workers - present });
  }

  rmwRec.seal();
  metrics.push(rmwRec.snapshot());

  const totalExpected = rmwRounds.reduce((a, r) => a + r.expected, 0);
  const totalPresent = rmwRounds.reduce((a, r) => a + r.present, 0);
  const lost = totalExpected - totalPresent;
  const lossPct = totalExpected ? (lost / totalExpected) * 100 : 0;

  log.info(`  read-modify-write: ${totalPresent}/${totalExpected} appends survived (${lossPct.toFixed(1)}% lost)`);

  checks.push({
    name: "lost update under concurrent mutation",
    verdict: lost === 0 ? "PASS" : "FAIL",
    detail:
      lost === 0
        ? `All ${totalExpected} concurrent appends across ${ctx.cfg.mutexRounds} rounds survived — writes to shared automation state are serialised.`
        : `${lost} of ${totalExpected} concurrent appends were lost (${lossPct.toFixed(1)}%). PUT /api/automation/:id replaces the whole document with no optimistic concurrency, so ${workers} simultaneous read-modify-write cycles collapse to last-write-wins. Fix: version/If-Match on the update route, or a targeted \$set/\$push for field-level edits.`,
    evidence: { rounds: rmwRounds, workers },
  });

  // ── B & C. Idempotency-key races ─────────────────────────────────────────
  const runIdempotencyRace = async (
    label: string,
    path: (id: string) => string,
    headerName: string,
  ): Promise<RoundResult[]> => {
    const rec = registry.create(`mutex:${label}`);
    const rounds: RoundResult[] = [];

    for (let round = 0; round < ctx.cfg.mutexRounds; round++) {
      ctx.dash.setPhase(`mutex · ${label} round ${round + 1}/${ctx.cfg.mutexRounds} ×${workers}`);
      const key = `chaos-${label}-${Date.now()}-${round}`;
      const results = await barrierFanOut(workers, async (i) =>
        request({
          method: "POST",
          url: `${ctx.api.base}${path(automation._id)}`,
          headers: { ...authOf(ctx), [headerName]: key },
          body: JSON.stringify({ chaos: true, worker: i, corr: key }),
          agent,
          timeoutMs: ctx.cfg.requestTimeoutMs,
        }),
      );

      const ids: string[] = [];
      let created = 0;
      let reused = 0;
      let errors = 0;
      let conflicts = 0;

      for (const r of results) {
        const b = json(r);
        const id = b?.execution?._id ?? b?.executionId ?? null;
        if (typeof id === "string") ids.push(id);
        if (r.status === 409) conflicts++;
        else if (!r.ok) errors++;
        else if (b?.reused === true) reused++;
        else created++;
      }

      rounds.push({ round, workers, distinctIds: uniq(ids), created, reused, errors, conflicts });
      await sleep(400);
    }

    rec.seal();
    metrics.push(rec.snapshot());
    return rounds;
  };

  const triggerRounds = await runIdempotencyRace(
    "trigger-idempotency",
    (id) => `/api/automation/${id}/execute`,
    "x-idempotency-key",
  );
  const startRounds = await runIdempotencyRace(
    "start-idempotency",
    (id) => `/api/execution/start/${id}`,
    "Idempotency-Key",
  );

  const gradeIdempotency = (label: string, endpoint: string, rounds: RoundResult[], note: string): Check => {
    const worst = rounds.reduce((a, r) => Math.max(a, r.distinctIds.length), 0);
    const dupRounds = rounds.filter((r) => r.distinctIds.length > 1);
    const noIds = rounds.every((r) => r.distinctIds.length === 0);

    if (noIds) {
      return {
        name: label,
        verdict: "WARN",
        detail: `${endpoint} returned no execution ids under the race (likely all requests errored), so the idempotency guarantee could not be evaluated.`,
        evidence: { rounds },
      };
    }
    return {
      name: label,
      verdict: dupRounds.length === 0 ? "PASS" : "FAIL",
      detail:
        dupRounds.length === 0
          ? `${workers} simultaneous requests to ${endpoint} with one key produced exactly one execution in every round. ${note}`
          : `${dupRounds.length} of ${rounds.length} rounds produced multiple executions for a single idempotency key (worst round: ${worst} distinct executions from ${workers} simultaneous requests). ${note}`,
      evidence: {
        rounds: rounds.map((r) => ({
          round: r.round,
          distinct: r.distinctIds.length,
          created: r.created,
          reused: r.reused,
          conflicts: r.conflicts,
          errors: r.errors,
        })),
      },
    };
  };

  checks.push(
    gradeIdempotency(
      "idempotency under race — POST /automation/:id/execute",
      "POST /api/automation/:id/execute",
      triggerRounds,
      "This path guards the race with a unique-index insert plus a duplicate-key (11000) reuse branch, which is the correct shape.",
    ),
  );
  checks.push(
    gradeIdempotency(
      "idempotency under race — POST /execution/start/:id",
      "POST /api/execution/start/:automationId",
      startRounds,
      "This path is a findOne-then-create check: the window between the lookup and the insert is only closed by a unique index on (automationId, idempotencyKey, workspaceId). Without it, simultaneous callers each see 'no existing execution' and each create one.",
    ),
  );

  // Duplicate work is the observable consequence a user would actually feel:
  // one logical trigger, the same node executed twice.
  const execs = await ctx.api.listExecutions(automation._id);
  const byKey = new Map<string, number>();
  for (const e of execs) {
    const k = (e as { idempotencyKey?: string }).idempotencyKey;
    if (k) byKey.set(k, (byKey.get(k) ?? 0) + 1);
  }
  const duplicatedKeys = [...byKey.entries()].filter(([, n]) => n > 1);
  checks.push({
    name: "duplicate work materialised",
    verdict: byKey.size === 0 ? "SKIPPED" : duplicatedKeys.length === 0 ? "PASS" : "FAIL",
    detail:
      byKey.size === 0
        ? "Executions did not expose an idempotencyKey field, so duplicate persisted work could not be confirmed independently of the API responses."
        : duplicatedKeys.length === 0
          ? `Every idempotency key maps to exactly one persisted execution across ${byKey.size} keys — no duplicate work reached the engine.`
          : `${duplicatedKeys.length} idempotency keys map to more than one persisted execution (${duplicatedKeys
              .map(([k, n]) => `${k}×${n}`)
              .join(", ")}). The same logical trigger ran the workflow more than once.`,
    evidence: { keysObserved: byKey.size, duplicatedKeys: duplicatedKeys.map(([k, n]) => ({ key: k, executions: n })) },
  });

  const health = await ctx.api.health();
  checks.push({
    name: "post-hammer health",
    verdict: health.status === 200 ? "PASS" : "FAIL",
    detail: `/health returned ${health.status ?? health.errorClass} after ${workers} × ${ctx.cfg.mutexRounds * 3} concurrent mutations.`,
  });

  agent.destroy();
  notes.push(`barrier fan-out: ${workers} workers released in a single tick per round`);

  return finishReport({
    module: "mutex",
    title: "State Mutex & Race Condition Hammer",
    startedAt,
    startedAtMs,
    checks,
    metrics,
    notes,
    resources: { baseline: null, peak: ctx.sampler.peakBetween(startedAtMs, Date.now()), final: await ctx.sampler.snapshot() },
    data: {
      automationId: automation._id,
      workers,
      rounds: ctx.cfg.mutexRounds,
      readModifyWrite: { expected: totalExpected, present: totalPresent, lost, lossPct: Number(lossPct.toFixed(2)), rmwRounds },
      triggerIdempotency: triggerRounds.map((r) => ({ round: r.round, distinct: r.distinctIds.length })),
      startIdempotency: startRounds.map((r) => ({ round: r.round, distinct: r.distinctIds.length })),
    },
  });
}

function authOf(ctx: ModuleCtx): Record<string, string> {
  return {
    "content-type": "application/json",
    accept: "application/json",
    ...(ctx.cfg.token ? { authorization: `Bearer ${ctx.cfg.token}` } : {}),
    ...ctx.cfg.extraHeaders,
  };
}
