import axios from "axios";
import { getOAuthToken } from "../../../apps/backend/src/utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.messages) return input;
    if (input?.body?.content && input?.from) return normalizeMessage(input);
    const b = input?.body ?? input;
    if (b?.text && b?.type === "message") return { event: "message", message: b?.text, channelId: config.channelId, teamId: config.teamId, triggeredAt: new Date().toISOString() };
    const token = await getOAuthToken(config.credentialId, config.workspaceId, "Microsoft Teams");
    const headers = { Authorization: `Bearer ${token}` };
    const teamId = config.teamId;
    const channelId = config.channelId;
    if (!teamId || !channelId) throw new Error("[teams_trigger] teamId and channelId are required");
    const { data } = await axios.get(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
      { headers, params: { $top: Math.min(config.maxResults || 10, 50) }, timeout: 15000 }
    );
    const messages = (data?.value ?? []).map(normalizeMessage);
    return { teamId, channelId, messages, count: messages.length, latestMessage: messages[0] ?? null, triggeredAt: new Date().toISOString() };
  },
};

function normalizeMessage(m) {
  return {
    id: m?.id, messageType: m?.messageType, etag: m?.etag,
    body: m?.body?.content?.replace(/<[^>]+>/g, "") || m?.body?.content, bodyType: m?.body?.contentType,
    subject: m?.subject, summary: m?.summary,
    from: m?.from?.user?.displayName, fromEmail: m?.from?.user?.email, fromId: m?.from?.user?.id,
    channelIdentity: m?.channelIdentity, teamId: m?.channelIdentity?.teamId, channelId: m?.channelIdentity?.channelId,
    reactions: (m?.reactions ?? []).map(r => ({ type: r.reactionType, count: r.count })),
    attachments: (m?.attachments ?? []).map(a => ({ name: a.name, contentType: a.contentType, contentUrl: a.contentUrl })),
    mentions: (m?.mentions ?? []).map(mn => ({ id: mn.mentioned?.user?.id, name: mn.mentioned?.user?.displayName })),
    importance: m?.importance, locale: m?.locale,
    createdAt: m?.createdDateTime, editedAt: m?.lastEditedDateTime, deletedAt: m?.deletedDateTime,
  };
}
