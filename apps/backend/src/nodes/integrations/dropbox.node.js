/**
 * DROPBOX NODE
 * Dropbox API v2 — files, folders, sharing.
 *
 * Operations:
 *   uploadFile    — Upload file content (base64 or text) to a Dropbox path
 *   downloadFile  — Download file content by path
 *   listFiles     — List files in a folder (blank = root)
 *   deleteFile    — Delete a file or folder by path
 *   createFolder  — Create a folder at a given path
 *   moveFile      — Move (and optionally rename) a file
 *   shareFile     — Create a shared link for a file
 *   getFileInfo   — Get metadata for a file or folder
 *   searchFiles   — Search for files matching a query string
 *
 * Auth: Dropbox OAuth token stored in credential vault
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API  = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";

function handleError(err) {
  if (err.message?.startsWith("Dropbox")) throw err;
  const status = err.response?.status;
  const body = err.response?.data;
  const summary = body?.error_summary ?? body?.error?.reason?.[".tag"] ?? err.message;

  if (status === 401) throw new Error(`Dropbox: Authentication failed — token may have expired. Re-authorise the credential.`);
  if (status === 403) throw new Error(`Dropbox: Insufficient permissions — ${summary}. Check the OAuth scopes on the credential.`);
  if (status === 404 || summary?.includes("not_found") || summary?.includes("path/not_found")) {
    throw new Error(`Dropbox: File or folder not found — ${summary}`);
  }
  if (status === 409) throw new Error(`Dropbox: Conflict — ${summary}. The item may already exist or the path is invalid.`);
  if (status === 422) throw new Error(`Dropbox: Unprocessable request (422) — ${summary}.`);
  if (status === 429) throw new Error(`Dropbox: Rate limit exceeded. Retry after a short delay.`);
  if (status >= 500) throw new Error(`Dropbox: Server error (${status}) — ${summary}. Retry later.`);
  throw new Error(`Dropbox: ${status ?? "Network"} error — ${summary}`);
}

function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra };
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listFiles" } = config;

    if (!config.credentialId) {
      return { success: false, error: "Dropbox: No credential selected.", skipped: true };
    }

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Dropbox");
    } catch (e) {
      return { success: false, error: `Dropbox: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const headers = authHeaders(token);

    try {
      switch (operation) {
        case "uploadFile": {
          const { path, content, overwrite } = config;
          if (!path) return { success: false, error: "Dropbox uploadFile: 'path' is required.", skipped: true };
          if (content === undefined || content === null || content === "") {
            return { success: false, error: "Dropbox uploadFile: 'content' is required.", skipped: true };
          }

          const dropboxPath = path.startsWith("/") ? path : `/${path}`;
          const mode = overwrite ? "overwrite" : "add";
          const fileBuffer = Buffer.from(content, "base64");

          const res = await axios.post(`${CONTENT}/files/upload`, fileBuffer, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/octet-stream",
              "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath, mode, autorename: !overwrite }),
            },
            timeout: 60000,
          });

          return {
            success: true,
            id: res.data.id,
            name: res.data.name,
            path: res.data.path_display,
            size: res.data.size,
            clientModified: res.data.client_modified,
            serverModified: res.data.server_modified,
          };
        }

        case "downloadFile": {
          const { path } = config;
          if (!path) return { success: false, error: "Dropbox downloadFile: 'path' is required.", skipped: true };

          const dropboxPath = path.startsWith("/") ? path : `/${path}`;

          const res = await axios.post(`${CONTENT}/files/download`, null, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
            },
            responseType: "arraybuffer",
            timeout: 60000,
          });

          const meta = JSON.parse(res.headers["dropbox-api-result"] || "{}");
          const base64 = Buffer.from(res.data).toString("base64");

          return {
            success: true,
            id: meta.id,
            name: meta.name,
            path: meta.path_display,
            size: meta.size,
            contentBase64: base64,
          };
        }

        case "listFiles": {
          const { folderPath, recursive } = config;
          const dropboxPath = folderPath ? (folderPath.startsWith("/") ? folderPath : `/${folderPath}`) : "";

          const res = await axios.post(
            `${API}/files/list_folder`,
            { path: dropboxPath, recursive: !!recursive, limit: 100 },
            { headers, timeout: 15000 }
          );

          return {
            success: true,
            count: res.data.entries.length,
            hasMore: res.data.has_more,
            items: res.data.entries.map((f) => ({
              id: f.id,
              name: f.name,
              path: f.path_display,
              tag: f[".tag"],
              size: f.size,
              clientModified: f.client_modified,
              serverModified: f.server_modified,
            })),
          };
        }

        case "deleteFile": {
          const { path } = config;
          if (!path) return { success: false, error: "Dropbox deleteFile: 'path' is required.", skipped: true };

          const dropboxPath = path.startsWith("/") ? path : `/${path}`;
          const res = await axios.post(
            `${API}/files/delete_v2`,
            { path: dropboxPath },
            { headers, timeout: 15000 }
          );

          return { success: true, deleted: res.data.metadata?.path_display ?? path };
        }

        case "createFolder": {
          const { folderPath } = config;
          if (!folderPath) return { success: false, error: "Dropbox createFolder: 'folderPath' is required.", skipped: true };

          const dropboxPath = folderPath.startsWith("/") ? folderPath : `/${folderPath}`;
          const res = await axios.post(
            `${API}/files/create_folder_v2`,
            { path: dropboxPath, autorename: false },
            { headers, timeout: 15000 }
          );

          return {
            success: true,
            id: res.data.metadata?.id,
            name: res.data.metadata?.name,
            path: res.data.metadata?.path_display,
          };
        }

        case "moveFile": {
          const { sourcePath, destPath } = config;
          if (!sourcePath) return { success: false, error: "Dropbox moveFile: 'sourcePath' is required.", skipped: true };
          if (!destPath) return { success: false, error: "Dropbox moveFile: 'destPath' is required.", skipped: true };

          const from = sourcePath.startsWith("/") ? sourcePath : `/${sourcePath}`;
          const to   = destPath.startsWith("/") ? destPath : `/${destPath}`;

          const res = await axios.post(
            `${API}/files/move_v2`,
            { from_path: from, to_path: to, autorename: false },
            { headers, timeout: 20000 }
          );

          return {
            success: true,
            id: res.data.metadata?.id,
            name: res.data.metadata?.name,
            path: res.data.metadata?.path_display,
          };
        }

        case "shareFile": {
          const { path, audience, access } = config;
          if (!path) return { success: false, error: "Dropbox shareFile: 'path' is required.", skipped: true };

          const dropboxPath = path.startsWith("/") ? path : `/${path}`;

          const res = await axios.post(
            `${API}/sharing/create_shared_link_with_settings`,
            {
              path: dropboxPath,
              settings: {
                requested_visibility: { ".tag": audience || "public" },
                audience: { ".tag": audience || "public" },
                access: { ".tag": access || "viewer" },
              },
            },
            { headers, timeout: 15000 }
          );

          return {
            success: true,
            url: res.data.url,
            id: res.data.id,
            name: res.data.name,
            path: res.data.path_display,
          };
        }

        case "getFileInfo": {
          const { path } = config;
          if (!path) return { success: false, error: "Dropbox getFileInfo: 'path' is required.", skipped: true };

          const dropboxPath = path.startsWith("/") ? path : `/${path}`;
          const res = await axios.post(
            `${API}/files/get_metadata`,
            { path: dropboxPath },
            { headers, timeout: 15000 }
          );

          return {
            success: true,
            id: res.data.id,
            name: res.data.name,
            path: res.data.path_display,
            tag: res.data[".tag"],
            size: res.data.size,
            clientModified: res.data.client_modified,
            serverModified: res.data.server_modified,
          };
        }

        case "searchFiles": {
          const { query, folderPath, limit } = config;
          if (!query) return { success: false, error: "Dropbox searchFiles: 'query' is required.", skipped: true };

          const body = {
            query,
            options: {
              path: folderPath ? (folderPath.startsWith("/") ? folderPath : `/${folderPath}`) : undefined,
              max_results: Number(limit || 20),
            },
          };

          const res = await axios.post(`${API}/files/search_v2`, body, { headers, timeout: 15000 });

          return {
            success: true,
            count: res.data.matches.length,
            hasMore: res.data.has_more,
            items: res.data.matches.map((m) => ({
              id: m.metadata?.metadata?.id,
              name: m.metadata?.metadata?.name,
              path: m.metadata?.metadata?.path_display,
              tag: m.metadata?.metadata?.[".tag"],
              size: m.metadata?.metadata?.size,
            })),
          };
        }

        default:
          return { success: false, error: `Dropbox: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      handleError(err);
    }
  },
};
