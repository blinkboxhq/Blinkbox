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

async function fetchMessages(accessToken, teamId, channelId) {
  const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages?$top=20`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Graph API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.value || [];
}

export async function pollTeams(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:teams:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;
  try {
    const { credentialId, workspaceId, teamId, channelId, keywordFilter } = cfg;
    if (!credentialId || !teamId || !channelId) return;
    const accessToken = await getOAuthToken(credentialId, workspaceId, "Teams Trigger");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const messages = await fetchMessages(accessToken, teamId, channelId);
    const seenKey = `bb:teams:seen:${scope}`;
    for (const msg of messages) {
      if (msg.messageType !== "message") continue;
      const text = msg.body?.content?.replace(/<[^>]+>/g, "") || "";
      if (keywordFilter && !text.toLowerCase().includes(keywordFilter.toLowerCase())) continue;
      const added = await redis.sadd(seenKey, msg.id);
      if (!added) continue;
      await redis.expire(seenKey, SEEN_TTL);
      const payload = {
        id: msg.id,
        text,
        author: msg.from?.user?.displayName || "",
        authorEmail: msg.from?.user?.userIdentityType || "",
        createdAt: msg.createdDateTime,
        teamId,
        channelId,
        webUrl: msg.webUrl || "",
      };
      await executeAutomation(automation, payload, {
        workspaceId: automation.workspaceId,
        entryNodeId: triggerNodeId || automation.entryNodeId,
        idempotencyKey: `teams:${scope}:${msg.id}`,
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
      cfg: { credentialId: cfg.credentialId, workspaceId: automation.workspaceId.toString(), teamId: cfg.teamId, channelId: cfg.channelId, keywordFilter: cfg.keywordFilter },
    }, { repeat: { pattern: `*/${interval} * * * *` }, jobId: `teams-${automation._id}` });
  }
  console.log(`[TeamsPoller] Synced ${automations.length} automations`);
}

export async function stopTeamsPoller() {
  if (teamsWorker) await teamsWorker.close();
  if (teamsQueue) await teamsQueue.close();
  teamsWorker = null; teamsQueue = null;
}
