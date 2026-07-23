/**
 * Reddit — shared primitives. Credential resolution (client_credentials OAuth2
 * app-only token exchange), error mapping, and thin axios wrappers over the
 * oauth.reddit.com API. Handlers receive a client object: { headers }.
 *
 * Auth: Reddit app clientId/clientSecret (stored as JSON or raw via
 * getOAuthToken), exchanged for a short-lived app-only bearer token.
 */
import axios from "axios";
import { getOAuthToken } from "../../../utils/getOAuthToken.js";

export const BASE = "https://oauth.reddit.com";
export const USER_AGENT = "BlinkBox/1.0";

export function handleError(err) {
  if (err.message?.startsWith("Reddit")) throw err;
  const status = err.response?.status;
  if (status === 401 || status === 403) throw new Error("Reddit: Unauthorized — check OAuth credentials.");
  if (status === 429) throw new Error("Reddit: Rate limited — add a Delay node.");
  if (status === 404) throw new Error("Reddit: Not found — check subreddit/post ID.");
  throw new Error(`Reddit: ${status ?? "Network"} error — ${err.message}`);
}

/** Resolve the vaulted credential into { clientId, clientSecret }. */
export async function resolveCredential(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Reddit");
  try {
    const j = JSON.parse(raw);
    return { clientId: j.clientId, clientSecret: j.clientSecret };
  } catch {
    return { clientId: raw, clientSecret: undefined };
  }
}

/** Exchange app credentials for a short-lived app-only bearer token. */
export async function getRedditToken(clientId, clientSecret) {
  try {
    const { data } = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      { auth: { username: clientId, password: clientSecret }, headers: { "User-Agent": USER_AGENT }, timeout: 120000 },
    );
    return data.access_token;
  } catch (e) {
    throw new Error(`Reddit: Failed to obtain OAuth token — ${e.message}`);
  }
}

export function buildClient(token) {
  return { headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT } };
}

export function boundLimit(val, def = 25) {
  const n = Number(val);
  if (isNaN(n) || n <= 0) return def;
  return Math.min(n, 100);
}

/** GET a JSON endpoint. Returns res.data. */
export async function get(client, path, { params, timeout = 120000 } = {}) {
  const { data } = await axios.get(`${BASE}${path}`, {
    headers: client.headers,
    ...(params ? { params } : {}),
    timeout,
  });
  return data;
}

/** POST a urlencoded form body. Returns res.data. */
export async function postForm(client, path, form, { timeout = 120000 } = {}) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) {
    if (v !== undefined && v !== null) body.append(k, String(v));
  }
  const { data } = await axios.post(`${BASE}${path}`, body, {
    headers: { ...client.headers, "Content-Type": "application/x-www-form-urlencoded" },
    timeout,
  });
  return data;
}

/** Map a Reddit listing child into a compact post shape. */
export function mapPost(c) {
  const d = c.data;
  return {
    id: d.id,
    name: d.name,
    title: d.title,
    url: d.url,
    permalink: d.permalink ? `https://reddit.com${d.permalink}` : undefined,
    body: d.selftext,
    score: d.score,
    upvoteRatio: d.upvote_ratio,
    comments: d.num_comments,
    author: d.author,
    subreddit: d.subreddit,
    flair: d.link_flair_text,
    nsfw: d.over_18,
    stickied: d.stickied,
    created: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
  };
}

/** Map a Reddit comment child into a compact comment shape. */
export function mapComment(c) {
  const d = c.data;
  return {
    id: d.id,
    name: d.name,
    author: d.author,
    body: d.body,
    score: d.score,
    subreddit: d.subreddit,
    permalink: d.permalink ? `https://reddit.com${d.permalink}` : undefined,
    created: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
  };
}
