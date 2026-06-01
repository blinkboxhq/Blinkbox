/**
 * LINKEDIN NODE
 *
 * Operations:
 *   getProfile     — Get the authenticated user's profile (default)
 *   sharePost      — Share a text post (with optional article link)
 *   getCompany     — Get organization details by company ID
 *   getConnections — List first-degree connections (requires r_network scope)
 *
 * Auth: LinkedIn OAuth2 token stored in vault via getOAuthToken
 */
import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.linkedin.com/v2";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "LinkedIn");
}

function handleError(err) {
  if (err.message.startsWith("LinkedIn")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message || err.response?.data?.error_description || err.message;
  if (status === 401) throw new Error("LinkedIn: OAuth token is invalid or expired — re-authenticate.");
  if (status === 403) throw new Error(`LinkedIn: Permission denied — ${msg}. Check your app's OAuth scopes.`);
  if (status === 404) throw new Error(`LinkedIn: Resource not found — ${msg}`);
  if (status === 422 || status === 400) throw new Error(`LinkedIn: Bad request — ${msg}`);
  if (status === 429) throw new Error("LinkedIn: Rate limit exceeded. Retry later.");
  throw new Error(`LinkedIn failed: ${status || err.code} — ${err.message}`);
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

async function opGetProfile(config, token) {
  const { data } = await axios.get(
    `${BASE}/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),vanityName)`,
    { headers: headers(token), timeout: 10000 },
  );
  const firstName = data.firstName?.localized?.en_US || Object.values(data.firstName?.localized || {})[0] || "";
  const lastName = data.lastName?.localized?.en_US || Object.values(data.lastName?.localized || {})[0] || "";
  return {
    id: data.id,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    vanityName: data.vanityName || null,
  };
}

async function opSharePost(config, token) {
  const text = config.text || config.content || "";
  if (!text) return { success: false, error: "LinkedIn sharePost: 'text' is required.", skipped: true };

  const { data: me } = await axios.get(`${BASE}/me`, { headers: headers(token), timeout: 10000 });
  const authorUrn = `urn:li:person:${me.id}`;

  const shareContent = {
    shareCommentary: { text },
    shareMediaCategory: "NONE",
  };

  if (config.url) {
    shareContent.shareMediaCategory = "ARTICLE";
    shareContent.media = [
      {
        status: "READY",
        originalUrl: config.url,
        title: { text: config.title || "" },
        description: { text: config.description || "" },
      },
    ];
  }

  const post = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": config.visibility || "PUBLIC" },
  };

  const { data } = await axios.post(`${BASE}/ugcPosts`, post, { headers: headers(token), timeout: 15000 });
  return { id: data.id, success: true, authorUrn };
}

async function opGetCompany(config, token) {
  const id = config.companyId;
  if (!id) return { success: false, error: "LinkedIn getCompany: 'companyId' is required.", skipped: true };
  const { data } = await axios.get(
    `${BASE}/organizations/${id}?projection=(id,name,vanityName,description,websiteUrl,logoV2)`,
    { headers: headers(token), timeout: 10000 },
  );
  const name = data.name?.localized?.en_US || Object.values(data.name?.localized || {})[0] || "";
  return {
    id: data.id,
    name,
    vanityName: data.vanityName || null,
    description: data.description?.localized?.en_US || null,
    websiteUrl: data.websiteUrl || null,
  };
}

async function opGetConnections(config, token) {
  const count = parseInt(config.limit) || 50;
  const { data } = await axios.get(
    `${BASE}/connections?q=viewer&start=0&count=${count}`,
    { headers: headers(token), timeout: 15000 },
  );
  const connections = (data.elements || []).map((el) => ({
    id: el.id,
    firstName: el.firstName?.localized?.en_US || "",
    lastName: el.lastName?.localized?.en_US || "",
  }));
  return { connections, total: data.paging?.total ?? connections.length };
}

const OPERATIONS = {
  getProfile: opGetProfile,
  sharePost: opSharePost,
  getCompany: opGetCompany,
  getConnections: opGetConnections,
};

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "getProfile";
    const handler = OPERATIONS[operation];
    if (!handler)
      throw new Error(`LinkedIn: Unknown operation "${operation}". Valid: ${Object.keys(OPERATIONS).join(", ")}`);

    if (!config.credentialId)
      throw new Error("LinkedIn: No credential configured — link a LinkedIn OAuth connection first.");

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (err) {
      handleError(err);
    }

    try {
      return await handler(config, token);
    } catch (err) {
      handleError(err);
    }
  },
};
