import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "getProfile";
    let token;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "LinkedIn");
      token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!token) return { success: false, error: "LinkedIn: OAuth token required.", skipped: true };

    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" };
    const BASE = "https://api.linkedin.com/v2";

    switch (operation) {
      case "getProfile": {
        const { data } = await axios.get(`${BASE}/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`, { headers, timeout: 10000 });
        const firstName = data.firstName?.localized?.en_US || "";
        const lastName = data.lastName?.localized?.en_US || "";
        return { id: data.id, name: `${firstName} ${lastName}`.trim(), firstName, lastName };
      }
      case "sharePost": {
        const text = config.text || config.content || input.text || "";
        if (!text) return { success: false, error: "LinkedIn sharePost: 'text' is required.", skipped: true };
        const { data: me } = await axios.get(`${BASE}/me`, { headers, timeout: 10000 });
        const authorUrn = `urn:li:person:${me.id}`;
        const post = { author: authorUrn, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": config.visibility || "PUBLIC" } };
        if (config.url) {
          post.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "ARTICLE";
          post.specificContent["com.linkedin.ugc.ShareContent"].media = [{ status: "READY", originalUrl: config.url, title: { text: config.title || "" }, description: { text: config.description || "" } }];
        }
        const { data } = await axios.post(`${BASE}/ugcPosts`, post, { headers, timeout: 15000 });
        return { id: data.id, success: true };
      }
      case "getCompany": {
        const id = config.companyId || input.companyId;
        if (!id) return { success: false, error: "LinkedIn getCompany: 'companyId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/organizations/${id}`, { headers, timeout: 10000 });
        return data;
      }
      case "getConnections": {
        const { data } = await axios.get(`${BASE}/connections?q=viewer&start=0&count=${config.limit || 50}`, { headers, timeout: 15000 });
        return { connections: data.elements, total: data.paging?.total };
      }
      default:
        return { success: false, error: `LinkedIn: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
