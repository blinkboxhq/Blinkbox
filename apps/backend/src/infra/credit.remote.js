/**
 * Remote credit client — the self-hosted half of metering.
 *
 * A self-hosted instance keeps its workflows, executions and credentials in its
 * own database, but it has no billing state of its own. Every metered node asks
 * the Blinkbox cloud whether the license owner can afford it, and reports the
 * spend afterwards. The workspace is never sent: the cloud derives it from the
 * license key, so a tampered container cannot bill someone else or itself.
 *
 * Metering degrades rather than cliffs. A successful check is stamped on the
 * instance's own database; if the cloud then goes unreachable the instance keeps
 * executing until that stamp ages past the grace window, and only then fails
 * closed. Spend during the window is queued and replayed on reconnect, so grace
 * is deferred billing, not free execution.
 *
 * A rejected license is not an outage — it fails closed immediately and burns
 * the stamp, so revoking a license stops the instance on its next node.
 */

import axios from "axios";
import { CLOUD_API_URL, SELF_HOST_LICENSE_KEY, GRACE_HOURS } from "../config/env.js";
import MeterState from "../models/meterState.model.js";

const BASE = `${CLOUD_API_URL.replace(/\/$/, "")}/api/self-host`;
const TIMEOUT_MS = 10000;
const STATE_ID = "meter";
const MAX_DEFERRED = 5000;
const FLUSH_BATCH = 100;

const client = axios.create({
  baseURL: BASE,
  timeout: TIMEOUT_MS,
  headers: { Authorization: `Bearer ${SELF_HOST_LICENSE_KEY}` },
});

// The cloud sends -1 where the local engine would return Infinity (free nodes).
function restore(n) {
  return n === -1 ? Infinity : n;
}

const costCache = new Map();

export async function getNodeCost(nodeType) {
  if (costCache.has(nodeType)) return costCache.get(nodeType);
  try {
    const { data } = await client.get(`/cost/${encodeURIComponent(nodeType)}`);
    costCache.set(nodeType, data.cost);
    return data.cost;
  } catch {
    return 1;
  }
}

// ── Grace state ──────────────────────────────────────────────────────────────

let inGrace = false;
let flushing = false;

// Only ever read on the failure path, so this costs nothing per node while the
// cloud is healthy — and re-reading means an out-of-band revoke is picked up
// rather than served from a stale mirror.
async function state() {
  return (await MeterState.findById(STATE_ID).lean()) || { lastGoodCheckAt: null, graceHours: null };
}

function windowHours(stored) {
  // Checked before coercing: Number(null) is 0, which would silently turn "the
  // cloud has not told us a window yet" into "no grace at all".
  if (stored?.graceHours === null || stored?.graceHours === undefined) return GRACE_HOURS;
  const n = Number(stored.graceHours);
  return Number.isFinite(n) && n >= 0 ? n : GRACE_HOURS;
}

async function onReachable(graceHours) {
  const now = new Date();
  const hours = Number.isFinite(Number(graceHours)) ? Math.min(Math.max(Number(graceHours), 0), 720) : null;
  const set = { lastGoodCheckAt: now };
  if (hours !== null) set.graceHours = hours;

  await MeterState.updateOne({ _id: STATE_ID }, { $set: set }, { upsert: true });

  if (inGrace) {
    inGrace = false;
    console.log("[Credits] cloud reachable again — metering back to live");
  }
  flushDeferred();
}

// A revoked or rejected key must not coast on a stamp the cloud already honoured.
async function onRejected() {
  await MeterState.updateOne({ _id: STATE_ID }, { $set: { lastGoodCheckAt: null } }, { upsert: true });
  inGrace = false;
}

// Only an outage earns grace. A 4xx is the cloud answering — that is a definite
// no, or a bug on our side, and either way it is not something to run through.
function isOutage(err) {
  const status = err.response?.status;
  return status === undefined || status >= 500;
}

// The grace rule itself, with no I/O and no clock of its own: given what this
// box last heard from the cloud and what just went wrong, may the node run?
// Split out from the persistence around it so the rule can be tested directly —
// it is the part that decides whether a paying customer keeps working.
export function graceVerdict({ lastGoodCheckAt, graceHours, err, now = Date.now() }) {
  if (!isOutage(err)) return { allowed: false, reason: "refused" };

  const since = lastGoodCheckAt ? new Date(lastGoodCheckAt).getTime() : 0;
  // Grace extends a proven license, it does not grant one.
  if (!since) return { allowed: false, reason: "never_reached" };

  const expiresAt = since + windowHours({ graceHours }) * 3600_000;
  if (now >= expiresAt) return { allowed: false, reason: "expired", expiresAt };

  return { allowed: true, reason: "grace", expiresAt };
}

const BLOCKED = { allowed: false, remaining: 0, cost: 0, reason: "metering_unavailable" };

async function graceDecision(err) {
  const stored = isOutage(err) ? await state() : {};
  const verdict = graceVerdict({ ...stored, err });

  if (!verdict.allowed) {
    if (inGrace) {
      inGrace = false;
      console.error("[Credits] grace window expired — blocking until the cloud answers again");
    } else if (verdict.reason === "refused") {
      console.error("[Credits] cloud refused the check, blocking node:", err.message);
    } else {
      console.error("[Credits] cloud unreachable and no grace left, blocking node:", err.message);
    }
    return BLOCKED;
  }

  if (!inGrace) {
    inGrace = true;
    console.warn(
      `[Credits] cloud unreachable (${err.message}) — running on grace until ${new Date(verdict.expiresAt).toISOString()}`,
    );
  }
  return {
    allowed: true,
    remaining: Infinity,
    cost: 0,
    reason: "grace",
    graceExpiresAt: new Date(verdict.expiresAt).toISOString(),
  };
}

export async function checkCredits(_workspaceId, nodeType) {
  try {
    const { data } = await client.post("/credits/check", { nodeType });
    await onReachable(data.graceHours);
    return { ...data, remaining: restore(data.remaining) };
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      console.error("[Credits] license key rejected by Blinkbox cloud — check SELF_HOST_LICENSE_KEY");
      await onRejected();
      return { allowed: false, remaining: 0, cost: 0, reason: "invalid_license" };
    }
    return graceDecision(err);
  }
}

// ── Deferred spend ───────────────────────────────────────────────────────────

async function defer(entry) {
  // $slice keeps the queue from growing without bound on a long outage. Oldest
  // debits are the ones dropped: they are the likeliest to be past the window
  // the cloud would still accept.
  await MeterState.updateOne(
    { _id: STATE_ID },
    { $push: { deferred: { $each: [entry], $slice: -MAX_DEFERRED } } },
    { upsert: true },
  );
}

// One bounded pass per reconnect, never a drain loop: an entry the cloud keeps
// refusing must not be able to spin here, and the next successful check picks up
// whatever is left over.
async function flushDeferred() {
  if (flushing) return;
  flushing = true;
  try {
    const doc = await MeterState.findById(STATE_ID).select("deferred").lean();
    const batch = (doc?.deferred || []).slice(0, FLUSH_BATCH);
    if (!batch.length) return;

    const sent = [];
    for (const entry of batch) {
      try {
        await client.post("/credits/deduct", {
          executionId: entry.executionId,
          nodeId: entry.nodeId,
          nodeType: entry.nodeType,
        });
      } catch (err) {
        // Still down, or down again. Leave the rest queued for the next pass.
        if (isOutage(err)) break;
        // A non-outage rejection is permanent for this entry — drop it rather
        // than keeping a debit the cloud will never take.
      }
      sent.push(entry.at);
    }

    if (sent.length) {
      // Pull by timestamp: it is the one field the queue writes itself, so a
      // replayed debit cannot be confused with a later one for the same node.
      await MeterState.updateOne({ _id: STATE_ID }, { $pull: { deferred: { at: { $in: sent } } } });
      console.log(`[Credits] replayed ${sent.length} deferred debit(s)`);
    }
  } catch (err) {
    console.error("[Credits] deferred spend flush failed:", err.message);
  } finally {
    flushing = false;
  }
}

export async function deductCredits(_workspaceId, { executionId, nodeId, nodeType }) {
  const entry = {
    executionId: executionId?.toString() || "",
    nodeId: nodeId || "",
    nodeType,
    at: new Date(),
  };

  try {
    const { data } = await client.post("/credits/deduct", entry);
    return { ...data, remaining: restore(data.remaining) };
  } catch (err) {
    if (isOutage(err) && entry.executionId) {
      // The node ran on grace. Queue the debit so the window costs the customer
      // what it would have cost live.
      try {
        await defer(entry);
      } catch (e) {
        console.error("[Credits] could not queue deferred spend:", e.message);
      }
      return { creditsUsed: 0, remaining: 0, deferred: true };
    }
    // The node already ran and checkCredits confirmed the balance. Losing this
    // debit is preferable to failing an execution the user has already paid for.
    console.error("[Credits] remote deduction failed:", err.message);
    return { creditsUsed: 0, remaining: 0 };
  }
}
