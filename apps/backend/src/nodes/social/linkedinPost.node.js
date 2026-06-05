import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const text = config.text || config.content || input?.text;
    if (!text) return { success: false, error: "linkedin_post: 'text' is required.", skipped: true };
    const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "LinkedIn"));
    if (!token) throw new Error("linkedin_post: LinkedIn OAuth access token required.");

    const profileRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const authorUrn = `urn:li:person:${profileRes.data.sub}`;

    const body = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": config.visibility || "PUBLIC" },
    };

    const res = await axios.post("https://api.linkedin.com/v2/ugcPosts", body, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
      timeout: 30000,
    });
    return { postId: res.headers["x-restli-id"], authorUrn };
  },
};
