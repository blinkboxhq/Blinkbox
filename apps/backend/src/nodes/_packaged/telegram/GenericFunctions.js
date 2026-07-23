/**
 * Telegram — shared helpers for all v1 action files.
 * Handlers receive `(config, token)` where `token` is the Bot Token string,
 * resolved by the backend entry (apps/backend/.../telegram.node.js) and passed
 * into every handler. Requests hit the Bot API at BASE_URL + token + method.
 */
import axios from "axios";

export const BASE_URL = "https://api.telegram.org/bot";

// Bot API URLs embed the token (`/bot<token>/method`); axios errors echo the URL.
export function redactToken(msg) {
  return String(msg ?? "").replace(/\/bot[^/\s"']+/g, "/bot<redacted>");
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function attachmentTooLarge(base64, op) {
  const bytes = Math.floor((String(base64).length * 3) / 4);
  if (bytes <= MAX_UPLOAD_BYTES) return null;
  return { success: false, error: `Telegram ${op}: attachment is ~${Math.round(bytes / 1048576)}MB — over the ${MAX_UPLOAD_BYTES / 1048576}MB upload limit.`, skipped: true };
}

export function handleError(err) {
  if (err.message.startsWith("Telegram")) throw err;
  if (err.response?.status === 401) throw new Error("Telegram: Invalid Bot Token.");
  if (err.response?.status === 400)
    throw new Error(`Telegram: Bad request — ${redactToken(err.response?.data?.description || err.message)}`);
  if (err.response?.status === 403)
    throw new Error("Telegram: Bot is not a member of this chat or was blocked.");
  if (err.response?.status === 404)
    throw new Error("Telegram: Bot Token is invalid or the API method was not found.");
  if (err.response?.status === 429) throw new Error("Telegram: Rate limit exceeded. Retry later.");
  if (err.response?.status === 500) throw new Error("Telegram: Telegram server error (500). Retry later.");
  if (err.code === "ECONNABORTED") throw new Error("Telegram: Request timed out.");
  throw new Error(`Telegram failed: ${err.response?.status || err.code} — ${redactToken(err.message)}`);
}

export function msgResult(data) {
  const msg = data.result;
  return {
    ok: data.ok,
    messageId: msg?.message_id,
    chat: {
      id: msg?.chat?.id,
      type: msg?.chat?.type,
      title: msg?.chat?.title || msg?.chat?.first_name,
    },
  };
}

export async function call(token, method, payload) {
  const response = await axios.post(
    `${BASE_URL}${token}/${method}`,
    payload,
    { headers: { "Content-Type": "application/json" }, timeout: 120000 },
  );
  const data = response.data;
  if (!data.ok) {
    const code = data.error_code;
    const desc = redactToken(data.description || "Unknown error");
    if (code === 401) throw new Error("Telegram: Invalid Bot Token.");
    if (code === 400) throw new Error(`Telegram: Bad request — ${desc}`);
    if (code === 403) throw new Error(`Telegram: Forbidden — ${desc}`);
    if (code === 404) throw new Error(`Telegram: Not found — ${desc}`);
    if (code === 429) throw new Error("Telegram: Rate limit exceeded. Retry later.");
    throw new Error(`Telegram API error ${code}: ${desc}`);
  }
  return data;
}

export function requireChat(config, op) {
  const chatId = typeof config.chatId === "string" ? config.chatId.trim() : (config.chatId != null ? String(config.chatId) : "");
  if (!chatId) return { _err: { success: false, error: `Telegram ${op}: 'chatId' is required.`, skipped: true } };
  return { chatId };
}

export async function sendMediaByUrlOrInline(config, token, method, field, mimeDefault, fileNameDefault) {
  const { chatId, _err } = requireChat(config, method);
  if (_err) return _err;

  if (config._inlineAttachment?.dataUrl) {
    const { dataUrl, mimeType, name } = config._inlineAttachment;
    const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const tooBig = attachmentTooLarge(base64Data, method);
    if (tooBig) return tooBig;
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(field, new Blob([Buffer.from(base64Data, "base64")], { type: mimeType || mimeDefault }), name || fileNameDefault);
    if (config.caption) form.append("caption", config.caption);
    const res = await axios.post(`${BASE_URL}${token}/${method}`, form, { timeout: 120000 });
    return msgResult(res.data);
  }

  const url = config.fileUrl || config.url || config[field + "Url"];
  if (!url) return { success: false, error: `Telegram ${method}: a file URL or attachment is required.`, skipped: true };
  if (!/^https?:\/\//i.test(url)) throw new Error(`Telegram ${method}: file URL must be http/https.`);

  const payload = { chat_id: chatId, [field]: url, disable_notification: config.silent || false };
  if (config.caption) payload.caption = config.caption;
  if (config.parseMode && config.parseMode !== "plain") payload.parse_mode = config.parseMode;
  if (config.duration) payload.duration = Number(config.duration);
  if (config.title) payload.title = config.title;
  if (config.performer) payload.performer = config.performer;
  return msgResult(await call(token, method, payload));
}
