/**
 * Central config. Every knob is settable by CLI flag or env var; CLI wins.
 * Defaults are tuned for a local dev backend (apps/backend on :3000).
 */
import os from "node:os";

export const MODULE_IDS = ["payload", "recursion", "flaky", "mutex"] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export interface ChaosConfig {
  target: string;
  targetPid: number | null;
  allowRemote: boolean;
  email: string | null;
  password: string | null;
  token: string | null;
  extraHeaders: Record<string, string>;
  modules: ModuleId[];
  concurrency: number;
  maxSockets: number;
  requestTimeoutMs: number;
  seed: number;
  live: boolean;
  quiet: boolean;
  keepArtifacts: boolean;
  reportDir: string;
  dryRun: boolean;

  payloadLadderBytes: number[];
  payloadIterationsPerRung: number;
  payloadSettleMs: number;
  payloadLeakRetentionPct: number;

  recursionTargetRps: number;
  recursionDurationSec: number;
  recursionDecayWatchSec: number;
  recursionHealthBudgetMs: number;

  chaosPort: number;
  chaosHost: string;
  chaosDelayMs: number;
  chaosWeights: { delay: number; error: number; drop: number; ok: number };
  flakyRequests: number;
  flakyObserveSec: number;

  mutexWorkers: number;
  mutexRounds: number;
}

const num = (v: string | undefined, d: number) => {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
};

const bool = (v: string | undefined, d: boolean) =>
  v == null ? d : ["1", "true", "yes", "on"].includes(v.toLowerCase());

function parseArgv(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const eq = raw.indexOf("=");
    if (eq === -1) out[raw.slice(2)] = "true";
    else out[raw.slice(2, eq)] = raw.slice(eq + 1);
  }
  return out;
}

function parseHeaders(spec: string | undefined): Record<string, string> {
  if (!spec) return {};
  const out: Record<string, string> = {};
  for (const pair of spec.split(";")) {
    const i = pair.indexOf(":");
    if (i > 0) out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
  return out;
}

function parseLadder(spec: string | undefined): number[] | null {
  if (!spec) return null;
  const units: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  const out: number[] = [];
  for (const tok of spec.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    const m = /^([\d.]+)\s*(b|kb|mb|gb)?$/.exec(tok);
    if (!m) throw new Error(`Bad --payload-ladder entry: "${tok}"`);
    out.push(Math.round(Number(m[1]) * (units[m[2] ?? "b"] ?? 1)));
  }
  return out.length ? out : null;
}

export const HELP = `
chaos-cascade — Blinkbox reliability stress suite

Usage
  npm run chaos -- [flags]
  npm run chaos -- --modules=payload,mutex --concurrency=64

Target
  --target=URL              Base URL of the Blinkbox backend (default http://127.0.0.1:3000)
  --target-pid=N            PID of the backend process for RSS/CPU sampling (auto-detected on localhost)
  --allow-remote            Required to point the suite at a non-loopback host
  --email / --password      Credentials used to mint a JWT (env: CHAOS_EMAIL / CHAOS_PASSWORD)
  --token=JWT               Use an existing token instead of logging in (env: CHAOS_TOKEN)
  --header="K: V; K2: V2"   Extra headers on every authenticated request

Selection & scale
  --modules=a,b             Subset of: payload, recursion, flaky, mutex (default: all)
  --concurrency=N           Default virtual users per module (default 32)
  --max-sockets=N           Socket pool ceiling (default = concurrency * 2)
  --timeout=MS              Per-request timeout (default 35000, above the 29s chaos delay)
  --seed=N                  Deterministic fault seed (default 1337)
  --dry-run                 Plan only: connectivity + auth + graph creation, no load

Module knobs
  --payload-ladder=1kb,5mb  Payload rungs (default 1kb,64kb,512kb,1mb,2mb,5mb,25mb,50mb)
  --payload-iterations=N    Requests per rung (default 12)
  --payload-settle=MS       Settle window before the post-rung memory read (default 4000)
  --recursion-rps=N         Target open-loop rate for the loop storm (default 1200)
  --recursion-duration=SEC  Storm length (default 20)
  --chaos-port=N            Port for the bundled flaky server (default 4599)
  --chaos-delay=MS          Slow-mode hold time (default 29000)
  --flaky-requests=N        Executions driven through the flaky endpoint (default 60)
  --mutex-workers=N         Concurrent mutators in the race hammer (default 120)
  --mutex-rounds=N          Race rounds per sub-test (default 3)

Output
  --report-dir=PATH         Where to write the JSON + Markdown summary (default ./reports)
  --no-live                 Disable the live dashboard (auto-off when not a TTY)
  --quiet                   Only print the final summary
  --keep-artifacts          Do not delete the automations the suite creates
`;

export function loadConfig(argv = process.argv.slice(2)): ChaosConfig {
  const a = parseArgv(argv);
  const env = process.env;

  const target = (a.target ?? env.CHAOS_TARGET ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
  const concurrency = Math.max(1, num(a.concurrency ?? env.CHAOS_CONCURRENCY, 32));

  const modules = (a.modules ?? env.CHAOS_MODULES ?? MODULE_IDS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as ModuleId[];

  for (const m of modules) {
    if (!MODULE_IDS.includes(m)) throw new Error(`Unknown module "${m}". Valid: ${MODULE_IDS.join(", ")}`);
  }

  return {
    target,
    targetPid: a["target-pid"] ? num(a["target-pid"], 0) || null : null,
    allowRemote: bool(a["allow-remote"], bool(env.CHAOS_ALLOW_REMOTE, false)),
    email: a.email ?? env.CHAOS_EMAIL ?? null,
    password: a.password ?? env.CHAOS_PASSWORD ?? null,
    token: a.token ?? env.CHAOS_TOKEN ?? null,
    extraHeaders: parseHeaders(a.header ?? env.CHAOS_HEADERS),
    modules,
    concurrency,
    maxSockets: Math.max(concurrency, num(a["max-sockets"], concurrency * 2)),
    requestTimeoutMs: num(a.timeout, 35_000),
    seed: num(a.seed, 1337),
    live: !bool(a["no-live"], false) && Boolean(process.stdout.isTTY),
    quiet: bool(a.quiet, false),
    keepArtifacts: bool(a["keep-artifacts"], false),
    reportDir: a["report-dir"] ?? env.CHAOS_REPORT_DIR ?? "reports",
    dryRun: bool(a["dry-run"], false),

    payloadLadderBytes:
      parseLadder(a["payload-ladder"] ?? env.CHAOS_PAYLOAD_LADDER) ??
      [1024, 64 * 1024, 512 * 1024, 1024 ** 2, 2 * 1024 ** 2, 5 * 1024 ** 2, 25 * 1024 ** 2, 50 * 1024 ** 2],
    payloadIterationsPerRung: Math.max(1, num(a["payload-iterations"], 12)),
    payloadSettleMs: num(a["payload-settle"], 4000),
    payloadLeakRetentionPct: num(a["payload-leak-pct"], 25),

    recursionTargetRps: Math.max(1, num(a["recursion-rps"], 1200)),
    recursionDurationSec: Math.max(1, num(a["recursion-duration"], 20)),
    recursionDecayWatchSec: Math.max(0, num(a["recursion-decay-watch"], 20)),
    recursionHealthBudgetMs: num(a["recursion-health-budget"], 2000),

    chaosPort: num(a["chaos-port"], 4599),
    chaosHost: a["chaos-host"] ?? "127.0.0.1",
    chaosDelayMs: num(a["chaos-delay"], 29_000),
    chaosWeights: {
      delay: num(a["chaos-w-delay"], 30),
      error: num(a["chaos-w-error"], 30),
      drop: num(a["chaos-w-drop"], 10),
      ok: num(a["chaos-w-ok"], 30),
    },
    flakyRequests: Math.max(1, num(a["flaky-requests"], 60)),
    flakyObserveSec: Math.max(5, num(a["flaky-observe"], 90)),

    mutexWorkers: Math.max(2, num(a["mutex-workers"], 120)),
    mutexRounds: Math.max(1, num(a["mutex-rounds"], 3)),
  };
}

export function isLoopback(target: string): boolean {
  try {
    const h = new URL(target).hostname.toLowerCase();
    return h === "localhost" || h === "::1" || h === "[::1]" || /^127\./.test(h);
  } catch {
    return false;
  }
}

export const environmentInfo = () => ({
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  cpus: os.cpus().length,
  totalMemMb: Math.round(os.totalmem() / 1024 ** 2),
});
