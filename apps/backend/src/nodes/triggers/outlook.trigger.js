import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.emails) return input;
    if (input?.subject && input?.from) return normalizeEmail(input);
    const token = await getOAuthToken(config.credentialId, config.workspaceId, "Outlook");
    const headers = { Authorization: `Bearer ${token}` };
    const params = {
      $top: Math.min(config.maxResults || 10, 50),
      $orderby: "receivedDateTime desc",
      $select: "id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,flag,internetMessageId,conversationId,categories",
    };
    if (config.folder) params.$search = undefined;
    if (config.filter) params.$filter = config.filter;
    if (config.onlyUnread) params.$filter = (params.$filter ? `${params.$filter} and ` : "") + "isRead eq false";
    const folder = config.folder || "inbox";
    const url = folder === "inbox" ? "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages" : `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages`;
    const { data } = await axios.get(url, { headers, params, timeout: 15000 });
    const emails = (data?.value ?? []).map(normalizeEmail);
    return { folder, emails, count: emails.length, latestEmail: emails[0] ?? null, triggeredAt: new Date().toISOString() };
  },
};

function normalizeEmail(e) {
  return {
    id: e?.id, internetMessageId: e?.internetMessageId, conversationId: e?.conversationId,
    subject: e?.subject, preview: e?.bodyPreview,
    body: e?.body?.content, bodyType: e?.body?.contentType,
    from: e?.from?.emailAddress?.address, fromName: e?.from?.emailAddress?.name,
    to: (e?.toRecipients ?? []).map(r => r.emailAddress?.address),
    cc: (e?.ccRecipients ?? []).map(r => r.emailAddress?.address),
    isRead: e?.isRead, hasAttachments: e?.hasAttachments,
    importance: e?.importance, flag: e?.flag?.flagStatus,
    categories: e?.categories ?? [],
    receivedAt: e?.receivedDateTime, sentAt: e?.sentDateTime,
  };
}
