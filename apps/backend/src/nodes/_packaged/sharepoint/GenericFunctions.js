/**
 * SHAREPOINT — shared primitives. Resolves the Microsoft OAuth token via the
 * credential store (resolveCredential + decrypt, matching the monolith), builds
 * Graph headers, and maps errors verbatim. Handlers receive (config, ctx) where
 * ctx is { headers, siteId, input }.
 */
import axios from "axios";
import { resolveCredential } from "../../../utils/resolveCredential.js";
import { decrypt } from "../../../utils/crypto.js";

export const GRAPH = "https://graph.microsoft.com/v1.0";

export async function getToken(credentialId, workspaceId) {
  if (!credentialId) return null;
  const cred = await resolveCredential(credentialId, workspaceId, "SharePoint");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export function graphHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function handleError(err) {
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message || err.message;
  if (status === 401 || status === 403) throw new Error(`SharePoint: Auth failed — ${msg}. Refresh your Microsoft OAuth token.`);
  if (status === 404) throw new Error(`SharePoint: Resource not found — check siteId/itemId.`);
  if (status === 409) throw new Error(`SharePoint: Conflict — file or folder already exists.`);
  if (status === 429) throw new Error(`SharePoint: Rate limit exceeded. Add a Delay node.`);
  throw new Error(`SharePoint: ${status || "Error"} — ${msg}`);
}
