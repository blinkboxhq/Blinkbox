/**
 * BOX NODE
 * Box Platform API v2 — files, folders, sharing.
 *
 * Operations:
 *   uploadFile    — Upload file content (base64) to a folder
 *   downloadFile  — Download file content by file ID
 *   listFiles     — List files in a folder (blank = root "0")
 *   deleteFile    — Delete a file or folder by ID
 *   createFolder  — Create a folder inside a parent folder
 *   moveFile      — Move a file to a different folder
 *   shareFile     — Create a shared link for a file
 *   getFileInfo   — Get metadata for a file or folder
 *   searchFiles   — Search for files/folders by query
 *
 * Auth: Box OAuth token stored in credential vault
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API = "https://api.box.com/2.0";
const UPLOAD_API = "https://upload.box.com/api/2.0";

function handleError(err) {
  if (err.message?.startsWith("Box")) throw err;
  const status = err.response?.status;
  const body = err.response?.data;
  const msg = body?.message ?? body?.context_info?.errors?.[0]?.message ?? err.message;
  const code = body?.code ?? "";

  if (status === 401) throw new Error(`Box: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`Box: Insufficient permissions — ${msg}. Check the OAuth scopes on the credential.`);
  if (status === 404 || code === "not_found") throw new Error(`Box: File or folder not found — ${msg}`);
  if (status === 409 || code === "item_name_in_use") throw new Error(`Box: Conflict — ${msg}. The item may already exist.`);
  if (status === 422) throw new Error(`Box: Unprocessable request (422) — ${msg}.`);
  if (status === 429) throw new Error(`Box: Rate limit exceeded. Retry after a short delay.`);
  if (status >= 500) throw new Error(`Box: Server error (${status}) — ${msg}. Retry later.`);
  throw new Error(`Box: ${status ?? "Network"} error — ${msg}`);
}

function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra };
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listFiles" } = config;

    if (!config.credentialId) {
      return { success: false, error: "Box: No credential selected.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Box");
    } catch (e) {
      return { success: false, error: `Box: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const headers = authHeaders(token);

    try {
      switch (operation) {
        case "uploadFile": {
          const { fileName, folderId, content } = config;
          if (!fileName) return { success: false, error: "Box uploadFile: 'fileName' is required.", skipped: true };
          if (content === undefined || content === null || content === "") {
            return { success: false, error: "Box uploadFile: 'content' (base64) is required.", skipped: true };
          }

          const parentId = folderId || "0";
          const fileBuffer = Buffer.from(content, "base64");

          const FormData = (await import("form-data")).default;
          const form = new FormData();
          form.append("attributes", JSON.stringify({ name: fileName, parent: { id: parentId } }));
          form.append("file", fileBuffer, { filename: fileName });

          const res = await axios.post(`${UPLOAD_API}/files/content`, form, {
            headers: {
              Authorization: `Bearer ${token}`,
              ...form.getHeaders(),
            },
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          });

          const entry = res.data.entries?.[0] ?? {};
          return {
            success: true,
            id: entry.id,
            name: entry.name,
            size: entry.size,
            createdAt: entry.created_at,
            modifiedAt: entry.modified_at,
          };
        }

        case "downloadFile": {
          const { fileId } = config;
          if (!fileId) return { success: false, error: "Box downloadFile: 'fileId' is required.", skipped: true };

          const metaRes = await axios.get(`${API}/files/${fileId}`, { headers, timeout: 15000 });
          const dlRes = await axios.get(`${API}/files/${fileId}/content`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "arraybuffer",
            timeout: 60000,
            maxRedirects: 5,
          });

          const base64 = Buffer.from(dlRes.data).toString("base64");
          return {
            success: true,
            id: metaRes.data.id,
            name: metaRes.data.name,
            size: metaRes.data.size,
            mimeType: metaRes.data.extension,
            contentBase64: base64,
          };
        }

        case "listFiles": {
          const { folderId, limit } = config;
          const id = folderId || "0";
          const res = await axios.get(`${API}/folders/${id}/items`, {
            headers,
            params: { limit: Number(limit || 100), fields: "id,name,type,size,created_at,modified_at,content_modified_at" },
            timeout: 15000,
          });

          return {
            success: true,
            count: res.data.total_count,
            items: res.data.entries.map((f) => ({
              id: f.id,
              name: f.name,
              type: f.type,
              size: f.size,
              createdAt: f.created_at,
              modifiedAt: f.modified_at,
            })),
          };
        }

        case "deleteFile": {
          const { fileId, itemType } = config;
          if (!fileId) return { success: false, error: "Box deleteFile: 'fileId' is required.", skipped: true };

          const type = itemType === "folder" ? "folders" : "files";
          await axios.delete(`${API}/${type}/${fileId}`, { headers, timeout: 15000 });
          return { success: true, deleted: fileId };
        }

        case "createFolder": {
          const { folderName, parentFolderId } = config;
          if (!folderName) return { success: false, error: "Box createFolder: 'folderName' is required.", skipped: true };

          const res = await axios.post(
            `${API}/folders`,
            { name: folderName, parent: { id: parentFolderId || "0" } },
            { headers, timeout: 15000 }
          );

          return {
            success: true,
            id: res.data.id,
            name: res.data.name,
            createdAt: res.data.created_at,
          };
        }

        case "moveFile": {
          const { fileId, destFolderId, newName, itemType } = config;
          if (!fileId) return { success: false, error: "Box moveFile: 'fileId' is required.", skipped: true };
          if (!destFolderId) return { success: false, error: "Box moveFile: 'destFolderId' is required.", skipped: true };

          const type = itemType === "folder" ? "folders" : "files";
          const body = { parent: { id: destFolderId } };
          if (newName) body.name = newName;

          const res = await axios.put(`${API}/${type}/${fileId}`, body, { headers, timeout: 20000 });
          return {
            success: true,
            id: res.data.id,
            name: res.data.name,
            modifiedAt: res.data.modified_at,
          };
        }

        case "shareFile": {
          const { fileId, access, password, unsharedAt, itemType } = config;
          if (!fileId) return { success: false, error: "Box shareFile: 'fileId' is required.", skipped: true };

          const type = itemType === "folder" ? "folders" : "files";
          const sharedLink = { access: access || "open" };
          if (password) sharedLink.password = password;
          if (unsharedAt) sharedLink.unshared_at = unsharedAt;

          const res = await axios.put(
            `${API}/${type}/${fileId}`,
            { shared_link: sharedLink },
            { headers, timeout: 15000 }
          );

          return {
            success: true,
            url: res.data.shared_link?.url,
            downloadUrl: res.data.shared_link?.download_url,
            access: res.data.shared_link?.access,
            effectiveAccess: res.data.shared_link?.effective_access,
          };
        }

        case "getFileInfo": {
          const { fileId, itemType } = config;
          if (!fileId) return { success: false, error: "Box getFileInfo: 'fileId' is required.", skipped: true };

          const type = itemType === "folder" ? "folders" : "files";
          const res = await axios.get(`${API}/${type}/${fileId}`, { headers, timeout: 15000 });

          return {
            success: true,
            id: res.data.id,
            name: res.data.name,
            type: res.data.type,
            size: res.data.size,
            createdAt: res.data.created_at,
            modifiedAt: res.data.modified_at,
            sharedLink: res.data.shared_link?.url ?? null,
            parentId: res.data.parent?.id,
          };
        }

        case "searchFiles": {
          const { query, folderId, limit } = config;
          if (!query) return { success: false, error: "Box searchFiles: 'query' is required.", skipped: true };

          const params = { query, limit: Number(limit || 20) };
          if (folderId) params.ancestor_folder_ids = folderId;

          const res = await axios.get(`${API}/search`, { headers, params, timeout: 15000 });

          return {
            success: true,
            count: res.data.total_count,
            items: res.data.entries.map((f) => ({
              id: f.id,
              name: f.name,
              type: f.type,
              size: f.size,
              createdAt: f.created_at,
              modifiedAt: f.modified_at,
            })),
          };
        }

        default:
          return { success: false, error: `Box: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};
