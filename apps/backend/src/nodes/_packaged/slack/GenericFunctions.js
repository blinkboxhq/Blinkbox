/**
 * Slack — shared helpers for all v1 action files.
 * Handlers are called `(config, token)` where `token` is the resolved Slack Bot
 * Token (xoxb-...). `slackCall` posts to a Web API method and throws on the
 * logical `{ ok: false, error }` responses Slack returns. `makeReq` returns the
 * token unchanged, preserving the monolith's `(config, token)` convention.
 */
import axios from "axios";

export const API = "https://slack.com/api";

export async function slackCall(token, method, payload) {
  let response;
  try {
    response = await axios.post(`${API}/${method}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      timeout: 15000,
    });
  } catch (err) {
    if (err.response?.status === 401) throw new Error("Slack: Invalid or expired Bot Token.");
    if (err.response?.status === 403) throw new Error("Slack: Bot lacks permission for this action. Check OAuth scopes.");
    if (err.response?.status === 429) throw new Error("Slack: Rate limit exceeded. Retry later.");
    if (err.response?.status === 404) throw new Error(`Slack: API method "${method}" not found.`);
    if (err.code === "ECONNABORTED") throw new Error("Slack: Request timed out.");
    throw new Error(`Slack HTTP error: ${err.response?.status || err.code} — ${err.message}`);
  }
  if (!response.data.ok) {
    const err = response.data.error || "unknown_error";
    if (err === "invalid_auth" || err === "not_authed") throw new Error("Slack: Invalid Bot Token.");
    if (err === "token_revoked") throw new Error("Slack: Bot Token has been revoked. Reconnect in Vault.");
    if (err === "channel_not_found") throw new Error("Slack: Channel not found. Use a channel ID (C...) or ensure the bot is invited.");
    if (err === "not_in_channel") throw new Error("Slack: Bot is not in this channel. Invite it with /invite @yourbot.");
    if (err === "cant_invite_self") throw new Error("Slack: Cannot invite the bot to a channel it's already in.");
    if (err === "already_in_channel") throw new Error("Slack: User is already a member of this channel.");
    if (err === "name_taken") throw new Error("Slack: A channel with that name already exists.");
    if (err === "message_not_found") throw new Error("Slack: Message not found — check the timestamp (ts) value.");
    if (err === "already_reacted") throw new Error("Slack: This reaction has already been added to the message.");
    if (err === "ratelimited") throw new Error("Slack: Rate limit exceeded. Retry later.");
    if (err === "missing_scope") throw new Error(`Slack: Missing OAuth scope for "${method}". Add it in your Slack App settings.`);
    throw new Error(`Slack API error: ${err}`);
  }
  return response.data;
}

export function makeReq(token) {
  return token;
}

export function handleError(err) {
  if (err.message.startsWith("Slack")) throw err;
  if (err.response?.status === 401) throw new Error("Slack: Invalid or expired Bot Token.");
  if (err.response?.status === 403) throw new Error("Slack: Bot lacks permission for this action. Check OAuth scopes.");
  if (err.response?.status === 429) throw new Error("Slack: Rate limit exceeded. Retry later.");
  if (err.response?.status === 404) throw new Error("Slack: Resource not found (404).");
  if (err.response?.status === 500) throw new Error("Slack: Slack server error (500). Retry later.");
  if (err.code === "ECONNABORTED") throw new Error("Slack: Request timed out.");
  throw new Error(`Slack failed: ${err.response?.status || err.code} — ${err.message}`);
}
