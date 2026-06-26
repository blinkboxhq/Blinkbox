import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const operation = config.operation || "postStatus";
    const rawInstance = config.instanceUrl || config.instance || "https://mastodon.social";
    const instance = rawInstance.replace(/^https?:\/\//, "");
    const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Mastodon"));
    if (!token) throw new Error("mastodon: access token required — set a credential.");

    await assertSafeUrlResolved(`https://${instance}`);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const base = `https://${instance}/api/v1`;

    try {
      if (operation === "postStatus" || operation === "post") {
        const status = config.status || config.text || input?.text;
        if (!status) return { success: false, error: "mastodon: 'status' text is required.", skipped: true };
        const body = { status: status.substring(0, 500), visibility: config.visibility || "public" };
        if (config.inReplyToId || config.replyToId) body.in_reply_to_id = config.inReplyToId || config.replyToId;
        if (config.spoilerText) body.spoiler_text = config.spoilerText;
        const res = await axios.post(`${base}/statuses`, body, { headers, timeout: 30000 });
        return { id: res.data.id, url: res.data.url, content: res.data.content, visibility: res.data.visibility };
      }
      if (operation === "deleteStatus") {
        const id = config.statusId || input?.id;
        if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
        await axios.delete(`${base}/statuses/${id}`, { headers, timeout: 15000 });
        return { deleted: true, id };
      }
      if (operation === "boostStatus") {
        const id = config.statusId || input?.id;
        if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
        const res = await axios.post(`${base}/statuses/${id}/reblog`, {}, { headers, timeout: 15000 });
        return { reblogged: true, id: res.data.id };
      }
      if (operation === "favouriteStatus") {
        const id = config.statusId || input?.id;
        if (!id) return { success: false, error: "mastodon: 'statusId' is required.", skipped: true };
        const res = await axios.post(`${base}/statuses/${id}/favourite`, {}, { headers, timeout: 15000 });
        return { favourited: true, id: res.data.id };
      }
      if (operation === "getTimeline" || operation === "timeline") {
        const res = await axios.get(`${base}/timelines/home`, { headers, params: { limit: parseInt(config.limit) || 20 }, timeout: 15000 });
        const posts = res.data.map((s) => ({ id: s.id, content: s.content, account: s.account.acct, createdAt: s.created_at, url: s.url, reblogsCount: s.reblogs_count, favouritesCount: s.favourites_count }));
        return { posts, count: posts.length };
      }
      if (operation === "searchAccounts") {
        const q = config.q || config.query || input?.query;
        if (!q) return { success: false, error: "mastodon: 'q' query is required.", skipped: true };
        const res = await axios.get(`${base}/accounts/search`, { headers, params: { q, limit: parseInt(config.limit) || 10 }, timeout: 15000 });
        return { accounts: res.data.map((a) => ({ id: a.id, username: a.username, displayName: a.display_name, url: a.url, followersCount: a.followers_count })), count: res.data.length };
      }
      if (operation === "followAccount" || operation === "follow") {
        const id = config.accountId || input?.id;
        if (!id) return { success: false, error: "mastodon: 'accountId' is required.", skipped: true };
        const res = await axios.post(`${base}/accounts/${id}/follow`, {}, { headers, timeout: 15000 });
        return { following: res.data.following, accountId: id };
      }
      throw new Error(`mastodon: Unknown operation "${operation}".`);
    } catch (err) {
      if (err.message.startsWith("mastodon:")) throw err;
      const status = err.response?.status;
      if (status === 401) throw new Error("mastodon: Unauthorized — check your access token.");
      if (status === 422) throw new Error(`mastodon: Unprocessable — ${err.response?.data?.error || err.message}`);
      throw new Error(`[mastodon] ${err.message}`);
    }
  },
};
