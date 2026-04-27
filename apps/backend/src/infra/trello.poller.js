/**
 * Trello Poller
 * Polls a Trello board for new cards or card movements.
 * Dedup key: bb:trello:seen:{automationId} — card ID set, 30-day TTL.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const QUEUE_NAME = "bb-trello-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
let trelloQueue = null;
let trelloWorker = null;

async function fetchBoardActions(boardId, apiKey, token) {
  const url = `https://api.trello.com/1/boards/${boardId}/actions?filter=createCard,updateCard&limit=50&key=${apiKey}&token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Trello API ${res.status}`);
  return await res.json();
}

async function pollTrello(automationId, cfg) {
  const lockKey = `bb:trello:lock:${automationId}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { boardId, apiKey, token, watchType = "new_card", listFilter } = cfg;
    if (!boardId || !apiKey || !token) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const actions = await fetchBoardActions(boardId, apiKey, token);
    const seenKey = `bb:trello:seen:${automationId}`;
    for (const action of actions) {
      if (watchType === "new_card" && action.type !== "createCard") continue;
      if (watchType === "card_moved" && action.type !== "updateCard") continue;
      const added = await redis.sadd(seenKey, action.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const card = action.data?.card || {};
      const list = action.data?.list || action.data?.listAfter || {};
      if (listFilter && list.name && !list.name.toLowerCase().includes(listFilter.toLowerCase())) continue;
      const payload = {
        actionId: action.id,
        type: action.type,
        cardId: card.id || "",
        cardName: card.name || "",
        listId: list.id || "",
        listName: list.name || "",
        memberName: action.memberCreator?.fullName || "",
        date: action.date,
        boardId,
        url: `https://trello.com/c/${card.shortLink || card.id}`,
      };
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        idempotencyKey: `trello:${automationId}:${action.id}`,
      });
    }
  } catch (err) {
    console.warn(`[TrelloPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startTrelloPoller() {
  console.log("[TrelloPoller] Starting...");
  trelloQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  trelloWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollTrello(job.data.automationId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  trelloWorker.on("failed", (job, err) => console.error(`[TrelloPoller] Job failed:`, err.message));
  await syncTrelloJobs();
  console.log("[TrelloPoller] Ready");
}

export async function syncTrelloJobs() {
  if (!trelloQueue) return;
  const existing = await trelloQueue.getRepeatableJobs();
  for (const job of existing) await trelloQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "trello_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.boardId || !cfg.apiKey) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 5;
    await trelloQueue.add("trello-poll", {
      automationId: automation._id.toString(),
      cfg: { boardId: cfg.boardId, apiKey: cfg.apiKey, token: cfg.token, watchType: cfg.watchType, listFilter: cfg.listFilter },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `trello-${automation._id}` });
  }
  console.log(`[TrelloPoller] Synced ${automations.length} automations`);
}

export async function stopTrelloPoller() {
  if (trelloWorker) await trelloWorker.close();
  if (trelloQueue) await trelloQueue.close();
  trelloWorker = null; trelloQueue = null;
}
