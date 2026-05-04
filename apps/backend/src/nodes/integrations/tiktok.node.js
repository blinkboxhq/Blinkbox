import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "getUserInfo";
    let token;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "TikTok");
      token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!token) return { success: false, error: "TikTok: OAuth access token required.", skipped: true };

    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const BASE = "https://open.tiktokapis.com/v2";

    switch (operation) {
      case "getUserInfo": {
        const { data } = await axios.post(`${BASE}/user/info/`, { fields: ["open_id","union_id","avatar_url","display_name","bio_description","follower_count","following_count","likes_count","video_count"] }, { headers, timeout: 10000 });
        return data.data?.user || data;
      }
      case "listVideos": {
        const { data } = await axios.post(`${BASE}/video/list/`, { max_count: config.limit || 20, fields: ["id","title","video_description","create_time","like_count","comment_count","share_count","view_count","embed_link"] }, { headers, timeout: 15000 });
        return { videos: data.data?.videos || [], cursor: data.data?.cursor };
      }
      case "getVideo": {
        const id = config.videoId || input.videoId;
        if (!id) return { success: false, error: "TikTok getVideo: 'videoId' required.", skipped: true };
        const { data } = await axios.post(`${BASE}/video/query/`, { video_ids: [id], fields: ["id","title","video_description","create_time","like_count","comment_count","share_count","view_count","embed_link"] }, { headers, timeout: 10000 });
        return data.data?.videos?.[0] || data;
      }
      case "searchVideos": {
        const q = config.query || input.query || "";
        if (!q) return { success: false, error: "TikTok searchVideos: 'query' required.", skipped: true };
        const { data } = await axios.post(`${BASE}/research/video/search/`, { query: { and: [{ operation: "IN", field_name: "keyword", field_values: [q] }] }, max_count: config.limit || 20, fields: ["id","username","like_count","comment_count","view_count","create_time"] }, { headers: { ...headers, Authorization: `TT_ACCESS_TOKEN ${token}` }, timeout: 15000 });
        return { videos: data.data?.videos || [], searchId: data.data?.search_id };
      }
      default:
        return { success: false, error: `TikTok: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
