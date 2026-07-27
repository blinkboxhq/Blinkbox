import type { ChaosConfig } from "./config.js";
import type { BlinkboxApi } from "./blinkbox-api.js";
import type { Dashboard } from "./dashboard.js";
import type { ResourceSampler } from "./resources.js";
import type { Check, ModuleReport, Verdict } from "./types.js";

export interface ModuleCtx {
  cfg: ChaosConfig;
  api: BlinkboxApi;
  sampler: ResourceSampler;
  dash: Dashboard;
  /** Automations created by a module are tracked here so teardown can remove them. */
  trackAutomation: (id: string) => void;
}

export function worstVerdict(checks: Check[]): Verdict {
  if (checks.some((c) => c.verdict === "FAIL")) return "FAIL";
  if (checks.some((c) => c.verdict === "WARN")) return "WARN";
  if (checks.length && checks.every((c) => c.verdict === "SKIPPED")) return "SKIPPED";
  return "PASS";
}

export function finishReport(
  partial: Omit<ModuleReport, "verdict" | "durationMs"> & { startedAtMs: number },
): ModuleReport {
  const { startedAtMs, ...rest } = partial;
  return { ...rest, verdict: worstVerdict(rest.checks), durationMs: Date.now() - startedAtMs };
}
