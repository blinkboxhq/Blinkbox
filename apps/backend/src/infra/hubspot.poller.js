/**
 * HubSpot CRM Poller
 *
 * Polls HubSpot CRM v3 for new/updated objects (contacts, deals, companies, tickets).
 * Uses Redis watermark (Unix timestamp ms) + object ID deduplication.
 *
 * Watermark key: bb:hubspot:wm:{automationId} -> ms timestamp string
 * Seen-object dedup: bb:hubspot:seen:{automationId} -> Redis Set of "{id}:{updatedAt}"
 * TTL: 30 days
 */

import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const HUBSPOT_QUEUE = "bb-hubspot-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
const HS_BASE = "https://api.hubapi.com";

let hsQueue = null;
let hsWorker = null;

const DEFAULT_PROPS = {
  contacts:  ["email", "firstname", "lastname", "phone", "lifecyclestage", "createdate", "hs_lastmodifieddate"],
  deals:     ["dealname", "amount", "dealstage", "closedate", "pipeline", "createdate", "hs_lastmodifieddate"],
  companies: ["name", "domain", "industry", "city", "country", "createdate", "hs_lastmodifieddate"],
  tickets:   ["subject", "content", "hs_pipeline_stage", "hs_ticket_priority", "createdate", "hs_lastmodifieddate"],
};

async function hsSearch(apiKey, objectType, filters, properties, limit) {
  const res = await fetch(`${HS_BASE}/crm/v3/objects/${objectType}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: filters.length ? [{ filters }] : [],
      properties: properties.length ? properties : DEFAULT_PROPS[objectType] || [],
      sorts: [{ propertyName: "createdate", direction: "ASCENDING" }],
      limit: Math.min(limit || 20, 100),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HubSpot API ${res.status}`);
  }
  return res.json();
}

export async function pollHubSpot(
  automationId, apiKey, objectType,
  filterProperty, filterValue, limit, triggerOnUpdate, workspaceId,
) {
  const lockKey = `bb:hubspot:lock:${automationId}`;
  const seenKey = `bb:hubspot:seen:${automationId}`;
  const wmKey   = `bb:hubspot:wm:${automationId}`;

  const locked = await acquireLock(lockKey, "poller", 120);
  if (!locked) return;

  try {
    const watermark = await redis.get(wmKey);
    const now = Date.now().toString();

    const filters = [];

    if (watermark) {
      const propName = triggerOnUpdate ? "hs_lastmodifieddate" : "createdate";
      filters.push({ propertyName: propName, operator: "GTE", value: watermark });
    }

    if (filterProperty && filterValue !== undefined && filterValue !== "") {
      filters.push({ propertyName: filterProperty, operator: "EQ", value: filterValue });
    }

    const data = await hsSearch(apiKey, objectType, filters, [], limit);
    const objects = data.results || [];

    if (!objects.length) {
      await redis.set(wmKey, now);
      return;
    }

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    for (const obj of objects) {
      const ts = obj.properties?.hs_lastmodifieddate || obj.properties?.createdate || "";
      const dedupeKey = `${obj.id}:${ts}`;

      const claimed = await redis.sadd(seenKey, dedupeKey);
      await redis.expire(seenKey, SEEN_TTL);
      if (claimed === 0 && !triggerOnUpdate) continue;

      try {
        await executeAutomation(automation, obj, { workspaceId: automation.workspaceId, idempotencyKey: `hubspot:${automationId}:${obj.id}:${ts}` });
        console.log(`[HubSpotPoller] Fired for "${automation.name}" ${objectType} ID: ${obj.id}`);
      } catch (err) {
        console.error(`[HubSpotPoller] Failed to process ${obj.id}:`, err.message);
      }
    }

    await redis.set(wmKey, now);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startHubSpotPoller() {
  console.log("[HubSpotPoller] Starting...");

  hsQueue = new Queue(HUBSPOT_QUEUE, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });

  hsWorker = new Worker(
    HUBSPOT_QUEUE,
    async (job) => {
      const { automationId, apiKey, objectType, filterProperty, filterValue, limit, triggerOnUpdate, workspaceId } = job.data;
      await pollHubSpot(automationId, apiKey, objectType, filterProperty, filterValue, limit, triggerOnUpdate, workspaceId);
    },
    { connection: createBullMQConnection(), concurrency: 4 },
  );

  hsWorker.on("failed", (job, err) => {
    console.error(`[HubSpotPoller] Job failed for ${job?.data?.automationId}:`, err.message);
  });

  await syncHubSpotJobs();
  console.log("[HubSpotPoller] Ready");
}

export async function syncHubSpotJobs() {
  if (!hsQueue) return;

  const existing = await hsQueue.getRepeatableJobs();
  for (const job of existing) await hsQueue.removeRepeatableByKey(job.key);

  const automations = await Automation.find({ trigger: "hubspot_trigger", active: true });

  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || entryNode?.data || {};
    const { apiKey, objectType, filterProperty, filterValue, limit, triggerOnUpdate, pollInterval } = cfg;

    if (!apiKey) {
      console.warn(`[HubSpotPoller] Automation ${automation._id} has no apiKey, skipping`);
      continue;
    }

    const interval = pollInterval || "*/5 * * * *";
    await hsQueue.add(
      "hubspot-poll",
      {
        automationId: automation._id.toString(),
        apiKey,
        objectType: objectType || "contacts",
        filterProperty, filterValue,
        limit: limit || 20,
        triggerOnUpdate: !!triggerOnUpdate,
        workspaceId: automation.workspaceId,
      },
      { repeat: { pattern: interval }, jobId: `hubspot-${automation._id}` },
    );
    console.log(`[HubSpotPoller] Registered: "${automation.name}" → ${objectType || "contacts"} every ${interval}`);
  }

  console.log(`[HubSpotPoller] Synced ${automations.length} HubSpot automations`);
}

export async function stopHubSpotPoller() {
  if (hsWorker) await hsWorker.close();
  if (hsQueue)  await hsQueue.close();
  hsWorker = null;
  hsQueue = null;
}
