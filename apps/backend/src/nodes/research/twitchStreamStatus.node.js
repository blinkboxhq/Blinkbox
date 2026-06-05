import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const username = config.username || input?.username;
    const clientId = config.clientId || process.env.TWITCH_CLIENT_ID;
    const accessToken = config.accessToken || process.env.TWITCH_ACCESS_TOKEN;
    if (!username) return { success: false, error: "twitch_stream_status: 'username' is required.", skipped: true };
    if (!clientId || !accessToken) throw new Error("twitch_stream_status: TWITCH_CLIENT_ID and TWITCH_ACCESS_TOKEN required.");

    const res = await axios.get("https://api.twitch.tv/helix/streams", {
      params: { user_login: username },
      headers: { "Client-Id": clientId, Authorization: `Bearer ${accessToken}` },
      timeout: TIMEOUT,
    });
    const stream = res.data.data?.[0];
    if (!stream) return { username, isLive: false };
    return {
      username, isLive: true, title: stream.title, gameName: stream.game_name,
      viewerCount: stream.viewer_count, startedAt: stream.started_at,
      thumbnailUrl: stream.thumbnail_url?.replace("{width}x{height}", "640x360"),
    };
  },
};
