/**
 * Turns module reports into (a) a terminal verdict table and (b) durable
 * artifacts. The JSON file is the machine record — every check keeps its
 * evidence object so a failure can be re-litigated without re-running the
 * suite. The Markdown file is what gets pasted into an incident or a PR.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { c, fmtBytes, fmtMs, log, verdictColor } from "./logger.js";
import { registry } from "./metrics.js";
import { environmentInfo } from "./config.js";
import { worstVerdict } from "./context.js";
import type { Check, ModuleReport, RunReport, Verdict } from "./types.js";

export const SUITE_VERSION = "1.0.0";

const VERDICT_MARK: Record<Verdict, string> = {
  PASS: "✅",
  FAIL: "❌",
  WARN: "⚠️",
  SKIPPED: "⏭️",
  INFO: "ℹ️",
};

export function buildRunReport(opts: {
  target: string;
  seed: number;
  targetPid: number | null;
  startedAt: string;
  startedAtMs: number;
  modules: ModuleReport[];
}): RunReport {
  const allChecks = opts.modules.flatMap((m) => m.checks);
  const totals = registry.totals();
  const count = (v: Verdict) => allChecks.filter((ch) => ch.verdict === v).length;

  return {
    suite: "chaos-cascade",
    version: SUITE_VERSION,
    target: opts.target,
    startedAt: opts.startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - opts.startedAtMs,
    seed: opts.seed,
    verdict: worstVerdict(opts.modules.map((m) => ({ name: m.module, verdict: m.verdict, detail: "" }) as Check)),
    environment: { ...environmentInfo(), targetPid: opts.targetPid },
    modules: opts.modules,
    summary: {
      totalRequests: totals.requests,
      totalFailures: totals.failures,
      passed: count("PASS"),
      failed: count("FAIL"),
      warned: count("WARN"),
      skipped: count("SKIPPED"),
    },
  };
}

export function printSummary(report: RunReport): void {
  log.section("Chaos Cascade — verdict");

  for (const m of report.modules) {
    log.raw(`\n${c.bold(m.title)}  ${verdictColor(m.verdict)}  ${c.dim(`${(m.durationMs / 1000).toFixed(1)}s`)}`);
    for (const ch of m.checks) {
      log.raw(`  ${verdictColor(ch.verdict.padEnd(7))} ${ch.name}`);
      if (ch.verdict === "FAIL" || ch.verdict === "WARN") log.raw(`          ${c.dim(wrap(ch.detail, 88, 10))}`);
    }
  }

  const s = report.summary;
  log.raw(
    `\n${c.dim("checks")}   ${c.green(`${s.passed} pass`)} · ${s.failed ? c.red(`${s.failed} fail`) : `${s.failed} fail`} · ` +
      `${s.warned ? c.yellow(`${s.warned} warn`) : `${s.warned} warn`} · ${c.dim(`${s.skipped} skipped`)}`,
  );
  log.raw(
    `${c.dim("traffic")}  ${s.totalRequests} requests, ${s.totalFailures} failed ` +
      `${c.dim(`(${s.totalRequests ? ((s.totalFailures / s.totalRequests) * 100).toFixed(1) : "0.0"}% error rate)`)}`,
  );
  log.raw(`${c.dim("elapsed")}  ${(report.durationMs / 1000).toFixed(1)}s`);
  log.raw(`${c.dim("verdict")}  ${c.bold(verdictColor(report.verdict))}\n`);
}

export async function writeReports(report: RunReport, dir: string): Promise<{ jsonPath: string; mdPath: string }> {
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  const outDir = path.resolve(dir);
  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, `chaos-cascade-${stamp}.json`);
  const mdPath = path.join(outDir, `chaos-cascade-${stamp}.md`);
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(mdPath, toMarkdown(report), "utf8");
  await fs.writeFile(path.join(outDir, "latest.json"), JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(path.join(outDir, "latest.md"), toMarkdown(report), "utf8");
  return { jsonPath, mdPath };
}

export function toMarkdown(report: RunReport): string {
  const L: string[] = [];
  const s = report.summary;

  L.push(`# Chaos Cascade — Blinkbox reliability report`);
  L.push("");
  L.push(`**Verdict: ${VERDICT_MARK[report.verdict]} ${report.verdict}**`);
  L.push("");
  L.push(`| | |`);
  L.push(`|---|---|`);
  L.push(`| Target | \`${report.target}\` |`);
  L.push(`| Started | ${report.startedAt} |`);
  L.push(`| Duration | ${(report.durationMs / 1000).toFixed(1)}s |`);
  L.push(`| Seed | ${report.seed} |`);
  L.push(`| Requests | ${s.totalRequests} (${s.totalFailures} failed) |`);
  L.push(`| Checks | ${s.passed} pass · ${s.failed} fail · ${s.warned} warn · ${s.skipped} skipped |`);
  L.push(
    `| Host | node ${report.environment.node}, ${report.environment.platform}/${report.environment.arch}, ` +
      `${report.environment.cpus} cpus, ${report.environment.totalMemMb} MB |`,
  );
  L.push(`| Target PID | ${report.environment.targetPid ?? "not sampled"} |`);
  L.push("");

  L.push(`## Module results`);
  L.push("");
  L.push(`| Module | Verdict | Duration | Checks |`);
  L.push(`|---|---|---|---|`);
  for (const m of report.modules) {
    const fails = m.checks.filter((ch) => ch.verdict === "FAIL").length;
    const warns = m.checks.filter((ch) => ch.verdict === "WARN").length;
    L.push(
      `| ${m.title} | ${VERDICT_MARK[m.verdict]} ${m.verdict} | ${(m.durationMs / 1000).toFixed(1)}s | ` +
        `${m.checks.length} (${fails} fail, ${warns} warn) |`,
    );
  }
  L.push("");

  const failing = report.modules.flatMap((m) =>
    m.checks.filter((ch) => ch.verdict === "FAIL").map((ch) => ({ module: m.title, ch })),
  );
  if (failing.length) {
    L.push(`## What is broken`);
    L.push("");
    for (const { module, ch } of failing) {
      L.push(`### ❌ ${ch.name}`);
      L.push(`*${module}*`);
      L.push("");
      L.push(ch.detail);
      if (ch.evidence) {
        L.push("");
        L.push("```json");
        L.push(JSON.stringify(ch.evidence, null, 2));
        L.push("```");
      }
      L.push("");
    }
  }

  for (const m of report.modules) {
    L.push(`## ${m.title}`);
    L.push("");
    L.push(`**${VERDICT_MARK[m.verdict]} ${m.verdict}** — ${(m.durationMs / 1000).toFixed(1)}s`);
    L.push("");
    for (const ch of m.checks) {
      L.push(`- ${VERDICT_MARK[ch.verdict]} **${ch.name}** — ${ch.detail}`);
    }
    L.push("");

    if (m.metrics?.length) {
      L.push(`| Phase | Requests | OK | Failed | RPS (peak) | avg | p95 | p99 | Sent |`);
      L.push(`|---|---|---|---|---|---|---|---|---|`);
      for (const x of m.metrics) {
        L.push(
          `| ${x.label} | ${x.total} | ${x.succeeded} | ${x.failed} | ${x.rps.toFixed(0)} (${x.peakRps}) | ` +
            `${fmtMs(x.latency.avgMs)} | ${fmtMs(x.latency.p95Ms)} | ${fmtMs(x.latency.p99Ms)} | ${fmtBytes(x.bytesSent)} |`,
        );
      }
      L.push("");

      const classTotals = m.metrics.reduce<Record<string, number>>((acc, x) => {
        for (const [k, v] of Object.entries(x.byClass)) if (v > 0) acc[k] = (acc[k] ?? 0) + v;
        return acc;
      }, {});
      if (Object.keys(classTotals).length) {
        L.push(
          `Outcome mix: ${Object.entries(classTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `\`${k}\`×${v}`)
            .join(", ")}`,
        );
        L.push("");
      }
    }

    if (m.resources?.peak) {
      const p = m.resources.peak;
      L.push(
        `Peak footprint — target RSS ${p.targetRssMb ? `${p.targetRssMb.toFixed(0)} MB` : "n/a"}, ` +
          `target CPU ${p.targetCpuPct != null ? `${p.targetCpuPct.toFixed(0)}%` : "n/a"}, ` +
          `harness heap ${p.harnessHeapUsedMb.toFixed(0)} MB, event-loop p99 ${fmtMs(p.eventLoopLagP99Ms)}.`,
      );
      L.push("");
    }

    if (m.notes.length) {
      L.push(`<details><summary>Notes</summary>`);
      L.push("");
      for (const n of m.notes) L.push(`- ${n}`);
      L.push("");
      L.push(`</details>`);
      L.push("");
    }

    if (m.data) {
      L.push(`<details><summary>Raw data</summary>`);
      L.push("");
      L.push("```json");
      L.push(JSON.stringify(m.data, null, 2));
      L.push("```");
      L.push("");
      L.push(`</details>`);
      L.push("");
    }
  }

  L.push(`---`);
  L.push("");
  L.push(
    `Generated by chaos-cascade v${SUITE_VERSION}. Re-run this exact fault sequence with \`--seed=${report.seed}\`.`,
  );
  L.push("");
  return L.join("\n");
}

function wrap(text: string, width: number, indent: number): string {
  const pad = " ".repeat(indent);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 > width) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines.join(`\n${pad}`);
}
