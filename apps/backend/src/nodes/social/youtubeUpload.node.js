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
    const videoUrl = config.videoUrl || input?.videoUrl || input?.url;
    const title = config.title || input?.title || "Untitled Video";
    const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Google"));
    if (!token) throw new Error("youtube_upload: Google OAuth access token required.");
    if (!videoUrl) return { success: false, error: "youtube_upload: 'videoUrl' is required.", skipped: true };

    const metadata = {
      snippet: { title, description: config.description || "", tags: config.tags || [], categoryId: config.categoryId || "22" },
      status: { privacyStatus: config.privacy || "private" },
    };

    const initRes = await axios.post(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      metadata,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Upload-Content-Type": "video/*" }, timeout: 30000 },
    );

    const uploadUrl = initRes.headers.location;
    await assertSafeUrlResolved(videoUrl);
    const videoRes = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 120000, maxRedirects: 0 });
    const uploadRes = await axios.put(uploadUrl, videoRes.data, {
      headers: { "Content-Type": "video/*", "Content-Length": videoRes.data.byteLength },
      timeout: 300000,
    });

    return { videoId: uploadRes.data.id, title: uploadRes.data.snippet?.title, url: `https://youtube.com/watch?v=${uploadRes.data.id}`, status: uploadRes.data.status?.uploadStatus };
  },
};
