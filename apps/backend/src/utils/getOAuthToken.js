import axios from "axios";
import Credential from "../models/credential.model.js";
import { resolveCredential } from "./resolveCredential.js";
import { decrypt, encrypt } from "./crypto.js";
import providers from "../modules/credentials/oauth.providers.js";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

async function refreshAccessToken(cred) {
  const provider = providers[cred.provider];
  if (!provider) throw new Error(`No provider config for "${cred.provider}"`);

  const clientId = process.env[provider.clientEnvKey];
  const clientSecret = process.env[provider.secretEnvKey];
  if (!clientId || !clientSecret) {
    throw new Error(`Missing OAuth client config for provider "${cred.provider}"`);
  }

  const refreshToken = decrypt(cred.refreshToken, cred.refreshIv, cred.refreshAuthTag);

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const headers = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };

  if (provider.useBasicAuth) {
    const b64 = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${b64}`;
    params.delete("client_id");
    params.delete("client_secret");
  }

  const { data } = await axios.post(provider.tokenUrl, params.toString(), { headers, timeout: 15000 });

  const newAccessToken = data.access_token;
  if (!newAccessToken) throw new Error(`Token refresh for "${cred.provider}" returned no access_token`);

  const expiresIn = data.expires_in || 3600;
  const { encryptedData, iv, authTag } = encrypt(newAccessToken);
  const update = {
    encryptedData,
    iv,
    authTag,
    tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
  };

  if (data.refresh_token) {
    const rt = encrypt(data.refresh_token);
    update.refreshToken = rt.encryptedData;
    update.refreshIv = rt.iv;
    update.refreshAuthTag = rt.authTag;
  }

  await Credential.findByIdAndUpdate(cred._id, update);
  return newAccessToken;
}

/**
 * Resolve an OAuth credential and return a valid access token.
 * Automatically refreshes if the token is expired or within 5 minutes of expiry.
 */
export async function getOAuthToken(credentialId, workspaceId, label) {
  const cred = await resolveCredential(credentialId, workspaceId, label);

  const isExpiredOrSoon =
    cred.tokenExpiresAt &&
    cred.tokenExpiresAt < new Date(Date.now() + REFRESH_BUFFER_MS);

  if (isExpiredOrSoon && cred.refreshToken && cred.provider) {
    try {
      return await refreshAccessToken(cred);
    } catch (err) {
      console.warn(`[OAuth] Refresh failed for ${cred.provider} (${cred._id}): ${err.message}. Using existing token.`);
    }
  }

  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}
