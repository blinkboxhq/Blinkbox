/**
 * MCP OAUTH (client side)
 *
 * The browser half of connecting to an OAuth-protected MCP server — including
 * Blinkbox's own, which speaks RFC 9728 discovery + dynamic client registration
 * + PKCE. Static bearer tokens never worked for those: the token only exists
 * after a human signs in on the server's own consent screen.
 *
 * Flow: discover → register → PKCE authorize (popup) → exchange → vault.
 */

import crypto from "crypto";
import {
  discoverOAuthServerInfo,
  registerClient,
  startAuthorization,
  exchangeAuthorization,
  refreshAuthorization,
} from "@modelcontextprotocol/sdk/client/auth.js";
import Credential from "../../models/credential.model.js";
import { encrypt, decrypt } from "../../utils/crypto.js";
import { redis } from "../../infra/redis.client.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";
import { BACKEND_URL } from "../../config/env.js";

const STATE_TTL = 5 * 60;
const CLIENT_NAME = "Blinkbox";
// Refresh a little early so a token never dies mid-handshake.
const EXPIRY_SKEW_MS = 60 * 1000;

const stateKey = (state) => `mcp:oauth:state:${state}`;

export const MCP_CALLBACK_URL = `${BACKEND_URL}/api/mcp-client/oauth/callback`;

export function normalizeMcpUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) throw new Error("No MCP server URL set");
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function clientMetadata(scope) {
  return {
    client_name: CLIENT_NAME,
    client_uri: "https://blinkbox.net",
    redirect_uris: [MCP_CALLBACK_URL],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    ...(scope ? { scope } : {}),
  };
}

// Servers advertise scopes in either metadata document; asking for offline_access
// when it is offered is what buys us a refresh token instead of a 1-hour session.
function pickScope(resourceMetadata, serverMetadata) {
  const supported =
    resourceMetadata?.scopes_supported || serverMetadata?.scopes_supported || [];
  return supported.length ? supported.join(" ") : undefined;
}

// The SDK falls back to `<origin>/token` when it has no metadata, which is wrong
// for any server mounted under a path. Carry the discovered endpoint forward.
function tokenMetadata(metadata) {
  if (!metadata?.token_endpoint) return undefined;
  return {
    issuer: metadata.issuer,
    token_endpoint: metadata.token_endpoint,
    token_endpoint_auth_methods_supported: metadata.token_endpoint_auth_methods_supported,
  };
}

async function discover(serverUrl) {
  const info = await discoverOAuthServerInfo(serverUrl);
  if (!info?.authorizationServerUrl) {
    throw new Error("That server did not advertise an OAuth authorization server.");
  }
  await assertSafeUrlResolved(info.authorizationServerUrl);
  return info;
}

/**
 * Builds the consent-screen URL and parks everything the callback will need
 * in Redis under a single-use CSRF state.
 */
export async function beginMcpAuthorization({ userId, serverUrl, clientId, clientSecret }) {
  const target = normalizeMcpUrl(serverUrl);
  await assertSafeUrlResolved(target);

  const { authorizationServerUrl, authorizationServerMetadata, resourceMetadata } =
    await discover(target);

  const scope = pickScope(resourceMetadata, authorizationServerMetadata);
  const resource = new URL(resourceMetadata?.resource || target);

  let clientInformation;
  if (clientId) {
    clientInformation = { client_id: clientId, ...(clientSecret ? { client_secret: clientSecret } : {}) };
  } else if (authorizationServerMetadata?.registration_endpoint) {
    clientInformation = await registerClient(authorizationServerUrl, {
      metadata: authorizationServerMetadata,
      clientMetadata: clientMetadata(scope),
      scope,
    });
  } else {
    throw new Error(
      "This server has no dynamic client registration. Enter a Client ID from its developer settings.",
    );
  }

  const state = crypto.randomBytes(32).toString("hex");
  const { authorizationUrl, codeVerifier } = await startAuthorization(authorizationServerUrl, {
    metadata: authorizationServerMetadata,
    clientInformation,
    redirectUrl: MCP_CALLBACK_URL,
    scope,
    state,
    resource,
  });

  await redis.setex(
    stateKey(state),
    STATE_TTL,
    JSON.stringify({
      userId,
      serverUrl: target,
      authorizationServerUrl,
      clientInformation,
      codeVerifier,
      scope,
      resource: resource.href,
      tokenMetadata: tokenMetadata(authorizationServerMetadata),
    }),
  );

  return authorizationUrl.href;
}

function splitClientInfo(clientInformation) {
  const { client_secret: secret, ...pub } = clientInformation || {};
  if (!secret) return { publicInfo: pub, secretFields: {} };
  const enc = encrypt(secret);
  return {
    publicInfo: pub,
    secretFields: {
      clientSecretEnc: enc.encryptedData,
      clientSecretIv: enc.iv,
      clientSecretAuthTag: enc.authTag,
    },
  };
}

function rehydrateClientInfo(meta) {
  const info = { ...(meta?.clientInformation || {}) };
  if (meta?.clientSecretEnc) {
    info.client_secret = decrypt(meta.clientSecretEnc, meta.clientSecretIv, meta.clientSecretAuthTag);
  }
  return info;
}

function saveTokens(doc, tokens, extraMeta) {
  const access = encrypt(tokens.access_token);
  doc.encryptedData = access.encryptedData;
  doc.iv = access.iv;
  doc.authTag = access.authTag;
  if (tokens.refresh_token) {
    const rt = encrypt(tokens.refresh_token);
    doc.refreshToken = rt.encryptedData;
    doc.refreshIv = rt.iv;
    doc.refreshAuthTag = rt.authTag;
  }
  doc.tokenExpiresAt = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000)
    : null;
  if (extraMeta) doc.oauthMetadata = { ...(doc.oauthMetadata || {}), ...extraMeta };
  return doc;
}

/**
 * Exchanges the authorization code and stores the result as a vault credential
 * the MCP Client node can point at.
 */
export async function completeMcpAuthorization({ code, state }) {
  const raw = await redis.getdel(stateKey(state));
  if (!raw) throw new Error("This sign-in link expired. Try connecting again.");
  const pending = JSON.parse(raw);

  const tokens = await exchangeAuthorization(pending.authorizationServerUrl, {
    metadata: pending.tokenMetadata,
    clientInformation: pending.clientInformation,
    authorizationCode: code,
    codeVerifier: pending.codeVerifier,
    redirectUri: MCP_CALLBACK_URL,
    resource: new URL(pending.resource),
  });

  if (!tokens?.access_token) throw new Error("The server returned no access token.");

  const { publicInfo, secretFields } = splitClientInfo(pending.clientInformation);
  const host = new URL(pending.serverUrl).host;

  const doc = new Credential({
    workspaceId: pending.userId,
    name: `MCP — ${host}`,
    type: "mcp_oauth",
    provider: "mcp",
    oauthMetadata: {
      serverUrl: pending.serverUrl,
      authorizationServerUrl: pending.authorizationServerUrl,
      resource: pending.resource,
      scope: pending.scope,
      tokenMetadata: pending.tokenMetadata,
      clientInformation: publicInfo,
      ...secretFields,
    },
  });
  saveTokens(doc, tokens);
  await doc.save();

  return {
    _id: doc._id,
    name: doc.name,
    type: doc.type,
    provider: doc.provider,
    serverUrl: pending.serverUrl,
  };
}

/**
 * Returns a live access token for a stored MCP credential, refreshing it in
 * place when it has aged out. Throws when the user has to sign in again.
 */
export async function getMcpAccessToken(credentialId, workspaceId) {
  const cred = await Credential.findOne({ _id: credentialId, workspaceId });
  if (!cred) throw new Error("MCP sign-in not found for this workspace. Connect again.");

  const expired =
    cred.tokenExpiresAt && cred.tokenExpiresAt.getTime() - EXPIRY_SKEW_MS <= Date.now();

  if (!expired) return decrypt(cred.encryptedData, cred.iv, cred.authTag);

  if (!cred.refreshToken) {
    throw new Error("MCP sign-in expired. Click Sign in to reconnect.");
  }

  const meta = cred.oauthMetadata || {};
  const refreshed = await refreshAuthorization(meta.authorizationServerUrl, {
    metadata: meta.tokenMetadata,
    clientInformation: rehydrateClientInfo(meta),
    refreshToken: decrypt(cred.refreshToken, cred.refreshIv, cred.refreshAuthTag),
    resource: meta.resource ? new URL(meta.resource) : undefined,
  });

  if (!refreshed?.access_token) {
    throw new Error("MCP sign-in expired. Click Sign in to reconnect.");
  }

  saveTokens(cred, refreshed);
  await cred.save();
  return refreshed.access_token;
}

export async function getMcpCredentialServerUrl(credentialId, workspaceId) {
  const cred = await Credential.findOne({ _id: credentialId, workspaceId }).select("oauthMetadata");
  return cred?.oauthMetadata?.serverUrl || "";
}
