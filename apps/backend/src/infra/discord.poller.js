/**
 * Discord Poller
 * Polls the Discord REST API with a bot token (no gateway socket needed).
 * Each event is a distinct, real REST query — new messages in a channel,
 * pinned/embedded/attachment messages, mentions, new threads, new members,
 * boost/member-count changes. `eventType` (via configExtra) selects the entry.
 *
 * Bot token requires the bot to be in the guild with the relevant intents:
 *   - message events  → View Channel + Read Message History on the channel
 *   - member events   → Server Members intent + a guildId
 */
import { redis } from "./redis.client.js";
import { acquireLock, releaseLock } from "./redis.lock.js";
import Automation from "../models/automation.model.js";

const API = "https://discord.com/api/v10";
const SEEN_TTL = 7 * 24 * 60 * 60;
const SNAP_TTL = 30 * 24 * 60 * 60;
const lc = (s) => String(s ?? "").toLowerCase();

async function discordGet(path, botToken) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bot ${botToken}`, "User-Agent": "BlinkBox (https://blinkbox.co.in, 1.0)" },
  });
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Discord rate limited (retry after ${body.retry_after || "?"}s)`);
  }
  if (!res.ok) throw new Error(`Discord API ${res.status} on ${path}`);
  return res.json();
}

function messageShape(m, channelId) {
  return {
    id: m.id,
    type: "message",
    channelId,
    content: m.content,
    authorId: m.author?.id,
    authorName: m.author?.username,
    authorBot: !!m.author?.bot,
    attachmentCount: (m.attachments || []).length,
    attachmentUrls: (m.attachments || []).map((a) => a.url),
    embedCount: (m.embeds || []).length,
    mentionsEveryone: !!m.mention_everyone,
    mentionedUserIds: (m.mentions || []).map((u) => u.id),
    pinned: !!m.pinned,
    timestamp: m.timestamp,
    url: m.guild_id ? `https://discord.com/channels/${m.guild_id}/${channelId}/${m.id}` : undefined,
  };
}

function memberShape(mem, guildId) {
  return {
    id: mem.user?.id,
    type: "member",
    guildId,
    username: mem.user?.username,
    globalName: mem.user?.global_name,
    nick: mem.nick,
    joinedAt: mem.joined_at,
    roleCount: (mem.roles || []).length,
    isBot: !!mem.user?.bot,
  };
}

// channel-message events: pull recent messages once and classify each.
const MESSAGE_EVENTS = {
  message_created:    (m) => true,
  message_with_link:  (m) => /https?:\/\/\S+/i.test(m.content || ""),
  message_with_file:  (m) => (m.attachments || []).length > 0,
  message_with_embed: (m) => (m.embeds || []).length > 0,
  message_mentions:   (m) => (m.mentions || []).length > 0 || m.mention_everyone,
  message_from_bot:   (m) => !!m.author?.bot,
  message_from_human: (m) => !m.author?.bot,
  message_contains:   (m, cfg) => !!cfg.targetValue && lc(m.content).includes(lc(cfg.targetValue)),
  message_pinned:     (m) => !!m.pinned,
};

async function pollMessages(eventType, cfg, botToken, scope, emit) {
  const { channelId } = cfg;
  if (!channelId) return;
  const msgs = await discordGet(`/channels/${channelId}/messages?limit=50`, botToken);
  const pred = MESSAGE_EVENTS[eventType] || MESSAGE_EVENTS.message_created;
  const seenKey = `bb:discord:seen:${scope}:${eventType}`;
  // process oldest→newest so order is natural
  for (const m of [...msgs].reverse()) {
    if (!pred(m, cfg)) continue;
    const added = await redis.sadd(seenKey, m.id);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await emit(messageShape(m, channelId), m.id);
  }
}

async function pollThreads(cfg, botToken, scope, emit) {
  const { channelId, guildId } = cfg;
  // active threads are listed per-guild; fall back to channel if no guild.
  const path = guildId ? `/guilds/${guildId}/threads/active` : null;
  if (!path) return;
  const data = await discordGet(path, botToken);
  const seenKey = `bb:discord:seen:${scope}:thread_created`;
  for (const t of data.threads || []) {
    if (channelId && t.parent_id !== channelId) continue;
    const added = await redis.sadd(seenKey, t.id);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await emit({ id: t.id, type: "thread", threadName: t.name, parentId: t.parent_id, ownerId: t.owner_id, guildId }, t.id);
  }
}

async function pollMembers(cfg, botToken, scope, emit) {
  const { guildId } = cfg;
  if (!guildId) return;
  const members = await discordGet(`/guilds/${guildId}/members?limit=100`, botToken);
  const seenKey = `bb:discord:seen:${scope}:member_joined`;
  // Seed-on-first-run: prime the seen-set without firing so only genuinely
  // new members trigger afterwards.
  const primed = await redis.exists(seenKey);
  for (const mem of members) {
    if (!mem.user?.id) continue;
    const added = await redis.sadd(seenKey, mem.user.id);
    await redis.expire(seenKey, SEEN_TTL);
    if (!added || !primed) continue;
    await emit(memberShape(mem, guildId), mem.user.id);
  }
}

async function pollGuildCount(eventType, cfg, botToken, scope, emit) {
  const { guildId } = cfg;
  if (!guildId) return;
  const g = await discordGet(`/guilds/${guildId}?with_counts=true`, botToken);
  const snapKey = `bb:discord:snap:${scope}:${eventType}`;
  const prevRaw = await redis.get(snapKey);
  const prev = prevRaw ? JSON.parse(prevRaw) : null;
  const cur = { members: g.approximate_member_count ?? 0, boosts: g.premium_subscription_count ?? 0 };
  await redis.set(snapKey, JSON.stringify(cur), "EX", SNAP_TTL);
  if (!prev) return;
  if (eventType === "boost_changed" && cur.boosts !== prev.boosts) {
    await emit({ id: `boost:${cur.boosts}`, type: "guild", guildId, guildName: g.name, boosts: cur.boosts, previousBoosts: prev.boosts, memberCount: cur.members }, `boost:${cur.boosts}`);
  }
  if (eventType === "member_count_over" && cur.members >= Number(cfg.targetValue || 0) && prev.members < Number(cfg.targetValue || 0)) {
    await emit({ id: `mc:${cur.members}`, type: "guild", guildId, guildName: g.name, memberCount: cur.members, threshold: Number(cfg.targetValue || 0) }, `mc:${cur.members}`);
  }
}

const EVENT_KIND = {
  message_created: "message", message_with_link: "message", message_with_file: "message",
  message_with_embed: "message", message_mentions: "message", message_from_bot: "message",
  message_from_human: "message", message_contains: "message", message_pinned: "message",
  thread_created: "thread", member_joined: "member",
  boost_changed: "guild", member_count_over: "guild",
};

export async function pollDiscord(automationId, triggerNodeId, cfg) {
  const scope = triggerNodeId || automationId;
  const lockKey = `bb:discord:lock:${scope}`;
  const locked = await acquireLock(lockKey, "poller", 60);
  if (!locked) return;

  try {
    const botToken = cfg.botToken;
    if (!botToken) return;
    const eventType = cfg.eventType || cfg.watchType || "message_created";
    const kind = EVENT_KIND[eventType] || "message";

    const automation = await Automation.findOne({ _id: automationId, active: true });
    if (!automation) return;
    const { executeAutomation } = await import("../modules/automation/automation.executor.js");

    const emit = async (payload, dedup) => {
      try {
        await executeAutomation(automation, { ...payload, eventType }, {
          workspaceId: automation.workspaceId,
          entryNodeId: triggerNodeId || automation.entryNodeId,
          idempotencyKey: `discord:${scope}:${eventType}:${dedup}`,
        });
      } catch (err) {
        console.error(`[DiscordPoller] Failed for "${automation.name}":`, err.message);
      }
    };

    if (kind === "message") await pollMessages(eventType, cfg, botToken, scope, emit);
    else if (kind === "thread") await pollThreads(cfg, botToken, scope, emit);
    else if (kind === "member") await pollMembers(cfg, botToken, scope, emit);
    else if (kind === "guild") await pollGuildCount(eventType, cfg, botToken, scope, emit);
  } catch (err) {
    console.warn(`[DiscordPoller] Error for ${automationId}:`, err.message);
  } finally {
    await releaseLock(lockKey, "poller");
  }
}
