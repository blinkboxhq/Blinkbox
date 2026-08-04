/**
 * Remote credit client — the self-hosted half of metering.
 *
 * A self-hosted instance keeps its workflows, executions and credentials in its
 * own database, but it has no billing state of its own. Every metered node asks
 * the Blinkbox cloud whether the license owner can afford it, and reports the
 * spend afterwards. The workspace is never sent: the cloud derives it from the
 * license key, so a tampered container cannot bill someone else or itself.
 *
 * Fails CLOSED on check. If the cloud is unreachable the node does not run —
 * an instance that keeps executing while it cannot be metered is a free instance.
 */

import axios from "axios";
import { CLOUD_API_URL, SELF_HOST_LICENSE_KEY } from "../config/env.js";

const BASE = `${CLOUD_API_URL.replace(/\/$/, "")}/api/self-host`;
const TIMEOUT_MS = 10000;

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

export async function checkCredits(_workspaceId, nodeType) {
  try {
    const { data } = await client.post("/credits/check", { nodeType });
    return { ...data, remaining: restore(data.remaining) };
  } catch (err) {
    const status = err.response?.status;
    if (status === 401) {
      console.error("[Credits] license key rejected by Blinkbox cloud — check SELF_HOST_LICENSE_KEY");
      return { allowed: false, remaining: 0, cost: 0, reason: "invalid_license" };
    }
    console.error("[Credits] cloud unreachable, blocking node:", err.message);
    return { allowed: false, remaining: 0, cost: 0, reason: "metering_unavailable" };
  }
}

export async function deductCredits(_workspaceId, { executionId, nodeId, nodeType }) {
  try {
    const { data } = await client.post("/credits/deduct", {
      executionId: executionId?.toString(),
      nodeId,
      nodeType,
    });
    return { ...data, remaining: restore(data.remaining) };
  } catch (err) {
    // The node already ran and checkCredits confirmed the balance. Losing this
    // debit is preferable to failing an execution the user has already paid for.
    console.error("[Credits] remote deduction failed:", err.message);
    return { creditsUsed: 0, remaining: 0 };
  }
}
