#!/usr/bin/env node
/**
 * chaos-cascade — Blinkbox reliability stress suite.
 *
 *   npm run chaos -- --email=you@example.com --password=...
 *   npm run chaos -- --modules=mutex --mutex-workers=200
 *   npm run chaos -- --help
 *
 * Exit code is 0 when no check FAILed and 1 otherwise, so this can gate CI.
 * See README.md for prerequisites (the backend needs ALLOW_LOCAL_REQUESTS=true
 * for the two modules that make the engine call back into localhost).
 */
import { HELP, isLoopback, loadConfig, type ChaosConfig, type ModuleId } from "./src/config.js";
import { c, log, setQuiet } from "./src/logger.js";
import { makeAgent } from "./src/http-client.js";
import { BlinkboxApi, sinkWorkflow } from "./src/blinkbox-api.js";
import { detectListenerPid, ResourceSampler } from "./src/resources.js";
import { Dashboard } from "./src/dashboard.js";
import { buildRunReport, printSummary, SUITE_VERSION, writeReports } from "./src/reporter.js";
import type { ModuleCtx } from "./src/context.js";
import type { ModuleReport } from "./src/types.js";

import { runPayloadEscalation } from "./src/modules/payload-escalation.js";
import { runRecursionStorm } from "./src/modules/recursion-storm.js";
import { runFlakyWebhook } from "./src/modules/flaky-webhook.js";
import { runMutexHammer } from "./src/modules/mutex-hammer.js";

type ModuleFn = (ctx: ModuleCtx) => Promise<ModuleReport>;

const MODULES: Record<ModuleId, { title: string; run: ModuleFn }> = {
  payload: { title: "Dynamic Payload Escalation", run: runPayloadEscalation },
  recursion: { title: "Recursive & Circular Loop Trigger", run: runRecursionStorm },
  flaky: { title: "Chaos Webhook Receiver", run: runFlakyWebhook },
  mutex: { title: "State Mutex & Race Condition Hammer", run: runMutexHammer },
};

const BANNER = `
  ${c.magenta("▄▄▄")}  ${c.bold("CHAOS CASCADE")} ${c.dim(`v${SUITE_VERSION}`)}
  ${c.dim("concurrency · backpressure · recursion guards · state locking · fault recovery")}
`;

async function preflight(api: BlinkboxApi, cfg: ChaosConfig): Promise<void> {
  const h = await api.health(true);
  if (h.status !== 200) {
    throw new Error(
      `Target ${cfg.target} is not answering /health (${h.status ?? h.errorClass}: ${h.errorMessage ?? "no body"}). ` +
        `Start the backend with \`npm run dev\` in apps/backend, or pass --target=URL.`,
    );
  }
  log.ok(`target up: ${cfg.target} (/health in ${h.latencyMs.toFixed(0)}ms)`);

  if (cfg.token) {
    log.ok("using supplied token");
  } else if (cfg.email && cfg.password) {
    await api.login(cfg.email, cfg.password);
    log.ok(`authenticated as ${cfg.email}`);
  } else {
    throw new Error(
      "No credentials. Pass --token=JWT, or --email and --password (env: CHAOS_TOKEN / CHAOS_EMAIL / CHAOS_PASSWORD). " +
        "The suite creates and drives real automations, so it needs a real account — use a throwaway workspace.",
    );
  }

  // Cheapest possible proof that the token actually works for writes.
  const probe = await api.createAutomation(sinkWorkflow(`chaos-preflight-${Date.now()}`));
  await api.deleteAutomation(probe._id);
  log.ok("workspace writable (create + delete round-trip)");
}

async function main(): Promise<number> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(HELP);
    return 0;
  }

  const cfg = loadConfig();
  setQuiet(cfg.quiet);
  log.raw(BANNER);

  if (!isLoopback(cfg.target) && !cfg.allowRemote) {
    log.fail(
      `Refusing to stress a non-loopback target (${cfg.target}) without --allow-remote. ` +
        `This suite drives 1000+ rps, 50 MB bodies and deliberate infinite loops — never point it at production.`,
    );
    return 1;
  }
  if (!isLoopback(cfg.target)) {
    log.warn(`remote target enabled: ${cfg.target} — you asserted this host is safe to break`);
  }

  const agent = makeAgent(cfg.maxSockets);
  const api = new BlinkboxApi({
    base: cfg.target,
    token: cfg.token,
    headers: cfg.extraHeaders,
    agent,
    timeoutMs: cfg.requestTimeoutMs,
  });

  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  try {
    await preflight(api, cfg);
  } catch (err) {
    log.fail((err as Error).message);
    return 1;
  }

  let targetPid = cfg.targetPid;
  if (!targetPid && isLoopback(cfg.target)) {
    const port = Number(new URL(cfg.target).port || 80);
    targetPid = await detectListenerPid(port);
    if (targetPid) log.ok(`sampling target footprint from pid ${targetPid} (:${port})`);
    else log.warn(`could not auto-detect the backend pid on :${port} — memory checks will downgrade to WARN`);
  }

  const sampler = new ResourceSampler(targetPid, 1000);
  sampler.start();
  const dash = new Dashboard(sampler, cfg.live);

  const created: string[] = [];
  const ctx: ModuleCtx = { cfg, api, sampler, dash, trackAutomation: (id) => created.push(id) };

  if (cfg.dryRun) {
    log.ok(`dry run complete — would run: ${cfg.modules.join(", ")}`);
    sampler.stop();
    agent.destroy();
    return 0;
  }

  log.info(
    `plan: ${cfg.modules.join(" → ")} ${c.dim(
      `(concurrency ${cfg.concurrency}, sockets ${cfg.maxSockets}, seed ${cfg.seed})`,
    )}`,
  );

  dash.start();
  const reports: ModuleReport[] = [];

  for (const id of cfg.modules) {
    const mod = MODULES[id];
    try {
      reports.push(await mod.run(ctx));
    } catch (err) {
      // A module that throws is itself a finding — record it and keep going, so
      // one broken subsystem does not hide the state of the other four.
      dash.stop();
      log.fail(`${mod.title} crashed: ${(err as Error).message}`);
      reports.push({
        module: id,
        title: mod.title,
        verdict: "FAIL",
        startedAt: new Date().toISOString(),
        durationMs: 0,
        checks: [
          {
            name: "module executed",
            verdict: "FAIL",
            detail: `The module threw before it could grade anything: ${(err as Error).message}`,
            evidence: { stack: (err as Error).stack?.split("\n").slice(0, 6) },
          },
        ],
        notes: [],
      });
      dash.start();
    }
  }

  dash.stop();
  sampler.stop();

  if (created.length && !cfg.keepArtifacts) {
    log.step(`cleaning up ${created.length} automation(s)`);
    for (const id of created) await api.deleteAutomation(id);
  } else if (created.length) {
    log.warn(`keeping ${created.length} automation(s): ${created.join(", ")}`);
  }

  const report = buildRunReport({
    target: cfg.target,
    seed: cfg.seed,
    targetPid,
    startedAt,
    startedAtMs,
    modules: reports,
  });

  printSummary(report);

  try {
    const { jsonPath, mdPath } = await writeReports(report, cfg.reportDir);
    log.ok(`report written: ${mdPath}`);
    log.ok(`report written: ${jsonPath}`);
  } catch (err) {
    log.warn(`could not write reports to ${cfg.reportDir}: ${(err as Error).message}`);
  }

  agent.destroy();
  return report.verdict === "FAIL" ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
    // Deliberate: a leaked handle in the suite must not hang CI forever.
    setTimeout(() => process.exit(code), 2000).unref();
  })
  .catch((err) => {
    log.fail(`fatal: ${(err as Error).stack ?? String(err)}`);
    process.exit(1);
  });
