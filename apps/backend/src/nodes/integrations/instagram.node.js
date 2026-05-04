import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "getUserMedia";
    let token;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Instagram");
      token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!token) return { success: false, error: "Instagram: access token required (Meta for Developers).", skipped: true };

    const BASE = "https://graph.instagram.com/v18.0";
    const params = { access_token: token };

    switch (operation) {
      case "getUserInfo": {
        const { data } = await axios.get(`${BASE}/me`, { params: { ...params, fields: "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website" }, timeout: 10000 });
        return data;
      }
      case "getUserMedia": {
        const { data } = await axios.get(`${BASE}/me/media`, { params: { ...params, fields: "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink", limit: config.limit || 20 }, timeout: 15000 });
        return { media: data.data, cursor: data.paging?.cursors };
      }
      case "getMedia": {
        const id = config.mediaId || input.mediaId;
        if (!id) return { success: false, error: "Instagram getMedia: 'mediaId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/${id}`, { params: { ...params, fields: "id,caption,media_type,media_url,timestamp,like_count,comments_count,permalink" }, timeout: 10000 });
        return data;
      }
      case "createPost": {
        const imageUrl = config.imageUrl || input.imageUrl;
        const caption = config.caption || input.caption || "";
        if (!imageUrl) return { success: false, error: "Instagram createPost: 'imageUrl' required.", skipped: true };
        const userId = config.userId || input.userId;
        if (!userId) return { success: false, error: "Instagram createPost: 'userId' (Instagram user ID) required.", skipped: true };
        // Step 1: create container
        const { data: container } = await axios.post(`${BASE}/${userId}/media`, null, { params: { ...params, image_url: imageUrl, caption }, timeout: 15000 });
        // Step 2: publish
        const { data: published } = await axios.post(`${BASE}/${userId}/media_publish`, null, { params: { ...params, creation_id: container.id }, timeout: 15000 });
        return { id: published.id, success: true };
      }
      case "getComments": {
        const id = config.mediaId || input.mediaId;
        if (!id) return { success: false, error: "Instagram getComments: 'mediaId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/${id}/comments`, { params: { ...params, fields: "id,text,timestamp,username", limit: config.limit || 20 }, timeout: 10000 });
        return { comments: data.data, total: data.data?.length };
      }
      default:
        return { success: false, error: `Instagram: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
