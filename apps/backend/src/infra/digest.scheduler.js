/**
 * Weekly usage digest.
 *
 * Wakes hourly, does nothing 167 hours out of 168, and on the send hour takes
 * a Redis lock keyed to the ISO week. The lock is never released — it is the
 * "this week is done" record, so a restart, a second dyno, or a redeploy
 * mid-send cannot mail the same digest twice.
 *
 * Workspaces with no runs are skipped. A digest that says "you did nothing"
 * is the fastest way to get every later one marked as spam.
 */

import Execution from "../models/execution.model.js";
import WorkspaceUsage from "../models/workspaceUsage.model.js";
import User from "../models/user.model.js";
import { acquireLock } from "./redis.lock.js";
import { sendWeeklyDigestEmail } from "./email.service.js";

const TICK_MS = 60 * 60 * 1000;
const SEND_DAY = Number(process.env.DIGEST_SEND_DAY ?? 1); // 0 = Sunday
const SEND_HOUR = Number(process.env.DIGEST_SEND_HOUR ?? 14); // UTC
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LOCK_TTL_S = 8 * 24 * 60 * 60;

function isoWeekKey(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function hasTransport() {
  return Boolean(
    process.env.RESEND_API_KEY ||
      (process.env.ALERT_EMAIL_FROM && process.env.ALERT_EMAIL_PASS),
  );
}

/** Runs and outcomes per workspace for the window, plus their busiest workflows. */
async function collect(periodStart, periodEnd) {
  const match = { createdAt: { $gte: periodStart, $lt: periodEnd } };

  const [totals, perWorkflow] = await Promise.all([
    Execution.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$workspaceId",
          runs: { $sum: 1 },
          succeeded: { $sum: { $cond: [{ $eq: ["$status", "executed"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        },
      },
    ]),
    Execution.aggregate([
      { $match: match },
      {
        $group: {
          _id: { workspaceId: "$workspaceId", automationId: "$automationId" },
          name: { $first: "$name" },
          runs: { $sum: 1 },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        },
      },
      { $sort: { runs: -1 } },
    ]),
  ]);

  const top = new Map();
  for (const row of perWorkflow) {
    const list = top.get(row._id.workspaceId) || [];
    if (list.length < 5) {
      list.push({ name: row.name || "Untitled automation", runs: row.runs, failed: row.failed });
      top.set(row._id.workspaceId, list);
    }
  }

  return { totals, top };
}

async function sendDigests(now) {
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - WEEK_MS);
  const { totals, top } = await collect(periodStart, periodEnd);

  let sent = 0;
  for (const row of totals) {
    const workspaceId = row._id;
    if (!workspaceId || !row.runs) continue;

    try {
      const user = await User.findById(workspaceId);
      if (!user?.email) continue;

      // Read-only: getOrCreate would roll the billing cycle as a side effect,
      // and a digest must never move someone's renewal date.
      const usage = await WorkspaceUsage.findOne({ workspaceId });
      const monthlyLimit = usage?.monthlyLimit ?? 0;
      const purchased = usage?.purchasedCredits ?? 0;
      const creditsUsed = usage?.creditsUsed ?? 0;
      const pool = monthlyLimit + purchased;

      await sendWeeklyDigestEmail(user, {
        periodStart,
        periodEnd,
        runs: row.runs,
        succeeded: row.succeeded,
        failed: row.failed,
        creditsUsed,
        remaining: Math.max(0, monthlyLimit - creditsUsed) + purchased,
        percentUsed: pool ? Math.min(100, Math.round((creditsUsed / pool) * 100)) : 0,
        topWorkflows: top.get(workspaceId) || [],
        plan: usage?.plan || "free",
      });
      sent += 1;
    } catch (err) {
      console.error(`[Digest] ${workspaceId} failed:`, err.message);
    }
  }

  console.log(`[Digest] weekly digest sent to ${sent} workspace(s)`);
}

async function tick() {
  const now = new Date();
  if (now.getUTCDay() !== SEND_DAY || now.getUTCHours() !== SEND_HOUR) return;

  try {
    const key = `digest:weekly:${isoWeekKey(now)}`;
    if (!(await acquireLock(key, "digest", LOCK_TTL_S))) return;
    await sendDigests(now);
  } catch (err) {
    console.error("[Digest] run failed:", err.message);
  }
}

export function startWeeklyDigest() {
  if (process.env.WEEKLY_DIGEST === "off") {
    console.log("[Digest] disabled via WEEKLY_DIGEST=off");
    return;
  }
  if (!hasTransport()) {
    console.warn("[Digest] no email transport configured — weekly digest disabled");
    return;
  }

  const timer = setInterval(() => {
    tick().catch((err) => console.error("[Digest] tick failed:", err.message));
  }, TICK_MS);
  timer.unref?.();

  console.log(`[Digest] weekly digest armed — day ${SEND_DAY} @ ${SEND_HOUR}:00 UTC`);
}

export default startWeeklyDigest;
