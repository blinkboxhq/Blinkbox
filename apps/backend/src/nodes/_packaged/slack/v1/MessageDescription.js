/**
 * Slack — message operations. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { API, slackCall } from "../GenericFunctions.js";

async function opPostMessage(config, token) {
  const channel = config.channel;
  const text = config.message || config.text;
  if (!channel) return { success: false, error: "Slack postMessage: 'channel' is required — configure this field.", skipped: true };
  if (!text) return { success: false, error: "Slack postMessage: 'text' is required — configure this field.", skipped: true };

  const payload = { channel, text, unfurl_links: config.unfurlLinks || false };
  if (config.username) payload.username = config.username;
  if (config.iconEmoji) payload.icon_emoji = config.iconEmoji;

  const data = await slackCall(token, "chat.postMessage", payload);
  return { ok: true, ts: data.ts, channel: data.channel, messageId: data.ts };
}

async function opPostRichMessage(config, token) {
  const channel = config.channel;
  if (!channel) return { success: false, error: "Slack postRichMessage: 'channel' is required — configure this field.", skipped: true };

  // blocks can be passed directly or assembled from simple fields
  let blocks = config.blocks;
  if (!blocks) {
    // Build a simple header + section from config.title and config.text
    blocks = [];
    if (config.title) {
      blocks.push({ type: "header", text: { type: "plain_text", text: config.title } });
    }
    if (config.text) {
      blocks.push({ type: "section", text: { type: "mrkdwn", text: config.text } });
    }
    if (config.fields && Array.isArray(config.fields)) {
      blocks.push({
        type: "section",
        fields: config.fields.map((f) => ({ type: "mrkdwn", text: typeof f === "string" ? f : `*${f.label}*\n${f.value}` })),
      });
    }
    if (config.buttonLabel && config.buttonUrl) {
      blocks.push({
        type: "actions",
        elements: [{
          type: "button",
          text: { type: "plain_text", text: config.buttonLabel },
          url: config.buttonUrl,
          style: config.buttonStyle || "primary",
        }],
      });
    }
  }

  if (!blocks || blocks.length === 0)
    return { success: false, error: "Slack postRichMessage: 'blocks' or at least 'text'/'title' is required — configure this field.", skipped: true };

  const payload = { channel, blocks, text: config.fallbackText || config.text || "New message" };
  const data = await slackCall(token, "chat.postMessage", payload);
  return { ok: true, ts: data.ts, channel: data.channel, messageId: data.ts };
}

async function opUpdateMessage(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  const text = config.message || config.text;
  if (!channel) return { success: false, error: "Slack updateMessage: 'channel' is required.", skipped: true };
  if (!ts) return { success: false, error: "Slack updateMessage: 'timestamp' (ts) is required.", skipped: true };
  if (!text && !config.blocks) return { success: false, error: "Slack updateMessage: 'text' or 'blocks' is required.", skipped: true };
  const payload = { channel, ts };
  if (text) payload.text = text;
  if (config.blocks) payload.blocks = config.blocks;
  const data = await slackCall(token, "chat.update", payload);
  return { ok: true, ts: data.ts, channel: data.channel };
}

async function opDeleteMessage(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  if (!channel) return { success: false, error: "Slack deleteMessage: 'channel' is required.", skipped: true };
  if (!ts) return { success: false, error: "Slack deleteMessage: 'timestamp' (ts) is required.", skipped: true };
  const data = await slackCall(token, "chat.delete", { channel, ts });
  return { ok: true, ts: data.ts, channel: data.channel, deleted: true };
}

async function opScheduleMessage(config, token) {
  const channel = config.channel;
  const text = config.message || config.text;
  const postAt = config.postAt;
  if (!channel) return { success: false, error: "Slack scheduleMessage: 'channel' is required.", skipped: true };
  if (!text) return { success: false, error: "Slack scheduleMessage: 'text' is required.", skipped: true };
  if (!postAt) return { success: false, error: "Slack scheduleMessage: 'postAt' (unix timestamp) is required.", skipped: true };
  const data = await slackCall(token, "chat.scheduleMessage", { channel, text, post_at: Number(postAt) });
  return { ok: true, scheduledMessageId: data.scheduled_message_id, channel: data.channel, postAt: data.post_at };
}

async function opPostEphemeral(config, token) {
  const channel = config.channel;
  const user = config.userId || config.user;
  const text = config.message || config.text;
  if (!channel) return { success: false, error: "Slack postEphemeral: 'channel' is required.", skipped: true };
  if (!user) return { success: false, error: "Slack postEphemeral: 'userId' is required.", skipped: true };
  if (!text) return { success: false, error: "Slack postEphemeral: 'text' is required.", skipped: true };
  const data = await slackCall(token, "chat.postEphemeral", { channel, user, text });
  return { ok: true, messageTs: data.message_ts };
}

async function opReplyInThread(config, token) {
  const channel = config.channel;
  const threadTs = config.threadTs || config.timestamp || config.ts;
  const text = config.message || config.text;
  if (!channel) return { success: false, error: "Slack replyInThread: 'channel' is required.", skipped: true };
  if (!threadTs) return { success: false, error: "Slack replyInThread: 'threadTs' (parent ts) is required.", skipped: true };
  if (!text) return { success: false, error: "Slack replyInThread: 'text' is required.", skipped: true };
  const payload = { channel, text, thread_ts: threadTs };
  if (config.broadcast) payload.reply_broadcast = true;
  const data = await slackCall(token, "chat.postMessage", payload);
  return { ok: true, ts: data.ts, channel: data.channel, threadTs };
}

async function opGetPermalink(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  if (!channel) return { success: false, error: "Slack getPermalink: 'channel' is required.", skipped: true };
  if (!ts) return { success: false, error: "Slack getPermalink: 'timestamp' (ts) is required.", skipped: true };
  const response = await axios.get(`${API}/chat.getPermalink`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { channel, message_ts: ts },
    timeout: 10000,
  });
  if (!response.data.ok) throw new Error(`Slack getPermalink: ${response.data.error}`);
  return { ok: true, permalink: response.data.permalink };
}

async function opAddReaction(config, token) {
  const channel = config.channel;
  const timestamp = config.timestamp || config.ts;
  const emoji = (config.emoji || "").replace(/:/g, "");
  if (!channel) return { success: false, error: "Slack addReaction: 'channel' is required — configure this field.", skipped: true };
  if (!timestamp) return { success: false, error: "Slack addReaction: 'timestamp' (message ts) is required — configure this field.", skipped: true };
  if (!emoji) return { success: false, error: "Slack addReaction: 'emoji' is required (e.g. 'thumbsup') — configure this field.", skipped: true };

  await slackCall(token, "reactions.add", { channel, timestamp, name: emoji });
  return { ok: true, emoji, channel, timestamp };
}

async function opRemoveReaction(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  const emoji = (config.emoji || "").replace(/:/g, "");
  if (!channel || !ts || !emoji) return { success: false, error: "Slack removeReaction: 'channel', 'timestamp' and 'emoji' are required.", skipped: true };
  await slackCall(token, "reactions.remove", { channel, timestamp: ts, name: emoji });
  return { ok: true, emoji, channel, timestamp: ts, removed: true };
}

async function opGetReactions(config, token) {
  const channel = config.channel;
  const ts = config.timestamp || config.ts;
  if (!channel || !ts) return { success: false, error: "Slack getReactions: 'channel' and 'timestamp' are required.", skipped: true };
  const response = await axios.get(`${API}/reactions.get`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { channel, timestamp: ts },
    timeout: 10000,
  });
  if (!response.data.ok) throw new Error(`Slack getReactions: ${response.data.error}`);
  const reactions = response.data.message?.reactions || [];
  return { ok: true, reactions: reactions.map((r) => ({ name: r.name, count: r.count, users: r.users })) };
}

export const messageOperations = {
  postMessage: opPostMessage,
  postRichMessage: opPostRichMessage,
  updateMessage: opUpdateMessage,
  deleteMessage: opDeleteMessage,
  scheduleMessage: opScheduleMessage,
  postEphemeral: opPostEphemeral,
  replyInThread: opReplyInThread,
  getPermalink: opGetPermalink,
  addReaction: opAddReaction,
  removeReaction: opRemoveReaction,
  getReactions: opGetReactions,
};
