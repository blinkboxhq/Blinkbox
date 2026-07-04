/**
 * Realtime Hub — push delivery for triggers that support it.
 *
 * Where the poller hub wakes up on a timer, this hub holds persistent
 * connections so events fire in ~1 second:
 *   telegram — getUpdates long-poll loop (one per bot token; Telegram allows a
 *              single getUpdates consumer, so the poll-hub entry is disabled)
 *   discord  — Gateway WebSocket per bot token (message/thread/member events;
 *              guild-count events stay on the 1-min poll)
 *   slack    — Socket Mode WebSocket per app-level token (opt-in via the
 *              trigger's App Token field; polling stays on as fallback)
 *   imap     — IDLE connection per mailbox that pokes pollMailbox on new mail
 *              (polling stays on as fallback)
 *
 * Dedup safety: discord/slack/imap reuse the exact seen-set keys and dedup
 * tokens of their pollers, so realtime + poll fallback never double-fire.
 */
import crypto from "node:crypto";
import { redis } from "./redis.client.js";
import Automation from "../models/automation.model.js";
import { findAutomationsWithTrigger, getTriggerNodesOfType, getTriggerConfig } from "./triggerNodes.util.js";
import { getOAuthToken } from "../utils/getOAuthToken.js";
import { resolveSecret } from "../utils/resolveSecret.js";
import { assertSafeHost } from "../utils/ssrf.js";
import { TELEGRAM_EVENTS, shape as telegramShape } from "./telegram.poller.js";
import { MESSAGE_EVENTS, messageShape, memberShape } from "./discord.poller.js";
import { SLACK_EVENTS } from "./slack.poller.js";
import { pollMailbox } from "./imap.poller.js";

const OFFSET_TTL = 30 * 24 * 60 * 60;
const SEEN_TTL = 30 * 24 * 60 * 60;
const MAX_IMAP_CONNS = 50;
const lc = (s) => String(s ?? "").toLowerCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tokenHash = (t) => crypto.createHash("sha1").update(String(t)).digest("hex").slice(0, 16);

async function fire(sub, payload, idempotencyKey) {
  const automation = await Automation.findOne({ _id: sub.automationId, active: true });
  if (!automation) return;
  const { executeAutomation } = await import("../modules/automation/automation.executor.js");
  try {
    await executeAutomation(automation, payload, {
      workspaceId: automation.workspaceId,
      entryNodeId: sub.nodeId || automation.entryNodeId,
      idempotencyKey,
    });
  } catch (err) {
    console.error(`[RealtimeHub] Execute failed for "${automation.name}":`, err.message);
  }
}

// ── Telegram: getUpdates long-poll ─────────────────────────────────────────────

const telegramLoops = new Map();

async function tgCall(botToken, method, params = "") {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}${params}`, {
    signal: AbortSignal.timeout(65000),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram: ${data.description || `HTTP ${res.status}`}`);
  return data.result;
}

async function dispatchTelegramUpdate(u, subscribers) {
  for (const sub of subscribers) {
    const eventType = sub.cfg.eventType || sub.cfg.watchType || "message";
    const spec = TELEGRAM_EVENTS[eventType] || TELEGRAM_EVENTS.message;
    const m = spec.msg(u);
    if (m === undefined) continue;
    if (!spec.match(u, m, { targetValue: sub.cfg.targetValue })) continue;
    const scope = sub.nodeId || sub.automationId;
    await fire(sub, telegramShape(u, eventType), `telegram:${scope}:${eventType}:${u.update_id}`);
  }
}

async function runTelegramLoop(token, loop) {
  const offsetKey = `bb:telegram:rt:offset:${tokenHash(token)}`;
  let offset = parseInt(await redis.get(offsetKey)) || 0;
  if (!offset) {
    // First run: confirm the backlog so historical updates don't replay.
    try {
      const latest = await tgCall(token, "getUpdates", "?offset=-1&limit=1&timeout=0");
      if (latest.length) offset = latest[latest.length - 1].update_id + 1;
      await redis.set(offsetKey, String(offset), "EX", OFFSET_TTL);
    } catch { /* fall through — the main loop handles errors */ }
  }

  let backoff = 1000;
  while (loop.running) {
    try {
      const updates = await tgCall(token, "getUpdates", `?timeout=50&limit=100&offset=${offset}`);
      backoff = 1000;
      if (!loop.running) break;
      if (!updates.length) continue;
      offset = updates[updates.length - 1].update_id + 1;
      await redis.set(offsetKey, String(offset), "EX", OFFSET_TTL);
      for (const u of updates) await dispatchTelegramUpdate(u, loop.subscribers);
    } catch (err) {
      if (!loop.running) break;
      if (/webhook/i.test(err.message)) {
        // A stale webhook blocks getUpdates — activation intent here is long-poll.
        await tgCall(token, "deleteWebhook").catch(() => {});
      } else {
        console.warn(`[RealtimeHub/telegram] loop error:`, err.message);
      }
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60000);
    }
  }
}

async function syncTelegram() {
  const automations = await findAutomationsWithTrigger("telegram_trigger");
  const byToken = new Map();
  for (const automation of automations) {
    for (const node of getTriggerNodesOfType(automation, "telegram_trigger")) {
      const cfg = getTriggerConfig(node);
      if (!cfg.botToken) continue;
      const workspaceId = automation.workspaceId?.toString();
      let token = cfg.botToken;
      try {
        token = await getOAuthToken(cfg.botToken, workspaceId, "Telegram trigger");
      } catch { /* literal token stored directly */ }
      if (!byToken.has(token)) byToken.set(token, []);
      byToken.get(token).push({
        automationId: automation._id.toString(),
        nodeId: node.id,
        cfg: { ...cfg, workspaceId },
      });
    }
  }

  for (const [token, loop] of telegramLoops) {
    if (!byToken.has(token)) {
      loop.running = false;
      telegramLoops.delete(token);
    }
  }
  for (const [token, subs] of byToken) {
    const existing = telegramLoops.get(token);
    if (existing) {
      existing.subscribers = subs;
      continue;
    }
    const loop = { running: true, subscribers: subs };
    telegramLoops.set(token, loop);
    runTelegramLoop(token, loop).catch((err) => {
      console.error(`[RealtimeHub/telegram] loop crashed:`, err.message);
      telegramLoops.delete(token);
    });
  }
}

// ── Discord: Gateway WebSocket ─────────────────────────────────────────────────

const discordConns = new Map();
const INTENTS_FULL = 1 | 2 | 512 | 32768; // GUILDS | GUILD_MEMBERS | GUILD_MESSAGES | MESSAGE_CONTENT
const INTENTS_BASIC = 1 | 512;

async function onDiscordMessage(d, subscribers) {
  for (const sub of subscribers) {
    const cfg = sub.cfg;
    const eventType = cfg.eventType || cfg.watchType || "message_created";
    const pred = MESSAGE_EVENTS[eventType];
    // message_pinned only shows on re-fetch, never on MESSAGE_CREATE — leave polled.
    if (!pred || eventType === "message_pinned") continue;
    if (!cfg.channelId || String(cfg.channelId) !== String(d.channel_id)) continue;
    if (!pred(d, cfg)) continue;
    const scope = sub.nodeId || sub.automationId;
    const seenKey = `bb:discord:seen:${scope}:${eventType}`;
    const added = await redis.sadd(seenKey, d.id);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await fire(sub, messageShape(d, d.channel_id), `discord:${scope}:${eventType}:${d.id}`);
  }
}

async function onDiscordThread(d, subscribers) {
  for (const sub of subscribers) {
    const cfg = sub.cfg;
    if ((cfg.eventType || cfg.watchType) !== "thread_created") continue;
    if (cfg.guildId && String(cfg.guildId) !== String(d.guild_id)) continue;
    if (cfg.channelId && String(cfg.channelId) !== String(d.parent_id)) continue;
    const scope = sub.nodeId || sub.automationId;
    const seenKey = `bb:discord:seen:${scope}:thread_created`;
    const added = await redis.sadd(seenKey, d.id);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await fire(
      sub,
      { id: d.id, type: "thread", threadName: d.name, parentId: d.parent_id, ownerId: d.owner_id, guildId: d.guild_id },
      `discord:${scope}:thread_created:${d.id}`,
    );
  }
}

async function onDiscordMember(d, subscribers) {
  for (const sub of subscribers) {
    const cfg = sub.cfg;
    if ((cfg.eventType || cfg.watchType) !== "member_joined") continue;
    if (!cfg.guildId || String(cfg.guildId) !== String(d.guild_id)) continue;
    if (!d.user?.id) continue;
    const scope = sub.nodeId || sub.automationId;
    const seenKey = `bb:discord:seen:${scope}:member_joined`;
    // The poller primes this set on first run; until then let it own the baseline
    // so a lone realtime insert doesn't make the whole member list look "new".
    const primed = await redis.exists(seenKey);
    if (!primed) continue;
    const added = await redis.sadd(seenKey, d.user.id);
    if (!added) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await fire(sub, memberShape(d, d.guild_id), `discord:${scope}:member_joined:${d.user.id}`);
  }
}

async function startDiscordGateway(token, conn) {
  let WebSocket;
  try {
    ({ default: WebSocket } = await import("ws"));
  } catch {
    console.error("[RealtimeHub/discord] 'ws' package not installed — Discord realtime disabled");
    conn.running = false;
    return;
  }

  const connect = () => {
    if (!conn.running) return;
    const base = conn.sessionId && conn.resumeUrl ? conn.resumeUrl : "wss://gateway.discord.gg";
    const sock = new WebSocket(`${base}/?v=10&encoding=json`);
    conn.ws = sock;

    const handlePacket = async (p) => {
      if (p.s) conn.seq = p.s;
      if (p.op === 10) {
        conn.acked = true;
        clearInterval(conn.hb);
        conn.hb = setInterval(() => {
          if (sock.readyState !== 1) return;
          if (!conn.acked) return sock.terminate(); // zombie connection
          conn.acked = false;
          sock.send(JSON.stringify({ op: 1, d: conn.seq }));
        }, p.d.heartbeat_interval);
        if (conn.sessionId) {
          sock.send(JSON.stringify({ op: 6, d: { token, session_id: conn.sessionId, seq: conn.seq } }));
        } else {
          sock.send(JSON.stringify({
            op: 2,
            d: { token, intents: conn.intents, properties: { os: "linux", browser: "blinkbox", device: "blinkbox" } },
          }));
        }
      } else if (p.op === 11) {
        conn.acked = true;
      } else if (p.op === 1) {
        sock.send(JSON.stringify({ op: 1, d: conn.seq }));
      } else if (p.op === 7) {
        sock.close(4000);
      } else if (p.op === 9) {
        if (!p.d) conn.sessionId = null;
        sock.close(4000);
      } else if (p.op === 0) {
        conn.backoff = 1000;
        if (p.t === "READY") {
          conn.sessionId = p.d.session_id;
          conn.resumeUrl = p.d.resume_gateway_url;
        } else if (p.t === "MESSAGE_CREATE") {
          await onDiscordMessage(p.d, conn.subscribers);
        } else if (p.t === "THREAD_CREATE") {
          await onDiscordThread(p.d, conn.subscribers);
        } else if (p.t === "GUILD_MEMBER_ADD") {
          await onDiscordMember(p.d, conn.subscribers);
        }
      }
    };

    sock.on("message", (raw) => {
      let p;
      try { p = JSON.parse(raw); } catch { return; }
      handlePacket(p).catch((err) => console.error("[RealtimeHub/discord] dispatch error:", err.message));
    });
    sock.on("error", () => {});
    sock.on("close", (code) => {
      clearInterval(conn.hb);
      if (!conn.running) return;
      if (code === 4004) {
        console.error("[RealtimeHub/discord] invalid bot token — gateway stopped for this bot");
        conn.running = false;
        return;
      }
      if (code === 4014 && conn.intents !== INTENTS_BASIC) {
        console.warn("[RealtimeHub/discord] privileged intents disallowed — reconnecting without MESSAGE_CONTENT/GUILD_MEMBERS. Enable them in the Discord developer portal for full realtime coverage.");
        conn.intents = INTENTS_BASIC;
        conn.sessionId = null;
      }
      if (code === 4007 || code === 4009) conn.sessionId = null;
      setTimeout(connect, conn.backoff);
      conn.backoff = Math.min(conn.backoff * 2, 60000);
    });
  };

  connect();
}

async function syncDiscord() {
  const automations = await findAutomationsWithTrigger("discord_trigger");
  const byToken = new Map();
  for (const automation of automations) {
    for (const node of getTriggerNodesOfType(automation, "discord_trigger")) {
      const cfg = getTriggerConfig(node);
      if (!cfg.botToken) continue;
      const workspaceId = automation.workspaceId?.toString();
      let token;
      try {
        token = await resolveSecret(cfg.botToken, workspaceId, "Discord trigger");
      } catch {
        continue;
      }
      if (!byToken.has(token)) byToken.set(token, []);
      byToken.get(token).push({ automationId: automation._id.toString(), nodeId: node.id, cfg });
    }
  }

  for (const [token, conn] of discordConns) {
    if (!byToken.has(token)) {
      conn.running = false;
      clearInterval(conn.hb);
      conn.ws?.close();
      discordConns.delete(token);
    }
  }
  for (const [token, subs] of byToken) {
    const existing = discordConns.get(token);
    if (existing) {
      existing.subscribers = subs;
      continue;
    }
    const conn = {
      running: true, subscribers: subs, ws: null, hb: null,
      seq: null, sessionId: null, resumeUrl: null, acked: true,
      intents: INTENTS_FULL, backoff: 1000,
    };
    discordConns.set(token, conn);
    startDiscordGateway(token, conn).catch((err) => {
      console.error("[RealtimeHub/discord] gateway start failed:", err.message);
      discordConns.delete(token);
    });
  }
}

// ── Slack: Socket Mode ─────────────────────────────────────────────────────────

const slackConns = new Map();

async function onSlackEvent(ev, subscribers) {
  if (ev?.type !== "message") return;
  if (ev.subtype === "message_changed" || ev.subtype === "message_deleted") return;
  const m = {
    ts: String(ev.ts || ""),
    text: ev.text || "",
    user: ev.user || ev.bot_id || "",
    subtype: ev.subtype || "",
    isBot: !!ev.bot_id || ev.subtype === "bot_message",
    threadTs: ev.thread_ts || "",
    isThreadReply: !!ev.thread_ts && ev.thread_ts !== ev.ts,
    replyCount: 0,
    reactionCount: 0,
    reactions: [],
    hasFile: Array.isArray(ev.files) && ev.files.length > 0,
  };
  for (const sub of subscribers) {
    const cfg = sub.cfg;
    if (!cfg.channel || cfg.channel !== ev.channel) continue;
    const eventType = cfg.eventType || cfg.watchType || "new_message";
    const spec = SLACK_EVENTS[eventType];
    // reaction/reply-count events need snapshot diffs — the poller keeps those.
    if (!spec || spec.needsPrev || spec.changeAware) continue;
    if (!spec.match(m, null, cfg)) continue;
    const dedup = spec.dedup(m);
    const scope = sub.nodeId || sub.automationId;
    const seenKey = `bb:slack:seen:${scope}:${eventType}`;
    const fresh = await redis.sadd(seenKey, dedup);
    if (!fresh) continue;
    await redis.expire(seenKey, SEEN_TTL);
    await fire(sub, {
      ts: m.ts, text: m.text, user: m.user, channel: ev.channel,
      isBot: m.isBot, threadTs: m.threadTs, replyCount: m.replyCount,
      reactionCount: m.reactionCount, reactions: m.reactions, hasFile: m.hasFile,
    }, `slack:${scope}:${eventType}:${dedup}`);
  }
}

async function runSlackSocket(appToken, conn) {
  let WebSocket;
  try {
    ({ default: WebSocket } = await import("ws"));
  } catch {
    console.error("[RealtimeHub/slack] 'ws' package not installed — Slack Socket Mode disabled");
    conn.running = false;
    return;
  }

  let backoff = 2000;
  while (conn.running) {
    try {
      const res = await fetch("https://slack.com/api/apps.connections.open", {
        method: "POST",
        headers: { Authorization: `Bearer ${appToken}`, "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`apps.connections.open: ${data.error || "failed"}`);

      await new Promise((resolve) => {
        const sock = new WebSocket(data.url);
        conn.ws = sock;
        sock.on("open", () => { backoff = 2000; });
        sock.on("message", (raw) => {
          let env;
          try { env = JSON.parse(raw); } catch { return; }
          // Socket Mode requires an ack within 3s or Slack redelivers.
          if (env.envelope_id && sock.readyState === 1) {
            sock.send(JSON.stringify({ envelope_id: env.envelope_id }));
          }
          if (env.type === "disconnect") return sock.close();
          if (env.type === "events_api") {
            onSlackEvent(env.payload?.event, conn.subscribers)
              .catch((err) => console.error("[RealtimeHub/slack] dispatch error:", err.message));
          }
        });
        sock.on("error", () => {});
        sock.on("close", resolve);
      });
    } catch (err) {
      if (!conn.running) break;
      if (/invalid_auth|not_allowed_token_type|forbidden/i.test(err.message)) {
        console.error(`[RealtimeHub/slack] app token rejected (${err.message}) — Socket Mode stopped for this app`);
        conn.running = false;
        break;
      }
      console.warn("[RealtimeHub/slack] socket error:", err.message);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60000);
    }
  }
}

async function syncSlack() {
  const automations = await findAutomationsWithTrigger("slack_trigger");
  const byToken = new Map();
  for (const automation of automations) {
    for (const node of getTriggerNodesOfType(automation, "slack_trigger")) {
      const cfg = getTriggerConfig(node);
      if (!cfg.appToken || !cfg.channel) continue;
      const workspaceId = automation.workspaceId?.toString();
      let appToken = cfg.appToken;
      if (!String(appToken).startsWith("xapp-")) {
        try {
          appToken = await resolveSecret(cfg.appToken, workspaceId, "Slack Socket Mode");
        } catch { /* literal token */ }
      }
      if (!byToken.has(appToken)) byToken.set(appToken, []);
      byToken.get(appToken).push({ automationId: automation._id.toString(), nodeId: node.id, cfg });
    }
  }

  for (const [appToken, conn] of slackConns) {
    if (!byToken.has(appToken)) {
      conn.running = false;
      conn.ws?.close();
      slackConns.delete(appToken);
    }
  }
  for (const [appToken, subs] of byToken) {
    const existing = slackConns.get(appToken);
    if (existing) {
      existing.subscribers = subs;
      continue;
    }
    const conn = { running: true, subscribers: subs, ws: null };
    slackConns.set(appToken, conn);
    runSlackSocket(appToken, conn).catch((err) => {
      console.error("[RealtimeHub/slack] socket crashed:", err.message);
      slackConns.delete(appToken);
    });
  }
}

// ── IMAP: IDLE ─────────────────────────────────────────────────────────────────

const imapConns = new Map();

async function runImapIdle(scope, conn) {
  let backoff = 5000;
  while (conn.running) {
    let client = null;
    try {
      const { cfg } = conn.sub;
      await assertSafeHost(cfg.imapHost);
      let password = "";
      if (cfg.credentialId) {
        const { resolveCredential } = await import("../modules/credentials/credential.service.js");
        const cred = await resolveCredential(cfg.credentialId);
        password = cred?.value || cred?.password || "";
      }
      const { ImapFlow } = await import("imapflow");
      client = new ImapFlow({
        host: cfg.imapHost,
        port: parseInt(cfg.imapPort) || 993,
        secure: true,
        auth: { user: cfg.imapUser, pass: password },
        logger: false,
      });
      await client.connect();
      await client.mailboxOpen(cfg.mailbox || "INBOX");
      conn.client = client;
      backoff = 5000;

      // pollMailbox owns locking, UID watermark, and dedup — the IDLE connection
      // is only a doorbell.
      const poke = () => {
        clearTimeout(conn.pokeTimer);
        conn.pokeTimer = setTimeout(() => {
          pollMailbox(conn.sub.automationId, conn.sub.nodeId, cfg, password)
            .catch((err) => console.error("[RealtimeHub/imap] poke poll failed:", err.message));
        }, 1200);
      };
      client.on("exists", poke);
      poke(); // catch anything that arrived while disconnected

      await new Promise((resolve) => {
        client.once("close", resolve);
        client.once("error", resolve);
      });
    } catch (err) {
      if (conn.running) console.warn(`[RealtimeHub/imap] ${scope}:`, err.message);
    } finally {
      clearTimeout(conn.pokeTimer);
      try { await client?.logout(); } catch { /* already closed */ }
    }
    if (!conn.running) break;
    await sleep(backoff);
    backoff = Math.min(backoff * 2, 5 * 60 * 1000);
  }
}

async function syncImap() {
  const automations = await findAutomationsWithTrigger("imap_trigger");
  const desired = new Map();
  for (const automation of automations) {
    for (const node of getTriggerNodesOfType(automation, "imap_trigger")) {
      const cfg = getTriggerConfig(node);
      if (!cfg.imapHost || !cfg.imapUser) continue;
      if (desired.size >= MAX_IMAP_CONNS) {
        console.warn(`[RealtimeHub/imap] connection cap (${MAX_IMAP_CONNS}) reached — remaining mailboxes stay on polling`);
        break;
      }
      const scope = node.id || automation._id.toString();
      desired.set(scope, { automationId: automation._id.toString(), nodeId: node.id, cfg });
    }
  }

  for (const [scope, conn] of imapConns) {
    if (!desired.has(scope)) {
      conn.running = false;
      try { conn.client?.close(); } catch { /* noop */ }
      imapConns.delete(scope);
    }
  }
  for (const [scope, sub] of desired) {
    const existing = imapConns.get(scope);
    if (existing) {
      existing.sub = sub;
      continue;
    }
    const conn = { running: true, sub, client: null, pokeTimer: null };
    imapConns.set(scope, conn);
    runImapIdle(scope, conn).catch((err) => {
      console.error("[RealtimeHub/imap] idle loop crashed:", err.message);
      imapConns.delete(scope);
    });
  }
}

// ── Sync / lifecycle ───────────────────────────────────────────────────────────

let syncing = false;
let pendingSync = false;

export async function syncRealtimeHub() {
  if (syncing) {
    pendingSync = true;
    return;
  }
  syncing = true;
  try {
    const results = await Promise.allSettled([syncTelegram(), syncDiscord(), syncSlack(), syncImap()]);
    for (const r of results) {
      if (r.status === "rejected") console.error("[RealtimeHub] sync error:", r.reason?.message || r.reason);
    }
  } finally {
    syncing = false;
    if (pendingSync) {
      pendingSync = false;
      syncRealtimeHub().catch(console.error);
    }
  }
}

export async function startRealtimeHub() {
  await syncRealtimeHub();
  // Drift repair: automation edits trigger explicit syncs, but a periodic pass
  // recovers from missed signals and multi-instance races.
  setInterval(() => syncRealtimeHub().catch(console.error), 5 * 60 * 1000).unref();
  console.log(`[RealtimeHub] Ready — telegram=${telegramLoops.size} discord=${discordConns.size} slack=${slackConns.size} imap=${imapConns.size} live connections`);
}

export async function stopRealtimeHub() {
  for (const loop of telegramLoops.values()) loop.running = false;
  telegramLoops.clear();
  for (const conn of discordConns.values()) {
    conn.running = false;
    clearInterval(conn.hb);
    conn.ws?.close();
  }
  discordConns.clear();
  for (const conn of slackConns.values()) {
    conn.running = false;
    conn.ws?.close();
  }
  slackConns.clear();
  for (const conn of imapConns.values()) {
    conn.running = false;
    try { conn.client?.close(); } catch { /* noop */ }
  }
  imapConns.clear();
}
