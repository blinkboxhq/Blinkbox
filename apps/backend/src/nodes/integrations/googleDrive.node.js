/**
 * GOOGLE DRIVE NODE
 * Manage files and folders via Google Drive API v3.
 *
 * Operations:
 *   listFiles     — List files in a folder
 *   getFile       — Get file metadata by ID
 *   createFolder  — Create a new folder
 *   uploadText    — Upload a text/JSON/CSV file
 *   downloadText  — Download file content as text
 *   deleteFile    — Delete a file or folder
 *   moveFile      — Move a file to another folder
 *   shareFile     — Add a permission (share) to a file
 *
 * Auth: Google OAuth2 access token in vault
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Google Drive");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function h(token) { return { Authorization: `Bearer ${token}` }; }

function handleError(err) {
  if (err.message?.startsWith("Google Drive")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`Google Drive: Auth failed — ${msg}.`);
  if (status === 404) throw new Error(`Google Drive: File not found — ${msg}.`);
  throw new Error(`Google Drive: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listFiles" } = config;
    const token = await getToken(config.credentialId, context.workspaceId);

    try {
      switch (operation) {
        case "listFiles": {
          const q = [
            config.folderId ? `'${config.folderId}' in parents` : "'root' in parents",
            "trashed = false",
            config.mimeType ? `mimeType = '${config.mimeType}'` : "",
          ].filter(Boolean).join(" and ");
          const res = await axios.get(`${BASE}/files`, {
            headers: h(token), timeout: 15000,
            params: { q, fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)", pageSize: Math.min(Number(config.limit ?? 50), 1000) },
          });
          return { files: res.data.files ?? [], count: res.data.files?.length ?? 0 };
        }

        case "getFile": {
          if (!config.fileId) return { success: false, error: "Google Drive getFile: 'fileId' is required., skipped: true };
          const res = await axios.get(`${BASE}/files/${config.fileId}`, {
            headers: h(token), timeout: 15000,
            params: { fields: "id,name,mimeType,size,modifiedTime,webViewLink,parents" },
          });
          return res.data;
        }

        case "createFolder": {
          if (!config.name) return { success: false, error: "Google Drive createFolder: 'name' is required., skipped: true };
          const res = await axios.post(`${BASE}/files`, {
            name: config.name,
            mimeType: "application/vnd.google-apps.folder",
            parents: config.parentId ? [config.parentId] : undefined,
          }, { headers: { ...h(token), "Content-Type": "application/json" }, timeout: 15000 });
          return { id: res.data.id, name: res.data.name, mimeType: res.data.mimeType };
        }

        case "uploadText": {
          if (!config.name || config.content === undefined) return { success: false, error: "Google Drive uploadText: 'name' and 'content' are required., skipped: true };
          const mimeType = config.mimeType ?? "text/plain";
          const metadata = { name: config.name, parents: config.folderId ? [config.folderId] : undefined };
          const formData = `--boundary\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--boundary\r\nContent-Type: ${mimeType}\r\n\r\n${config.content}\r\n--boundary--`;
          const res = await axios.post(`${UPLOAD_BASE}/files?uploadType=multipart`, formData, {
            headers: { ...h(token), "Content-Type": "multipart/related; boundary=boundary" }, timeout: 30000,
          });
          return { id: res.data.id, name: res.data.name };
        }

        case "downloadText": {
          if (!config.fileId) return { success: false, error: "Google Drive downloadText: 'fileId' is required., skipped: true };
          const res = await axios.get(`${BASE}/files/${config.fileId}?alt=media`, { headers: h(token), timeout: 30000, responseType: "text" });
          return { content: res.data, fileId: config.fileId };
        }

        case "deleteFile": {
          if (!config.fileId) return { success: false, error: "Google Drive deleteFile: 'fileId' is required., skipped: true };
          await axios.delete(`${BASE}/files/${config.fileId}`, { headers: h(token), timeout: 15000 });
          return { deleted: true, fileId: config.fileId };
        }

        case "moveFile": {
          if (!config.fileId || !config.targetFolderId) return { success: false, error: "Google Drive moveFile: 'fileId' and 'targetFolderId' are required., skipped: true };
          const meta = await axios.get(`${BASE}/files/${config.fileId}`, { headers: h(token), params: { fields: "parents" }, timeout: 15000 });
          const oldParents = (meta.data.parents ?? []).join(",");
          const res = await axios.patch(`${BASE}/files/${config.fileId}`, {}, { headers: h(token), params: { addParents: config.targetFolderId, removeParents: oldParents, fields: "id,parents" }, timeout: 15000 });
          return { moved: true, fileId: res.data.id };
        }

        case "shareFile": {
          if (!config.fileId || !config.email) return { success: false, error: "Google Drive shareFile: 'fileId' and 'email' are required., skipped: true };
          const res = await axios.post(`${BASE}/files/${config.fileId}/permissions`, {
            type: "user", role: config.role ?? "reader", emailAddress: config.email,
          }, { headers: { ...h(token), "Content-Type": "application/json" }, timeout: 15000 });
          return { permissionId: res.data.id, role: res.data.role, shared: true };
        }

        default:
          throw new Error(`Google Drive: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
