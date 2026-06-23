import { ImapFlow } from "imapflow";
import { getOAuthToken } from "../../../apps/backend/src/utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.emails) return input;
    let password = config.password;
    if (!password && config.credentialId) {
      password = await getOAuthToken(config.credentialId, config.workspaceId, "IMAP").catch(() => null);
    }
    const client = new ImapFlow({
      host: config.host || config.imapHost || "imap.gmail.com",
      port: parseInt(config.port || 993),
      secure: config.secure !== false,
      auth: { user: config.user || config.email || config.username, pass: password },
      logger: false,
      tls: { rejectUnauthorized: config.rejectUnauthorized !== false },
    });
    await client.connect();
    try {
      const folder = config.folder || config.mailbox || "INBOX";
      const lock = await client.getMailboxLock(folder);
      const emails = [];
      try {
        const limit = Math.min(config.limit || 10, 50);
        const onlyUnread = config.onlyUnread !== false;
        const criteria = onlyUnread ? ["UNSEEN"] : ["ALL"];
        if (config.since) criteria.push(["SINCE", new Date(config.since)]);
        const uids = await client.search(criteria.length === 1 ? criteria[0] : criteria, { uid: true });
        const fetchUids = uids.slice(-limit);
        for await (const msg of client.fetch(fetchUids.join(",") || "1:1", { envelope: true, bodyStructure: true, bodyParts: ["TEXT"], flags: true, uid: true })) {
          const env = msg.envelope;
          const body = msg.bodyParts?.get("TEXT") ? Buffer.from(msg.bodyParts.get("TEXT")).toString("utf8") : null;
          emails.push({
            uid: msg.uid, seq: msg.seq,
            subject: env?.subject,
            from: env?.from?.[0]?.address, fromName: env?.from?.[0]?.name,
            to: env?.to?.map(a => a.address), cc: env?.cc?.map(a => a.address),
            date: env?.date?.toISOString(),
            messageId: env?.messageId, inReplyTo: env?.inReplyTo,
            body: body?.replace(/<[^>]+>/g, "")?.slice(0, 2000),
            isRead: msg.flags?.has("\\Seen"),
            isFlagged: msg.flags?.has("\\Flagged"),
            hasAttachments: msg.bodyStructure?.childNodes?.length > 1,
          });
        }
      } finally { lock.release(); }
      await client.logout();
      return { folder, emails, count: emails.length, latestEmail: emails[emails.length - 1] ?? null, triggeredAt: new Date().toISOString() };
    } catch (err) {
      await client.logout().catch(() => {});
      throw new Error(`[imap_trigger] ${err.message}`);
    }
  },
};
