/**
 * Notion Poller
 *
 * Polls a Notion database for new (and optionally updated) pages.
 * Uses a Redis watermark (ISO timestamp) to fetch pages created/edited
 * after the previous poll using Notion's database query filter.
 *
 * Watermark key: bb:notion:wm:{automationId} -> ISO timestamp
 * Seen-page dedup: bb:notion:seen:{automationId} -> Redis Set of page IDs
 * TTL: 30 days
 */

import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const NOTION_QUEUE = "bb-notion-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;

let notionQueue = null;
let notionWorker = null;

async function notionPost(apiKey, endpoint, body) {
  const res = await fetch(`https://api.notion.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Notion API ${res.status}`);
  }
  return res.json();
}

async function pollNotion(
  automationId, apiKey, databaseId,
  filterProperty, filterValue, maxPages, triggerOnUpdate, workspaceId,
) {
  const lockKey = `bb:notion:lock:${automationId}`;
  const seenKey = `bb:notion:seen:${automationId}`;
  const wmKey   = `bb:notion:wm:${automationId}`;

  const locked = await acquireLock(lockKey, "poller", 120);
  if (!locked) return;

  try {
    const watermark = await redis.get(wmKey);
    const now = new Date().toISOString();

    const filterConditions = [];

    if (watermark) {
      filterConditions.push({
        timestamp: triggerOnUpdate ? "last_edited_time" : "created_time",
        [triggerOnUpdate ? "last_edited_time" : "created_time"]: { after: watermark },
      });
    }

    if (filterProperty && filterValue !== undefined && filterValue !== "") {
      filterConditions.push({
        property: filterProperty,
        select: { equals: filterValue },
      });
    }

    const queryBody = {
      page_size: Math.min(maxPages || 20, 100),
      sorts: [{ timestamp: triggerOnUpdate ? "last_edited_time" : "created_time", direction: "ascending" }],
    };
    if (filterConditions.length === 1) queryBody.filter = filterConditions[0];
    if (filterConditions.length > 1)  queryBody.filter = { and: filterConditions };

    const data = await notionPost(apiKey, `databases/${databaseId}/query`, queryBody);
    const pages = data.results || [];

    if (!pages.length) {
      await redis.set(wmKey, now);
      return;
    }

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    for (const page of pages) {
      const dedupeKey = triggerOnUpdate
        ? `${page.id}:${page.last_edited_time}`
        : page.id;

      const claimed = await redis.sadd(seenKey, dedupeKey);
      await redis.expire(seenKey, SEEN_TTL);
      if (claimed === 0 && !triggerOnUpdate) continue;

      try {
        await executeAutomation(automation, page, { workspaceId: automation.workspaceId });
        console.log(`[NotionPoller] Fired for "${automation.name}" page: ${page.id}`);
      } catch (err) {
        console.error(`[NotionPoller] Failed to process page ${page.id}:`, err.message);
      }
    }

    await redis.set(wmKey, now);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startNotionPoller() {
  console.log("[NotionPoller] Starting...");

  notionQueue = new Queue(NOTION_QUEUE, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });

  notionWorker = new Worker(
    NOTION_QUEUE,
    async (job) => {
      const { automationId, apiKey, databaseId, filterProperty, filterValue, maxPages, triggerOnUpdate, workspaceId } = job.data;
      await pollNotion(automationId, apiKey, databaseId, filterProperty, filterValue, maxPages, triggerOnUpdate, workspaceId);
    },
    { connection: createBullMQConnection(), concurrency: 4 },
  );

  notionWorker.on("failed", (job, err) => {
    console.error(`[NotionPoller] Job failed for ${job?.data?.automationId}:`, err.message);
  });

  await syncNotionJobs();
  console.log("[NotionPoller] Ready");
}

export async function syncNotionJobs() {
  if (!notionQueue) return;

  const existing = await notionQueue.getRepeatableJobs();
  for (const job of existing) await notionQueue.removeRepeatableByKey(job.key);

  const automations = await Automation.find({ trigger: "notion_trigger", active: true });

  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || entryNode?.data || {};
    const { apiKey, databaseId, filterProperty, filterValue, maxPages, triggerOnUpdate, pollInterval } = cfg;

    if (!apiKey || !databaseId) {
      console.warn(`[NotionPoller] Automation ${automation._id} missing required fields, skipping`);
      continue;
    }

    const interval = pollInterval || "*/5 * * * *";
    await notionQueue.add(
      "notion-poll",
      {
        automationId: automation._id.toString(),
        apiKey, databaseId, filterProperty, filterValue,
        maxPages: maxPages || 20,
        triggerOnUpdate: !!triggerOnUpdate,
        workspaceId: automation.workspaceId,
      },
      { repeat: { pattern: interval }, jobId: `notion-${automation._id}` },
    );
    console.log(`[NotionPoller] Registered: "${automation.name}" → ${databaseId} every ${interval}`);
  }

  console.log(`[NotionPoller] Synced ${automations.length} Notion automations`);
}

export async function stopNotionPoller() {
  if (notionWorker) await notionWorker.close();
  if (notionQueue)  await notionQueue.close();
  notionWorker = null;
  notionQueue = null;
}
