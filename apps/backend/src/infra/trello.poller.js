/**
 * Trello Poller
 * Polls a Trello board for new cards or card movements.
 * Dedup key: bb:trello:seen:{automationId} — card ID set, 30-day TTL.
 */
import { Queue, Worker } from "./bullmq.prefixed.js";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { resolveSecret } from "../utils/resolveSecret.js";

const QUEUE_NAME = "bb-trello-poller";
const SEEN_TTL = 30 * 24 * 60 * 60;
let trelloQueue = null;
let trelloWorker = null;

// Each entry is a genuinely distinct Trello event. `filter` is the Trello
// actions API filter (server-side); `match` further narrows by sub-shape when
// one action type covers several events (e.g. updateCard → moved vs archived).
const TRELLO_ACTIONS = {
  card_created:      { filter: "createCard",                 match: () => true },
  card_moved:        { filter: "updateCard",                 match: (a) => !!a.data?.listAfter && !!a.data?.listBefore },
  card_archived:     { filter: "updateCard",                 match: (a) => a.data?.card?.closed === true && a.data?.old?.closed === false },
  card_unarchived:   { filter: "updateCard",                 match: (a) => a.data?.card?.closed === false && a.data?.old?.closed === true },
  card_renamed:      { filter: "updateCard",                 match: (a) => a.data?.old?.name !== undefined },
  card_due_changed:  { filter: "updateCard",                 match: (a) => a.data?.old?.due !== undefined },
  card_commented:    { filter: "commentCard",               match: () => true },
  member_added:      { filter: "addMemberToCard",           match: () => true },
  member_removed:    { filter: "removeMemberFromCard",      match: () => true },
  label_added:       { filter: "addLabelToCard",            match: () => true },
  attachment_added:  { filter: "addAttachmentToCard",       match: () => true },
  checklist_added:   { filter: "addChecklistToCard",        match: () => true },
  checkitem_done:    { filter: "updateCheckItemStateOnCard", match: (a) => a.data?.checkItem?.state === "complete" },
  card_copied:       { filter: "copyCard",                  match: () => true },
  list_created:      { filter: "createList",                match: () => true },
};

async function fetchBoardActions(boardId, apiKey, token, filter) {
  const url = `https://api.trello.com/1/boards/${boardId}/actions?filter=${encodeURIComponent(filter)}&limit=50&key=${apiKey}&token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Trello API ${res.status}`);
  return await res.json();
}

export async function pollTrello(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:trello:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { boardId, apiKey: rawApiKey, token: rawToken, listFilter } = cfg;
    const actionType = cfg.actionType || cfg.watchType || "card_created";
    if (!boardId || !rawApiKey || !rawToken) return;
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const wsId = automation.workspaceId?.toString();
    const apiKey = await resolveSecret(rawApiKey, wsId, "Trello API key");
    const token = await resolveSecret(rawToken, wsId, "Trello token");
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const spec = TRELLO_ACTIONS[actionType] || TRELLO_ACTIONS.card_created;
    const actions = await fetchBoardActions(boardId, apiKey, token, spec.filter);
    const seenKey = `bb:trello:seen:${scope}:${actionType}`;
    for (const action of actions) {
      if (!spec.match(action)) continue;
      const added = await redis.sadd(seenKey, action.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const card = action.data?.card || {};
      const list = action.data?.list || action.data?.listAfter || action.data?.listBefore || {};
      if (listFilter && list.name && !list.name.toLowerCase().includes(listFilter.toLowerCase())) continue;
      const payload = {
        actionId: action.id,
        type: action.type,
        cardId: card.id || "",
        cardName: card.name || "",
        listId: list.id || "",
        listName: list.name || "",
        listBefore: action.data?.listBefore?.name || "",
        listAfter: action.data?.listAfter?.name || "",
        memberName: action.memberCreator?.fullName || "",
        targetMember: action.member?.fullName || action.data?.member?.name || "",
        comment: action.data?.text || "",
        label: action.data?.label?.name || action.data?.label?.color || "",
        attachmentName: action.data?.attachment?.name || "",
        attachmentUrl: action.data?.attachment?.url || "",
        checklistName: action.data?.checklist?.name || "",
        checkItem: action.data?.checkItem?.name || "",
        date: action.date,
        boardId,
        url: `https://trello.com/c/${card.shortLink || card.id}`,
      };
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `trello:${scope}:${actionType}:${action.id}`,
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
    await pollTrello(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
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
      triggerNodeId: automation.entryNodeId,
      cfg: { boardId: cfg.boardId, apiKey: cfg.apiKey, token: cfg.token, actionType: cfg.actionType || cfg.watchType, listFilter: cfg.listFilter },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `trello-${automation._id}` });
  }
  console.log(`[TrelloPoller] Synced ${automations.length} automations`);
}

export async function stopTrelloPoller() {
  if (trelloWorker) await trelloWorker.close();
  if (trelloQueue) await trelloQueue.close();
  trelloWorker = null; trelloQueue = null;
}
