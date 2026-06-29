/**
 * Microsoft Teams Message Poller (Graph API)
 * Polls a Teams channel for new messages.
 * Requires Microsoft OAuth with ChannelMessage.Read.All scope.
 * Dedup key: bb:teams:seen:{automationId} — message ID set, 7-day TTL.
 */
import { Queue, Worker } from "bullmq";
import { createBullMQConnection } from "./bullmq.js";
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const QUEUE_NAME = "bb-teams-poller";
const SEEN_TTL = 7 * 24 * 60 * 60;
let teamsQueue = null;
let teamsWorker = null;

// Each event = a client-side predicate over the channel message stream
// (optionally including reply posts). `eventType` selects the entry.
const TEAMS_EVENTS = {
  new_message:    { match: (m) => m.messageType === "message" && !m.replyToId, withReplies: false },
  reply_posted:   { match: (m) => m.messageType === "message" && !!m.replyToId, withReplies: true },
  mention:        { match: (m) => m.messageType === "message" && (m.mentions || []).length > 0, withReplies: false },
  urgent:         { match: (m) => m.messageType === "message" && m.importance === "urgent", withReplies: false },
  important:      { match: (m) => m.messageType === "message" && (m.importance === "high" || m.importance === "urgent"), withReplies: false },
  with_attachment:{ match: (m) => m.messageType === "message" && (m.attachments || []).length > 0, withReplies: false },
  with_reaction:  { match: (m) => m.messageType === "message" && (m.reactions || []).length > 0, withReplies: true },
  has_link:       { match: (m) => m.messageType === "message" && /<a\s|https?:\/\//i.test(m.body?.content || ""), withReplies: false },
  announcement:   { match: (m) => m.messageType === "message" && !!m.subject, withReplies: false },
  from_user:      { match: (m, cfg) => m.messageType === "message" && (m.from?.user?.displayName || "").toLowerCase() === String(cfg.fromUser || "").toLowerCase(), withReplies: false },
  keyword:        { match: (m, cfg) => m.messageType === "message" && (m.body?.content || "").replace(/<[^>]+>/g, "").toLowerCase().includes(String(cfg.keywordFilter || "").toLowerCase()), withReplies: false },
  system_event:   { match: (m) => m.messageType && m.messageType !== "message", withReplies: false },
};

async function fetchMessages(accessToken, teamId, channelId, withReplies) {
  const expand = withReplies ? "&$expand=replies" : "";
  const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages?$top=20${expand}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Graph API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const top = data.value || [];
  if (!withReplies) return top;
  const flat = [];
  for (const m of top) {
    flat.push(m);
    for (const r of m.replies || []) flat.push(r);
  }
  return flat;
}

export async function pollTeams(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:teams:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { credentialId, workspaceId, teamId, channelId } = cfg;
    if (!credentialId || !teamId || !channelId) return;
    const eventType = cfg.eventType || cfg.watchType || "new_message";
    const spec = TEAMS_EVENTS[eventType] || TEAMS_EVENTS.new_message;
    const accessToken = await getOAuthToken(credentialId, workspaceId, "Teams Trigger");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const messages = await fetchMessages(accessToken, teamId, channelId, spec.withReplies);
    const seenKey = `bb:teams:seen:${scope}:${eventType}`;
    for (const msg of messages) {
      if (!spec.match(msg, cfg)) continue;
      const text = msg.body?.content?.replace(/<[^>]+>/g, "") || "";
      const added = await redis.sadd(seenKey, msg.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const payload = {
        id: msg.id,
        text,
        subject: msg.subject || "",
        author: msg.from?.user?.displayName || "",
        authorEmail: msg.from?.user?.userIdentityType || "",
        importance: msg.importance || "normal",
        mentionCount: (msg.mentions || []).length,
        attachmentCount: (msg.attachments || []).length,
        reactionCount: (msg.reactions || []).length,
        isReply: !!msg.replyToId,
        messageType: msg.messageType || "",
        createdAt: msg.createdDateTime,
        teamId,
        channelId,
        webUrl: msg.webUrl || "",
      };
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `teams:${scope}:${eventType}:${msg.id}`,
      });
    }
  } catch (err) {
    console.warn(`[TeamsPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}

export async function startTeamsPoller() {
  console.log("[TeamsPoller] Starting...");
  teamsQueue = new Queue(QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
  });
  teamsWorker = new Worker(QUEUE_NAME, async (job) => {
    await pollTeams(job.data.automationId, job.data.triggerNodeId, job.data.cfg);
  }, { connection: createBullMQConnection(), concurrency: 4 });
  teamsWorker.on("failed", (job, err) => console.error(`[TeamsPoller] Job failed:`, err.message));
  await syncTeamsJobs();
  console.log("[TeamsPoller] Ready");
}

export async function syncTeamsJobs() {
  if (!teamsQueue) return;
  const existing = await teamsQueue.getRepeatableJobs();
  for (const job of existing) await teamsQueue.removeRepeatableByKey(job.key);
  const automations = await Automation.find({ trigger: "teams_trigger", active: true });
  for (const automation of automations) {
    const entryNode = automation.nodes.find((n) => n.id === automation.entryNodeId);
    const cfg = entryNode?.data?.config || {};
    if (!cfg.credentialId || !cfg.teamId || !cfg.channelId) continue;
    const interval = parseInt(cfg.pollIntervalMinutes) || 2;
    await teamsQueue.add("teams-poll", {
      automationId: automation._id.toString(),
      triggerNodeId: automation.entryNodeId,
      cfg: { credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(), teamId: cfg.teamId, channelId: cfg.channelId, eventType: cfg.eventType || cfg.watchType, keywordFilter: cfg.keywordFilter, fromUser: cfg.fromUser },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `teams-${automation._id}` });
  }
  console.log(`[TeamsPoller] Synced ${automations.length} automations`);
}

export async function stopTeamsPoller() {
  if (teamsWorker) await teamsWorker.close();
  if (teamsQueue) await teamsQueue.close();
  teamsWorker = null; teamsQueue = null;
}
