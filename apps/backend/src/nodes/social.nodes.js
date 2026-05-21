import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

function assertSafeUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error(`Invalid URL: "${rawUrl}"`); }
  const h = u.hostname.toLowerCase();
  const blocked = [
    /^localhost$/, /^127\./, /^0\.0\.0\.0$/, /^::1$/, /^0:0:0:0:0:0:0:1$/,
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./, /^fc00:/i, /^fe80:/i, /^fd/i,
    /\.internal$/, /\.local$/,
  ];
  if (blocked.some(r => r.test(h))) throw new Error(`SSRF blocked: "${h}" is a private/internal address.`);
}

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

// ── twitter_post ──────────────────────────────────────────────────────────────
export const twitter_post = {
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
      timeout: 30000,
    });
    return { tweetId: res.data.data?.id, text: res.data.data?.text, url: `https://twitter.com/i/web/status/${res.data.data?.id}` };
  },
};

// ── linkedin_post ─────────────────────────────────────────────────────────────
export const linkedin_post = {
  async run(config, input, context) {
    const text = config.text || config.content || input?.text;
    if (!text) return { success: false, error: "linkedin_post: 'text' is required.", skipped: true };
    const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "LinkedIn"));
    if (!token) throw new Error("linkedin_post: LinkedIn OAuth access token required.");

    // Get author URN
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

// ── youtube_upload ────────────────────────────────────────────────────────────
export const youtube_upload = {
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
    assertSafeUrl(videoUrl);
    const videoRes = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 120000, maxRedirects: 0 });
    const uploadRes = await axios.put(uploadUrl, videoRes.data, {
      headers: { "Content-Type": "video/*", "Content-Length": videoRes.data.byteLength },
      timeout: 300000,
    });

    return { videoId: uploadRes.data.id, title: uploadRes.data.snippet?.title, url: `https://youtube.com/watch?v=${uploadRes.data.id}`, status: uploadRes.data.status?.uploadStatus };
  },
};

// ── discord_role_assign ───────────────────────────────────────────────────────
export const discord_role_assign = {
  async run(config, input, context) {
    const operation = config.operation || "add";
    const guildId = config.guildId || input?.guildId;
    const userId = config.userId || input?.userId;
    const roleId = config.roleId || input?.roleId;
    const token = config.botToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Discord"));
    if (!token) throw new Error("discord_role_assign: Discord Bot Token required.");
    if (!guildId || !userId || !roleId) return { success: false, error: "discord_role_assign: 'guildId', 'userId', and 'roleId' are required.", skipped: true };

    const headers = { Authorization: `Bot ${token}` };
    const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`;

    if (operation === "add") {
      await axios.put(url, {}, { headers, timeout: 15000 });
      return { userId, roleId, guildId, action: "added" };
    }
    if (operation === "remove") {
      await axios.delete(url, { headers, timeout: 15000 });
      return { userId, roleId, guildId, action: "removed" };
    }
    throw new Error(`discord_role_assign: Unknown operation "${operation}". Use: add, remove`);
  },
};

// ── mastodon ──────────────────────────────────────────────────────────────────
export const mastodon = {
  async run(config, input, context) {
    const operation = config.operation || "post";
    const instance = (config.instance || "mastodon.social").replace(/^https?:\/\//, "");
    const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Mastodon"));
    if (!token) throw new Error("mastodon: Mastodon access token required.");

    assertSafeUrl(`https://${instance}`);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const base = `https://${instance}/api/v1`;

    if (operation === "post") {
      const status = config.status || config.text || input?.text;
      if (!status) return { success: false, error: "mastodon: 'status' text is required.", skipped: true };
      const res = await axios.post(`${base}/statuses`, { status: status.substring(0, 500), visibility: config.visibility || "public", in_reply_to_id: config.replyToId || null }, { headers, timeout: 30000 });
      return { id: res.data.id, url: res.data.url, text: res.data.content };
    }
    if (operation === "timeline") {
      const res = await axios.get(`${base}/timelines/home`, { headers, params: { limit: config.limit || 20 } });
      return { posts: res.data.map((s) => ({ id: s.id, content: s.content, account: s.account.acct, createdAt: s.created_at, url: s.url })), count: res.data.length };
    }
    if (operation === "follow") {
      const res = await axios.post(`${base}/accounts/${config.accountId}/follow`, {}, { headers, timeout: 15000 });
      return { following: res.data.following, accountId: config.accountId };
    }
    throw new Error(`mastodon: Unknown operation "${operation}".`);
  },
};

// ── imap ──────────────────────────────────────────────────────────────────────
export const imap = {
  async run(config, input, context) {
    const host = config.host || input?.host;
    const user = config.user || config.email || input?.user;
    const password = config.password || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "IMAP"));
    if (!host || !user || !password) return { success: false, error: "imap: 'host', 'user', and 'password' are required.", skipped: true };

    let Imap;
    try { Imap = (await import("imap")).default; } catch { throw new Error("imap: 'imap' package not installed. Run: npm install imap"); }

    return new Promise((resolve, reject) => {
      const client = new Imap({ user, password, host, port: parseInt(config.port || 993), tls: config.tls !== false, tlsOptions: { rejectUnauthorized: false } });
      const messages = [];

      client.once("ready", () => {
        client.openBox(config.mailbox || "INBOX", true, (err) => {
          if (err) { client.end(); return reject(new Error(`imap: ${err.message}`)); }
          const criteria = config.unseen ? ["UNSEEN"] : ["ALL"];
          client.search(criteria, (err2, results) => {
            if (err2) { client.end(); return reject(new Error(`imap: ${err2.message}`)); }
            const ids = results.slice(-parseInt(config.limit || 10));
            if (!ids.length) { client.end(); return resolve({ messages: [], count: 0 }); }
            const f = client.fetch(ids, { bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"], struct: true });
            f.on("message", (msg) => {
              const mail = {};
              msg.on("body", (stream, info) => {
                let buf = "";
                stream.on("data", (chunk) => buf += chunk.toString());
                stream.once("end", () => {
                  if (info.which.includes("HEADER")) {
                    const lines = buf.split("\r\n");
                    for (const line of lines) {
                      if (line.startsWith("From:")) mail.from = line.slice(5).trim();
                      else if (line.startsWith("To:")) mail.to = line.slice(3).trim();
                      else if (line.startsWith("Subject:")) mail.subject = line.slice(8).trim();
                      else if (line.startsWith("Date:")) mail.date = line.slice(5).trim();
                    }
                  } else { mail.body = buf.substring(0, 2000); }
                });
              });
              msg.once("end", () => messages.push(mail));
            });
            f.once("end", () => { client.end(); resolve({ messages, count: messages.length }); });
          });
        });
      });
      client.once("error", (err) => reject(new Error(`imap: ${err.message}`)));
      client.connect();
    });
  },
};

// ── email (generic send) ──────────────────────────────────────────────────────
export const email = {
  async run(config, input, context) {
    const to = config.to || input?.to;
    const subject = config.subject || input?.subject || "No Subject";
    const body = config.body || config.html || input?.body || input?.html || input?.text || "";
    if (!to) return { success: false, error: "email: 'to' is required.", skipped: true };

    // Try SendGrid first
    const sgKey = config.apiKey || process.env.SENDGRID_API_KEY || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "SendGrid").catch(() => null));
    if (sgKey) {
      const res = await axios.post("https://api.sendgrid.com/v3/mail/send", {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.from || process.env.FROM_EMAIL || "noreply@blinkbox.io" },
        subject,
        content: [{ type: config.html ? "text/html" : "text/plain", value: body }],
      }, { headers: { Authorization: `Bearer ${sgKey}` }, timeout: 30000 });
      return { sent: true, to, subject, provider: "sendgrid", statusCode: res.status };
    }

    throw new Error("email: Configure an email credential (SendGrid API key) to send emails.");
  },
};

// ── file_upload ───────────────────────────────────────────────────────────────
export const file_upload = {
  async run(config, input, context) {
    const destination = config.destination || "s3";
    const base64 = config.base64 || input?.base64;
    const url = config.url || input?.url;
    const filename = config.filename || input?.filename || "upload";
    const contentType = config.contentType || input?.contentType || "application/octet-stream";

    if (destination === "http") {
      const uploadUrl = config.uploadUrl || input?.uploadUrl;
      if (!uploadUrl) throw new Error("file_upload: 'uploadUrl' required for HTTP destination.");
      assertSafeUrl(uploadUrl);
      const buffer = base64 ? Buffer.from(base64, "base64") : null;
      if (!buffer) throw new Error("file_upload: 'base64' required.");
      const res = await axios.put(uploadUrl, buffer, {
        headers: { "Content-Type": contentType, "Content-Length": buffer.length },
        timeout: 120000,
      });
      return { success: true, destination: "http", url: uploadUrl, status: res.status, filename };
    }

    if (destination === "s3") {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const bucket = config.bucket || input?.bucket;
      const key = config.key || filename;
      if (!bucket) throw new Error("file_upload: 'bucket' required for S3.");
      const apiKey = config.credentialId && await getKey(config.credentialId, context?.workspaceId, "AWS");
      const [accessKeyId, secretAccessKey] = apiKey ? apiKey.split(":") : [config.accessKeyId, config.secretAccessKey];
      const client = new S3Client({ region: config.region || "us-east-1", credentials: { accessKeyId, secretAccessKey } });
      const buffer = Buffer.from(base64, "base64");
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
      return { success: true, destination: "s3", bucket, key, url: `https://${bucket}.s3.amazonaws.com/${key}`, filename };
    }

    throw new Error(`file_upload: unsupported destination "${destination}". Use "s3" or "http".`);
  },
};

// ── file_download ─────────────────────────────────────────────────────────────
export const file_download = {
  async run(config, input) {
    const url = config.url || input?.url;
    if (!url) return { success: false, error: "file_download: 'url' is required.", skipped: true };

    assertSafeUrl(url);
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: parseInt(config.timeout || 60000),
      maxContentLength: parseInt(config.maxSizeMb || 50) * 1024 * 1024,
      maxRedirects: 0,
    });
    if (res.status >= 301 && res.status <= 308 && res.headers.location) {
      const next = new URL(res.headers.location, url).toString();
      assertSafeUrl(next);
      const res2 = await axios.get(next, { responseType: "arraybuffer", timeout: parseInt(config.timeout || 60000), maxContentLength: parseInt(config.maxSizeMb || 50) * 1024 * 1024, maxRedirects: 4 });
      Object.assign(res, { data: res2.data, headers: res2.headers });
    }

    const contentType = res.headers["content-type"] || "application/octet-stream";
    const base64 = Buffer.from(res.data).toString("base64");
    const filename = config.filename || url.split("/").pop()?.split("?")[0] || "file";

    return {
      filename, contentType, base64,
      size: res.data.byteLength,
      dataUri: `data:${contentType};base64,${base64}`,
      url,
    };
  },
};

// ── webhook_response ──────────────────────────────────────────────────────────
export const webhook_response = {
  async run(config, input) {
    const statusCode = parseInt(config.statusCode || 200);
    const body = config.body || input?.body || input || {};
    const headers = config.headers || {};
    return { __webhookResponse: true, statusCode, body, headers };
  },
};

// ── game_event_webhook ────────────────────────────────────────────────────────
export const game_event_webhook = {
  async run(config, input) {
    const body = input?.body ?? input;
    return {
      event: body?.event || body?.type || "unknown",
      playerId: body?.playerId || body?.player_id,
      gameId: body?.gameId || body?.game_id,
      data: body?.data || body,
      timestamp: body?.timestamp || new Date().toISOString(),
      triggerType: "game_event",
    };
  },
};
