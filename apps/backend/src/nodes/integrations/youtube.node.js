import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE_URL = "https://www.googleapis.com/youtube/v3";

async function getKey(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "YouTube");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "searchVideos";

    if (!config.credentialId) {
      return { success: false, error: "YouTube: credential required.", skipped: true };
    }

    const apiKey = await getKey(config.credentialId, context.workspaceId);

    const api = axios.create({
      baseURL: BASE_URL,
      params: { key: apiKey },
    });

    switch (operation) {
      case "searchVideos": {
        if (!config.query) return { success: false, error: "YouTube: query required.", skipped: true };
        const { data } = await api.get("/search", {
          params: {
            part: "snippet",
            q: config.query,
            type: "video",
            maxResults: Number(config.maxResults) || 10,
            order: config.order || "relevance",
          },
        });
        return { success: true, items: data.items, totalResults: data.pageInfo?.totalResults };
      }

      case "getVideo": {
        if (!config.videoId) return { success: false, error: "YouTube: videoId required.", skipped: true };
        const { data } = await api.get("/videos", {
          params: { part: "snippet,statistics,contentDetails", id: config.videoId },
        });
        return { success: true, ...data.items?.[0] };
      }

      case "listChannelVideos": {
        if (!config.channelId) return { success: false, error: "YouTube: channelId required.", skipped: true };
        const { data } = await api.get("/search", {
          params: {
            part: "snippet",
            channelId: config.channelId,
            type: "video",
            maxResults: Number(config.maxResults) || 20,
            order: config.order || "date",
          },
        });
        return { success: true, items: data.items, nextPageToken: data.nextPageToken };
      }

      case "getChannel": {
        if (!config.channelId) return { success: false, error: "YouTube: channelId required.", skipped: true };
        const { data } = await api.get("/channels", {
          params: { part: "snippet,statistics,brandingSettings", id: config.channelId },
        });
        return { success: true, ...data.items?.[0] };
      }

      case "listPlaylists": {
        if (!config.channelId) return { success: false, error: "YouTube: channelId required.", skipped: true };
        const { data } = await api.get("/playlists", {
          params: {
            part: "snippet,contentDetails",
            channelId: config.channelId,
            maxResults: Number(config.maxResults) || 20,
          },
        });
        return { success: true, items: data.items };
      }

      case "getComments": {
        if (!config.videoId) return { success: false, error: "YouTube: videoId required.", skipped: true };
        const { data } = await api.get("/commentThreads", {
          params: {
            part: "snippet",
            videoId: config.videoId,
            maxResults: Number(config.maxResults) || 20,
            order: config.order || "relevance",
          },
        });
        return { success: true, items: data.items };
      }

      default:
        return { success: false, error: `YouTube: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
