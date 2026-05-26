import { google } from "googleapis";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export default {
  async run(config, input, context = {}) {
    const body = input?.body ?? input;

    // ── Pub/Sub push notification ──────────────────────────────────────────────
    // Gmail sends base64-encoded data in body.message.data when using Cloud Pub/Sub webhooks
    if (body?.message?.data) {
      const decoded  = Buffer.from(body.message.data, "base64").toString("utf-8");
      let notification;
      try { notification = JSON.parse(decoded); } catch { notification = { raw: decoded }; }

      // If we have an OAuth credential, fetch the actual email via Gmail API
      if (config?.credentialId) {
        try {
          const accessToken = await getOAuthToken(config.credentialId, context.workspaceId, "Gmail");
          const auth = new google.auth.OAuth2();
          auth.setCredentials({ access_token: accessToken });

          const gmail    = google.gmail({ version: "v1", auth });
          const userId   = notification.emailAddress || "me";
          const historyId = notification.historyId;

          if (historyId && config.startHistoryId) {
            const histRes = await gmail.users.history.list({
              userId, startHistoryId: config.startHistoryId,
              historyTypes: ["messageAdded"], maxResults: 10,
            });

            const messageIds = (histRes.data.history ?? [])
              .flatMap((h) => (h.messagesAdded ?? []).map((m) => m.message.id));

            if (messageIds.length > 0) {
              const msgRes = await gmail.users.messages.get({
                userId, id: messageIds[0], format: "full",
              });

              return parseGmailMessage(msgRes.data);
            }
          }

          return { emailAddress: notification.emailAddress, historyId, triggeredAt: new Date().toISOString() };
        } catch (err) {
          console.warn("[gmail_trigger] Gmail API fetch failed:", err.message);
        }
      }

      return { notification, triggeredAt: new Date().toISOString() };
    }

    // ── Pre-fetched email object (polling fallback) ────────────────────────────
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

  const body = extractBody(msg.payload);

  return {
    messageId:  msg.id,
    threadId:   msg.threadId,
    labelIds:   msg.labelIds ?? [],
    subject:    headers["subject"]  ?? "",
    from:       headers["from"]     ?? "",
    to:         headers["to"]       ?? "",
    cc:         headers["cc"]       ?? "",
    date:       headers["date"]     ?? "",
    snippet:    msg.snippet         ?? "",
    body:       body.text,
    bodyHtml:   body.html,
    hasAttachments: (msg.payload?.parts ?? []).some((p) => p.filename),
    internalDate: msg.internalDate ? new Date(parseInt(msg.internalDate)).toISOString() : null,
    raw:        msg,
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
