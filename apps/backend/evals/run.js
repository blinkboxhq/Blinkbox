import "dotenv/config";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startFixtureServer } from "./fixtureServer.js";
import { vcTasks } from "./tasks/vc.tasks.js";
import { agentTasks, pickProvider } from "./tasks/agent.tasks.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VC_TIMEOUT_MS = 60_000;
const AGENT_TIMEOUT_MS = 120_000;

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
};

const runVC = flag("--agent") ? false : true;
const runAgent = flag("--vc") ? false : true;
const onlyTask = opt("task", null);
const threshold = Number(opt("threshold", "0.9"));

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function runTask(task, ctx, timeoutMs) {
  const started = Date.now();
  try {
    await withTimeout(task.run(ctx), timeoutMs, task.id);
    return { id: task.id, name: task.name, status: "pass", ms: Date.now() - started };
  } catch (err) {
    return { id: task.id, name: task.name, status: "fail", ms: Date.now() - started, error: err.message };
  }
}

const ICONS = { pass: "✓", fail: "✗", skip: "–" };
function printResult(r) {
  const icon = ICONS[r.status];
  const ms = r.ms != null ? `${r.ms}ms`.padStart(8) : "".padStart(8);
  console.log(`  ${icon} ${r.id.padEnd(22)} ${ms}  ${r.error ? `— ${r.error}` : ""}`);
}

async function main() {
  const results = { vc: [], agent: [] };
  let server = null;

  if (runVC) {
    console.log("\n━━ Tier 1 · Virtual Computer (no LLM) ━━");
    server = await startFixtureServer();
    const { dispatchAction, closeSession, pool } = await import("../src/nodes/VirtualComputer.js");

    const tasks = vcTasks.filter((t) => !onlyTask || t.id === onlyTask);
    for (const task of tasks) {
      const sid = `eval-${task.id}-${Date.now()}`;
      const vc = { do: (action, a) => dispatchAction(sid, "eval-harness", action, a) };
      const r = await runTask(task, { base: server.base, vc }, VC_TIMEOUT_MS);
      await closeSession(sid).catch(() => {});
      results.vc.push(r);
      printResult(r);
    }
    await pool.shutdown().catch(() => {});
    await server.close();
  }

  if (runAgent) {
    console.log("\n━━ Tier 2 · Agent end-to-end (LLM) ━━");
    const picked = pickProvider();
    const tasks = agentTasks.filter((t) => !onlyTask || t.id === onlyTask);
    if (!picked) {
      console.log("  – no provider API key in env (set OPENAI_API_KEY / ANTHROPIC_API_KEY / … or EVAL_PROVIDER) — tier skipped");
      for (const t of tasks) results.agent.push({ id: t.id, name: t.name, status: "skip" });
    } else {
      console.log(`  provider: ${picked.provider}${picked.model ? ` · model: ${picked.model}` : " · model: provider default"}`);
      const agentNode = (await import("../src/nodes/aiAgent.node.js")).default;
      for (const task of tasks) {
        const cfg = {
          provider: picked.provider,
          ...(picked.model ? { model: picked.model } : {}),
          temperature: 0,
          maxIterations: 5,
          ...task.config,
        };
        const ctx = { workspaceId: "eval-harness", executionId: `eval-${task.id}-${Date.now()}` };
        const r = await runTask(
          { ...task, run: async () => task.check(await agentNode.run(cfg, {}, ctx)) },
          {},
          AGENT_TIMEOUT_MS
        );
        results.agent.push(r);
        printResult(r);
      }
    }
  }

  const scored = [...results.vc, ...results.agent].filter((r) => r.status !== "skip");
  const passed = scored.filter((r) => r.status === "pass").length;
  const accuracy = scored.length ? passed / scored.length : 0;

  const tierLine = (label, rs) => {
    const run = rs.filter((r) => r.status !== "skip");
    if (!run.length) return `${label}: skipped`;
    return `${label}: ${run.filter((r) => r.status === "pass").length}/${run.length}`;
  };

  console.log("\n━━ Scoreboard ━━");
  console.log(`  ${tierLine("Tier 1 (VC)", results.vc)}`);
  console.log(`  ${tierLine("Tier 2 (Agent)", results.agent)}`);
  console.log(`  Accuracy: ${(accuracy * 100).toFixed(1)}%  (threshold ${(threshold * 100).toFixed(0)}%)`);

  await writeFile(
    path.join(HERE, "report.json"),
    JSON.stringify({ date: new Date().toISOString(), accuracy, threshold, results }, null, 2)
  );

  process.exit(scored.length && accuracy >= threshold ? 0 : 1);
}

main().catch((err) => {
  console.error("eval harness crashed:", err);
  process.exit(1);
});
