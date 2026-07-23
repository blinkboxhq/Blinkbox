import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const text = config.text || config.tweet || input?.text || input?.tweet;
    if (!text) return { success: false, error: "twitter_post: 'text' is required.", skipped: true };
    const token = config.bearerToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Twitter"));
    if (!token) throw new Error("twitter_post: Twitter Bearer Token required.");

    const body = { text: text.substring(0, 280) };
    if (config.replyToId) body.reply = { in_reply_to_tweet_id: config.replyToId };
    if (config.mediaIds?.length) body.media = { media_ids: config.mediaIds };

    const res = await axios.post("https://api.twitter.com/2/tweets", body, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 120000,
    });
    return { tweetId: res.data.data?.id, text: res.data.data?.text, url: `https://twitter.com/i/web/status/${res.data.data?.id}` };
  },
};
