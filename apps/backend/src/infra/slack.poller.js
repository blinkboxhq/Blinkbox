import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const API = "https://slack.com/api";
const SEEN_TTL = 30 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;

// Pull a channel's most-recent messages and normalize the fields the event
// predicates compare. Slack auth is a Bearer bot token. Each message has a
// stable `ts` used for dedup. Reaction counts mutate, so the snapshot tracks the
// total reaction count to support reaction events.
async function fetchHistory(token, channel) {
  const res = await fetch(`${API}/conversations.history?channel=${encodeURIComponent(channel)}&limit=50`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`Slack API ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API ${data.error || "error"}`);
  return (data.messages || []).map((m) => ({
    ts: String(m.ts || ""),
    text: m.text || "",
    user: m.user || m.bot_id || "",
    subtype: m.subtype || "",
    isBot: !!m.bot_id || m.subtype === "bot_message",
    threadTs: m.thread_ts || "",
    isThreadReply: !!m.thread_ts && m.thread_ts !== m.ts,
    replyCount: m.reply_count ?? 0,
    reactionCount: (m.reactions || []).reduce((n, r) => n + (r.count || 0), 0),
    reactions: (m.reactions || []).map((r) => r.name),
    hasFile: Array.isArray(m.files) && m.files.length > 0,
  }));
}

const lc = (s) => String(s ?? "").toLowerCase();
const hasLink = (t) => /<https?:\/\/|https?:\/\//i.test(t);

// Each event is a predicate over the current message (`m`), its previous snapshot
// (`p`, may be null), and config (`c`). `changeAware` events dedup on a changing
// token so they re-fire as reactions/replies grow; `needsPrev` events stay quiet
// until a baseline snapshot exists.
const SLACK_EVENTS = {
  new_message:     { needsPrev: false, dedup: (m) => `${m.ts}`, match: (m, p) => !p && !m.isThreadReply },
  from_user:       { needsPrev: false, dedup: (m) => `${m.ts}`, match: (m, _p, c) => lc(m.user) === lc(c.targetValue) },
  text_contains:   { needsPrev: false, dedup: (m) => `${m.ts}`, match: (m, _p, c) => lc(m.text).includes(lc(c.targetValue)) },
  mentions:        { needsPrev: false, dedup: (m) => `${m.ts}`, match: (m, _p, c) => lc(m.text).includes(`@${lc(c.targetValue).replace(/^@/, "")}`) || lc(m.text).includes(lc(c.targetValue)) },
  has_link:        { needsPrev: false, dedup: (m) => `${m.ts}`, match: (m) => hasLink(m.text) },
  has_file:        { needsPrev: false, dedup: (m) => `${m.ts}`, match: (m) => m.hasFile },
  thread_reply:    { needsPrev: false, dedup: (m) => `${m.ts}`, match: (m) => m.isThreadReply },
  bot_message:     { needsPrev: false, dedup: (m) => `${m.ts}`, match: (m) => m.isBot },
  human_message:   { needsPrev: false, dedup: (m) => `${m.ts}`, match: (m) => !m.isBot && !m.subtype },
  reaction_added:  { needsPrev: true,  changeAware: true, dedup: (m) => `${m.ts}:rx${m.reactionCount}`, match: (m, p) => Number(m.reactionCount) > Number(p.reactionCount || 0) },
  reactions_over:  { needsPrev: false, changeAware: true, dedup: (m) => `${m.ts}:rx${m.reactionCount}`, match: (m, _p, c) => Number(m.reactionCount) >= Number(c.targetValue || 0) },
  new_reply:       { needsPrev: true,  changeAware: true, dedup: (m) => `${m.ts}:rp${m.replyCount}`, match: (m, p) => Number(m.replyCount) > Number(p.replyCount || 0) },
};

export async function pollSlack(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:slack:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const { credentialId, workspaceId, channel } = cfg;
    if (!credentialId || !channel) return;
    const eventType = cfg.eventType || cfg.watchType || "new_message";
    const spec = SLACK_EVENTS[eventType] || SLACK_EVENTS.new_message;

    const token = await getOAuthToken(credentialId, workspaceId, "Slack Trigger");
    const messages = await fetchHistory(token, channel);
    if (!messages.length) return;

    const snapKey = `bb:slack:snap:${scope}`;
    const prevRaw = await redis.get(snapKey);
    const prevSnap = prevRaw ? JSON.parse(prevRaw) : {};
    const firstSync = !prevRaw;

    const nextSnap = {};
    for (const m of messages) nextSnap[m.ts] = { reactionCount: m.reactionCount, replyCount: m.replyCount };
    await redis.set(snapKey, JSON.stringify(nextSnap), "EX", SNAP_TTL);

    const createdOnce = ["new_message", "from_user", "text_contains", "mentions", "has_link", "has_file", "thread_reply", "bot_message", "human_message"];
    if (firstSync && (spec.needsPrev || createdOnce.includes(eventType))) return;

    const { executeAutomation } = await import("../modules/automation/automation.executor.js");
    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;

    const seenKey = `bb:slack:seen:${scope}:${eventType}`;
    for (const m of messages) {
      const prev = prevSnap[m.ts] || null;
      if (spec.needsPrev && !prev) continue;
      if (!spec.match(m, prev, cfg)) continue;

      const dedup = spec.dedup(m);
      const fresh = await redis.sadd(seenKey, dedup);
      if (!fresh) continue;
      await redis.expire(seenKey, SEEN_TTL);

      try {
        await executeAutomation(automation, {
          ts: m.ts, text: m.text, user: m.user, channel,
          isBot: m.isBot, threadTs: m.threadTs, replyCount: m.replyCount,
          reactionCount: m.reactionCount, reactions: m.reactions, hasFile: m.hasFile,
        }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `slack:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[SlackPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[SlackPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
