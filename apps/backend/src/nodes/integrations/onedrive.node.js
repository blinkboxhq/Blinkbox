/**
 * ONEDRIVE NODE
 * Microsoft Graph API — files, folders, sharing.
 *
 * Operations:
 *   uploadFile    — Upload file content (base64 or URL) to a path
 *   downloadFile  — Download file content by path or item ID
 *   listFiles     — List files in a folder (blank = root)
 *   deleteFile    — Delete a file or folder by path or item ID
 *   createFolder  — Create a folder at a given path
 *   moveFile      — Move (and optionally rename) a file
 *   shareFile     — Create a sharing link (view/edit/embed)
 *   getFileInfo   — Get metadata for a file/folder
 *
 * Auth: Microsoft 365 OAuth token stored in credential vault
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { assertSafeUrlResolved } from "../../utils/ssrf.js";

const GRAPH = "https://graph.microsoft.com/v1.0";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "OneDrive");
}

function authHeaders(token, contentType = "application/json") {
  return { Authorization: `Bearer ${token}`, "Content-Type": contentType };
}

function handleError(err) {
  if (err.message?.startsWith("OneDrive")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error?.message ?? err.message;
  if (status === 401) throw new Error(`OneDrive: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`OneDrive: Insufficient permissions — ${msg}. Ensure Files.ReadWrite Graph scope is granted.`);
  if (status === 404) throw new Error(`OneDrive: File or folder not found — ${msg}`);
  if (status === 409) throw new Error(`OneDrive: Conflict — ${msg}. The item may already exist.`);
  if (status === 422) throw new Error(`OneDrive: Unprocessable request (422) — ${msg}.`);
  if (status === 429) throw new Error(`OneDrive: Rate limit exceeded. Retry after a short delay.`);
  if (status >= 500) throw new Error(`OneDrive: Server error (${status}) — ${msg}. Retry later.`);
  throw new Error(`OneDrive: ${status ?? "Network"} error — ${msg}`);
}

function encodePath(p) {
  return String(p).replace(/^\//, "").split("/").map(encodeURIComponent).join("/");
}

function itemUrl(pathOrId) {
  if (/^[A-Z0-9!_]{10,}$/i.test(pathOrId) && !pathOrId.startsWith("/")) {
    return `${GRAPH}/me/drive/items/${pathOrId}`;
  }
  return `${GRAPH}/me/drive/root:/${encodePath(pathOrId)}`;
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listFiles" } = config;

    if (!config.credentialId) {
      return { success: false, error: "OneDrive: No credential selected — pick a Microsoft 365 OAuth credential.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `OneDrive: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const headers = authHeaders(token);

    try {
      switch (operation) {
        case "uploadFile": {
          const { path, content, overwrite } = config;
          if (!path) return { success: false, error: "OneDrive uploadFile: 'path' is required.", skipped: true };
          if (!content) return { success: false, error: "OneDrive uploadFile: 'content' is required.", skipped: true };

          const conflictBehavior = overwrite ? "replace" : "fail";
          const uploadUrl = `${GRAPH}/me/drive/root:/${encodePath(path)}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`;

          let fileBuffer;
          if (/^https?:\/\//i.test(content)) {
            await assertSafeUrlResolved(content);
            const dl = await axios.get(content, { responseType: "arraybuffer", timeout: 30000 });
            fileBuffer = dl.data;
          } else {
            fileBuffer = Buffer.from(content, "base64");
          }

          const res = await axios.put(uploadUrl, fileBuffer, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
            timeout: 60000,
          });
          return {
            success: true,
            id: res.data.id,
            name: res.data.name,
            size: res.data.size,
            webUrl: res.data.webUrl,
            createdDateTime: res.data.createdDateTime,
          };
        }

        case "downloadFile": {
          const { path } = config;
          if (!path) return { success: false, error: "OneDrive downloadFile: 'path' or item ID is required.", skipped: true };

          const base = itemUrl(path);
          const metaRes = await axios.get(base, { headers, timeout: 15000 });
          const downloadUrl = metaRes.data["@microsoft.graph.downloadUrl"];

          const fileRes = await axios.get(downloadUrl, { responseType: "arraybuffer", timeout: 60000 });
          const base64 = Buffer.from(fileRes.data).toString("base64");

          return {
            success: true,
            id: metaRes.data.id,
            name: metaRes.data.name,
            size: metaRes.data.size,
            mimeType: metaRes.data.file?.mimeType,
            contentBase64: base64,
          };
        }

        case "listFiles": {
          const { folderPath } = config;
          const url = folderPath
            ? `${GRAPH}/me/drive/root:/${encodePath(folderPath)}:/children`
            : `${GRAPH}/me/drive/root/children`;

          const res = await axios.get(url, { headers, params: { $top: 100 }, timeout: 15000 });
          return {
            success: true,
            count: res.data.value.length,
            items: res.data.value.map((f) => ({
              id: f.id,
              name: f.name,
              size: f.size,
              webUrl: f.webUrl,
              createdDateTime: f.createdDateTime,
              isFolder: !!f.folder,
            })),
          };
        }

        case "deleteFile": {
          const { path } = config;
          if (!path) return { success: false, error: "OneDrive deleteFile: 'path' or item ID is required.", skipped: true };

          const base = itemUrl(path);
          await axios.delete(base, { headers, timeout: 15000 });
          return { success: true, deleted: path };
        }

        case "createFolder": {
          const { folderPath } = config;
          if (!folderPath) return { success: false, error: "OneDrive createFolder: 'folderPath' is required.", skipped: true };

          const parts = folderPath.replace(/^\//, "").split("/");
          const folderName = parts.pop();
          const parentPath = parts.join("/");
          const parentUrl = parentPath
            ? `${GRAPH}/me/drive/root:/${encodePath(parentPath)}:/children`
            : `${GRAPH}/me/drive/root/children`;

          const res = await axios.post(
            parentUrl,
            { name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" },
            { headers, timeout: 15000 }
          );
          return { success: true, id: res.data.id, name: res.data.name, webUrl: res.data.webUrl, createdDateTime: res.data.createdDateTime };
        }

        case "moveFile": {
          const { sourcePath, destPath, newName } = config;
          if (!sourcePath) return { success: false, error: "OneDrive moveFile: 'sourcePath' is required.", skipped: true };
          if (!destPath) return { success: false, error: "OneDrive moveFile: 'destPath' (destination folder path) is required.", skipped: true };

          const sourceBase = itemUrl(sourcePath);
          const destMetaUrl = `${GRAPH}/me/drive/root:/${encodePath(destPath)}`;
          const destMeta = await axios.get(destMetaUrl, { headers, timeout: 15000 });

          const patchBody = { parentReference: { id: destMeta.data.id } };
          if (newName) patchBody.name = newName;

          const res = await axios.patch(sourceBase, patchBody, { headers, timeout: 20000 });
          return { success: true, id: res.data.id, name: res.data.name, webUrl: res.data.webUrl };
        }

        case "shareFile": {
          const { path, linkType, scope } = config;
          if (!path) return { success: false, error: "OneDrive shareFile: 'path' or item ID is required.", skipped: true };

          const base = itemUrl(path);
          const res = await axios.post(
            `${base}/createLink`,
            { type: linkType || "view", scope: scope || "anonymous" },
            { headers, timeout: 15000 }
          );
          return { success: true, link: res.data.link?.webUrl, type: res.data.link?.type, scope: res.data.link?.scope };
        }

        case "getFileInfo": {
          const { path } = config;
          if (!path) return { success: false, error: "OneDrive getFileInfo: 'path' or item ID is required.", skipped: true };

          const base = itemUrl(path);
          const res = await axios.get(base, { headers, timeout: 15000 });
          return {
            success: true,
            id: res.data.id,
            name: res.data.name,
            size: res.data.size,
            webUrl: res.data.webUrl,
            createdDateTime: res.data.createdDateTime,
            lastModifiedDateTime: res.data.lastModifiedDateTime,
            mimeType: res.data.file?.mimeType,
            isFolder: !!res.data.folder,
          };
        }

        default:
          return { success: false, error: `OneDrive: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};
