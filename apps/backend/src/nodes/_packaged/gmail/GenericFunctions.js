/**
 * Gmail — shared helpers for all v1 resource files.
 * Gmail is an OAuth2 Google API. Handlers receive `(config, token)` where token
 * is the resolved OAuth2 access-token string; they call `axios` directly against
 * BASE with the Bearer auth() header. makeReq(token) is the identity passthrough
 * the slim entry uses to preserve that exact calling convention.
 */
import axios from "axios";

export const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export function handleError(err) {
  if (err.message.startsWith("Gmail")) throw err;
  const status = err.response?.status;
  const apiMsg = err.response?.data?.error?.message || err.message;
  if (status === 401 || status === 403) throw new Error(`Gmail: Auth failed (${status}) — ${apiMsg}. Re-connect your Google account.`);
  if (status === 404) throw new Error(`Gmail: Message or resource not found — ${apiMsg}`);
  if (status === 400) throw new Error(`Gmail: Bad request — ${apiMsg}`);
  if (status === 429) throw new Error("Gmail: Rate limit exceeded. Slow down requests or enable exponential backoff.");
  if (status === 422) throw new Error(`Gmail: Unprocessable request — ${apiMsg}`);
  if (status >= 500) throw new Error(`Gmail: Google server error (${status}) — ${apiMsg}. Retry later.`);
  throw new Error(`Gmail: ${status || err.code || "Error"} — ${apiMsg}`);
}

export function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

export function toBase64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Build a RFC 2822 email, base64url-encoded.
// Supports file attachments via config.attachments: [{dataUrl, mimeType, name}]
export function buildRawEmail({ to, from, subject, body, html, replyTo, inReplyTo, references, attachments }) {
  const boundary = `bb_boundary_${Date.now().toString(36)}`;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const bodyContentType = html ? "text/html" : "text/plain";

  const headers = [
    `From: ${from || "me"}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    references ? `References: ${references}` : null,
    `Subject: ${subject || ""}`,
    `MIME-Version: 1.0`,
    hasAttachments
      ? `Content-Type: multipart/mixed; boundary="${boundary}"`
      : `Content-Type: ${bodyContentType}; charset=UTF-8`,
    "",
  ].filter((l) => l !== null).join("\r\n");

  if (!hasAttachments) {
    return toBase64url(Buffer.from(headers + "\r\n" + (body || "")));
  }

  const bodyPart = [
    `--${boundary}`,
    `Content-Type: ${bodyContentType}; charset=UTF-8`,
    "",
    body || "",
  ].join("\r\n");

  const attachParts = attachments.map((a) => {
    const base64Data = a.dataUrl.includes(",") ? a.dataUrl.split(",")[1] : a.dataUrl;
    const filename = a.name || "attachment";
    return [
      `--${boundary}`,
      `Content-Type: ${a.mimeType || "application/octet-stream"}; name="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      base64Data,
    ].join("\r\n");
  });

  const raw = [headers, bodyPart, ...attachParts, `--${boundary}--`].join("\r\n");
  return toBase64url(Buffer.from(raw));
}

// modifyLabels is a shared helper used across Message/Label resource handlers.
export async function modifyLabels(config, token, add, remove) {
  if (!config.messageId) return { success: false, error: "Gmail: 'messageId' is required.", skipped: true };
  const response = await axios.post(`${BASE}/messages/${encodeURIComponent(config.messageId)}/modify`, {
    addLabelIds: add,
    removeLabelIds: remove,
  }, {
    headers: { ...auth(token), "Content-Type": "application/json" },
    timeout: 10000,
  });
  return { messageId: config.messageId, labelIds: response.data.labelIds };
}

// Gmail passes the resolved OAuth2 token string straight through to handlers.
export function makeReq(token) {
  return token;
}
