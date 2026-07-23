/**
 * Discord — shared helpers for all v1 resource files.
 * Two transports: webhook handlers receive `(config)` only (no auth); Bot REST
 * handlers receive `(config, token)` where token is the raw Bot token string.
 * makeReq(token) is the identity passthrough the slim entry uses to preserve
 * that exact calling convention.
 */
import axios from "axios";

export const API = "https://discord.com/api/v10";
export const DISCORD_WEBHOOK_RE = /^https:\/\/discord\.com\/api\/webhooks\//;

// Encodes interpolated values only — keeps literal "/" separators, kills path traversal.
export function p(strings, ...values) {
  return strings.reduce(
    (acc, s, i) => acc + s + (i < values.length ? encodeURIComponent(String(values[i])) : ""),
    ""
  );
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function attachmentTooLarge(base64, op) {
  const bytes = Math.floor((String(base64).length * 3) / 4);
  if (bytes <= MAX_UPLOAD_BYTES) return null;
  return { success: false, error: `Discord ${op}: attachment is ~${Math.round(bytes / 1048576)}MB — over the ${MAX_UPLOAD_BYTES / 1048576}MB upload limit.`, skipped: true };
}

export function validateWebhook(url) {
  if (!url) return { success: false, error: "Discord: 'webhookUrl' is required.", skipped: true };
  if (!DISCORD_WEBHOOK_RE.test(url))
    throw new Error("Discord: Invalid webhook URL. Must start with https://discord.com/api/webhooks/");
}

// The segment after /webhooks/ is the id; the one after THAT is the secret
// token — returning the wrong one leaks it into execution output.
export function webhookId(url) {
  return String(url).replace(DISCORD_WEBHOOK_RE, "").split(/[/?#]/)[0] || null;
}

export async function post(webhookUrl, payload) {
  const response = await axios.post(webhookUrl, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 120000,
    validateStatus: null,
  });

  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  const errMsg = response.data?.message || response.statusText || "Unknown error";
  const errCode = response.data?.code || response.status;

  if (response.status === 401 || response.status === 403)
    throw new Error(`Discord: Webhook unauthorized (${errCode}). It may have been deleted — recreate it in Server Settings → Integrations.`);
  if (response.status === 404)
    throw new Error("Discord: Webhook not found. It may have been deleted.");
  if (response.status === 429)
    throw new Error("Discord: Rate limit exceeded. Add a Delay node or reduce frequency.");
  if (response.status === 400)
    throw new Error(`Discord: Bad request — ${errMsg}`);
  throw new Error(`Discord failed: ${response.status} — ${errMsg}`);
}

export async function bot(token, method, path, data, params) {
  const response = await axios({
    method,
    url: `${API}${path}`,
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    data,
    params,
    timeout: 120000,
    validateStatus: null,
  });
  if (response.status >= 200 && response.status < 300) return response.data;
  const msg = response.data?.message || response.statusText || "Unknown error";
  if (response.status === 401) throw new Error("Discord: Invalid or expired Bot token.");
  if (response.status === 403) throw new Error(`Discord: Bot lacks permission (403) — ${msg}. Check the bot's role permissions.`);
  if (response.status === 404) throw new Error(`Discord: Not found (404) — ${msg}.`);
  if (response.status === 429) throw new Error("Discord: Rate limit exceeded. Add a Delay node or reduce frequency.");
  if (response.status === 400) throw new Error(`Discord: Bad request — ${msg}`);
  throw new Error(`Discord failed: ${response.status} — ${msg}`);
}

export function need(config, fields, op) {
  for (const f of fields) {
    if (!config[f]) return { success: false, error: `Discord ${op}: '${f}' is required.`, skipped: true };
  }
  return null;
}

export function buildEmbed(config) {
  const embed = {};
  if (config.title) embed.title = config.title;
  if (config.description) embed.description = config.description;
  if (config.url) embed.url = config.url;
  embed.color = config.color !== undefined
    ? (typeof config.color === "string" ? parseInt(config.color.replace("#", ""), 16) : config.color)
    : 0x5865F2;
  if (config.thumbnailUrl) embed.thumbnail = { url: config.thumbnailUrl };
  if (config.imageUrl) embed.image = { url: config.imageUrl };
  if (config.footerText) embed.footer = { text: config.footerText, icon_url: config.footerIconUrl };
  if (config.authorName) embed.author = { name: config.authorName, url: config.authorUrl, icon_url: config.authorIconUrl };
  if (config.timestamp !== false) embed.timestamp = new Date().toISOString();
  if (Array.isArray(config.fields) && config.fields.length > 0) {
    embed.fields = config.fields.slice(0, 25).map((f) => ({
      name: String(f.name || "Field").substring(0, 256),
      value: String(f.value || "​").substring(0, 1024),
      inline: f.inline !== false,
    }));
  }
  return embed;
}

// Webhook-transport error wrapper (moved verbatim from the monolith entry).
export function handleWebhookError(err) {
  if (err.message.startsWith("Discord")) throw err;
  throw new Error(`Discord failed: ${err.code || "UNKNOWN"} — ${err.message}`);
}

// Bot-transport error wrapper (moved verbatim from the monolith entry).
export function handleError(err) {
  if (err.message.startsWith("Discord")) throw err;
  if (err.code === "ECONNABORTED") throw new Error("Discord: Request timed out.");
  throw new Error(`Discord failed: ${err.response?.status || err.code} — ${err.message}`);
}

// Discord passes the resolved Bot token string straight through to handlers.
export function makeReq(token) {
  return token;
}
