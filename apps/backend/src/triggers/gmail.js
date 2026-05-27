import axios from "axios";
import { getOAuthToken } from "../utils/getOAuthToken.js";

export default {
  async run(config, input, context = {}) {
    const body = input?.body ?? input;

    // ── Pub/Sub push notification ──────────────────────────────────────────────
    // Gmail push notifications arrive as base64-encoded JSON in body.message.data
    if (body?.message?.data) {
      const decoded = Buffer.from(body.message.data, "base64").toString("utf-8");
      let notification;
      try { notification = JSON.parse(decoded); } catch { notification = { raw: decoded }; }

      if (config?.credentialId && notification?.historyId && config?.startHistoryId) {
        try {
          const accessToken = await getOAuthToken(config.credentialId, context.workspaceId, "Gmail");
          const userId = notification.emailAddress || "me";

          const histRes = await axios.get(
            `https://gmail.googleapis.com/gmail/v1/users/${userId}/history`,
            {
              params: { startHistoryId: config.startHistoryId, historyTypes: "messageAdded", maxResults: 10 },
              headers: { Authorization: `Bearer ${accessToken}` },
              timeout: 10000,
            }
          );

          const messageIds = (histRes.data.history ?? [])
            .flatMap((h) => (h.messagesAdded ?? []).map((m) => m.message.id));

          if (messageIds.length > 0) {
            const msgRes = await axios.get(
              `https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/${messageIds[0]}`,
              {
                params: { format: "full" },
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000,
              }
            );
            return parseGmailMessage(msgRes.data);
          }
        } catch (err) {
          console.warn("[gmail_trigger] Gmail API fetch failed:", err.message);
        }
      }

      return { notification, triggeredAt: new Date().toISOString() };
    }

    // ── Pre-fetched email object (polling path) ───────────────────────────────
    if (body?.id && body?.payload) {
      return parseGmailMessage(body);
    }

    return { ...body, triggeredAt: new Date().toISOString() };
  },
};

function parseGmailMessage(msg) {
  const headers = Object.fromEntries(
    (msg.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])
  );
  const bodyContent = extractBody(msg.payload);
  return {
    messageId:     msg.id,
    threadId:      msg.threadId,
    labelIds:      msg.labelIds ?? [],
    subject:       headers["subject"]  ?? "",
    from:          headers["from"]     ?? "",
    to:            headers["to"]       ?? "",
    cc:            headers["cc"]       ?? "",
    date:          headers["date"]     ?? "",
    snippet:       msg.snippet         ?? "",
    body:          bodyContent.text,
    bodyHtml:      bodyContent.html,
    hasAttachments: (msg.payload?.parts ?? []).some((p) => p.filename),
    internalDate:  msg.internalDate ? new Date(parseInt(msg.internalDate)).toISOString() : null,
    raw:           msg,
  };
}

function extractBody(payload) {
  if (!payload) return { text: "", html: "" };
  if (payload.mimeType === "text/plain") return { text: Buffer.from(payload.body?.data ?? "", "base64").toString("utf-8"), html: "" };
  if (payload.mimeType === "text/html")  return { text: "", html: Buffer.from(payload.body?.data ?? "", "base64").toString("utf-8") };
  if (payload.parts) {
    let text = ""; let html = "";
    for (const p of payload.parts) {
      const child = extractBody(p);
      if (child.text) text = child.text;
      if (child.html) html = child.html;
    }
    return { text, html };
  }
  return { text: "", html: "" };
}
