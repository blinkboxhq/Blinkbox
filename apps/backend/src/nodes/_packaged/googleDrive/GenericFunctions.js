/**
 * Google Drive — shared helpers for all v1 resource files.
 * Handlers receive `(config, token)` where token is the raw Google OAuth2
 * access token; makeReq(token) is the identity passthrough the slim entry
 * uses to preserve that calling convention.
 */
export const BASE = "https://www.googleapis.com/drive/v3";
export const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
export const FILE_FIELDS = "id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,iconLink,parents,trashed,starred,shared,owners(emailAddress)";

export const SUPPORTS_ALL = { supportsAllDrives: true };

export function h(token, json = false) {
  const out = { Authorization: `Bearer ${token}` };
  if (json) out["Content-Type"] = "application/json";
  return out;
}

export function esc(v) {
  return String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function slimFile(f) {
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size,
    modifiedTime: f.modifiedTime,
    createdTime: f.createdTime,
    webViewLink: f.webViewLink,
    webContentLink: f.webContentLink,
    parents: f.parents ?? [],
    trashed: f.trashed,
    starred: f.starred,
    shared: f.shared,
    owners: f.owners?.map((o) => o.emailAddress) ?? [],
  };
}

export function handleError(err) {
  if (err.message?.startsWith("Google Drive")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401 || status === 403) {
    if (msg.includes("storageQuota")) throw new Error("Google Drive: Storage quota exceeded.");
    throw new Error(`Google Drive: Auth failed (${status}) — ${msg}. Re-connect your Google account.`);
  }
  if (status === 404) throw new Error(`Google Drive: File or folder not found — ${msg}.`);
  if (status === 400) throw new Error(`Google Drive: Bad request — ${msg}.`);
  if (status === 429) throw new Error("Google Drive: Rate limit exceeded. Reduce request frequency.");
  if (status >= 500) throw new Error(`Google Drive: Google server error (${status}) — ${msg}. Retry later.`);
  throw new Error(`Google Drive: ${status ?? "Error"} — ${msg}`);
}

// Google Drive passes the resolved OAuth2 token straight through to handlers.
export function makeReq(token) {
  return token;
}
