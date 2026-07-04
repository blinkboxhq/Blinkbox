/**
 * Telegram Poller
 * Polls the Bot API with getUpdates, persisting the update offset in Redis so
 * each update is read exactly once. This is the webhook-free path — a bot
 * cannot use getUpdates and setWebhook at the same time, so the poller is fully
 * self-contained. `eventType` (via configExtra) classifies each update.
 *
 * Note: getUpdates only delivers updates the bot can see — for groups the bot
 * must have privacy mode off (or be an admin) to receive all messages.
 */
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";

const API = "https://api.telegram.org";
const OFFSET_TTL = 30 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();

async function getUpdates(botToken, offset) {
  const url = `${API}/bot${botToken}/getUpdates?timeout=0&limit=100&offset=${offset}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Telegram API ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram: ${data.description || "getUpdates failed"}`);
  return data.result || [];
}

function msgText(m) { return m?.text || m?.caption || ""; }

// Each event is a predicate over a single update (`u`) and config (`c`).
// The classifier picks the message-bearing field, so message / channel_post /
// edited variants all map onto the same content predicates.
export const TELEGRAM_EVENTS = {
  message:          { msg: (u) => u.message,         match: () => true },
  edited_message:   { msg: (u) => u.edited_message,  match: (u) => !!u.edited_message },
  channel_post:     { msg: (u) => u.channel_post,    match: (u) => !!u.channel_post },
  command:          { msg: (u) => u.message,         match: (u, m) => /^\//.test(msgText(m)) },
  text_contains:    { msg: (u) => u.message || u.channel_post, match: (u, m, c) => !!c.targetValue && lc(msgText(m)).includes(lc(c.targetValue)) },
  has_photo:        { msg: (u) => u.message || u.channel_post, match: (u, m) => !!m?.photo },
  has_document:     { msg: (u) => u.message || u.channel_post, match: (u, m) => !!m?.document },
  has_link:         { msg: (u) => u.message || u.channel_post, match: (u, m) => /https?:\/\/\S+/i.test(msgText(m)) || (m?.entities || []).some((e) => e.type === "url" || e.type === "text_link") },
  mentions_bot:     { msg: (u) => u.message,         match: (u, m) => (m?.entities || []).some((e) => e.type === "mention") },
  callback_query:   { msg: (u) => u.callback_query?.message, match: (u) => !!u.callback_query },
  new_chat_member:  { msg: (u) => u.message,         match: (u, m) => Array.isArray(m?.new_chat_members) && m.new_chat_members.length > 0 },
  left_chat_member: { msg: (u) => u.message,         match: (u, m) => !!m?.left_chat_member },
  my_chat_member:   { msg: () => null,               match: (u) => !!u.my_chat_member },
};

export function shape(u, eventType) {
  const m = u.message || u.edited_message || u.channel_post || u.callback_query?.message || {};
  const from = u.message?.from || u.edited_message?.from || u.callback_query?.from || {};
  return {
    updateId: u.update_id,
    eventType,
    messageId: m.message_id,
    chatId: m.chat?.id,
    chatType: m.chat?.type,
    chatTitle: m.chat?.title,
    text: msgText(m),
    fromId: from.id,
    fromUsername: from.username,
    fromName: [from.first_name, from.last_name].filter(Boolean).join(" "),
    callbackData: u.callback_query?.data,
    newMembers: (m.new_chat_members || []).map((x) => x.username || x.id),
    leftMember: m.left_chat_member?.username || m.left_chat_member?.id,
    date: m.date ? new Date(m.date * 1000).toISOString() : new Date().toISOString(),
  };
}

export async function pollTelegram(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:telegram:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    // `botToken` is a credential id; resolve it to the real bot token. Falls
    // back to a raw token if a literal value was stored.
    if (!cfg.botToken) return;
    let botToken = cfg.botToken;
    if (cfg.workspaceId) {
      try {
        botToken = await getOAuthToken(cfg.botToken, cfg.workspaceId, "Telegram trigger");
      } catch {
        /* not a credential id — treat cfg.botToken as the literal token */
      }
    }
    const eventType = cfg.eventType || cfg.watchType || "message";
    const spec = TELEGRAM_EVENTS[eventType] || TELEGRAM_EVENTS.message;

    const offsetKey = `bb:telegram:offset:${scope}`;
    const offset = parseInt(await redis.get(offsetKey)) || 0;
    const updates = await getUpdates(botToken, offset);
    if (!updates.length) return;

    // Advance the offset first so a downstream failure never replays the batch.
    const maxId = Math.max(...updates.map((u) => u.update_id));
    await redis.set(offsetKey, String(maxId + 1), "EX", OFFSET_TTL);

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const c = { targetValue: cfg.targetValue };
    for (const u of updates) {
      const m = spec.msg(u);
      if (m === undefined) continue;
      if (!spec.match(u, m, c)) continue;
      try {
        await executeAutomation(automation, shape(u, eventType), {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `telegram:${scope}:${eventType}:${u.update_id}`,
        });
      } catch (err) {
        console.error(`[TelegramPoller] Failed for "${automation.name}":`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[TelegramPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
