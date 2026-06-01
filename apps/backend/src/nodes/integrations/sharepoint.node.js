import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const GRAPH = "https://graph.microsoft.com/v1.0";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listFiles";
    const siteId = config.siteId || input.siteId || "";

    let token;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "SharePoint");
      token = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!token) return { success: false, error: "SharePoint: Microsoft OAuth token required.", skipped: true };
    const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    try {
      switch (operation) {
        case "listSites": {
          const { data } = await axios.get(`${GRAPH}/sites?search=*`, { headers: h, timeout: 15000 });
          return { sites: data.value.map(s => ({ id: s.id, name: s.displayName, webUrl: s.webUrl })), count: data.value.length };
        }
        case "listFiles": {
          if (!siteId) return { success: false, error: "SharePoint listFiles: 'siteId' required.", skipped: true };
          const driveId = config.driveId;
          const base = driveId ? `${GRAPH}/sites/${siteId}/drives/${driveId}` : `${GRAPH}/sites/${siteId}/drive`;
          const folderId = config.folderId || "root";
          const { data } = await axios.get(`${base}/items/${folderId}/children`, { headers: h, timeout: 15000 });
          return { files: data.value.map(f => ({ id: f.id, name: f.name, size: f.size, webUrl: f.webUrl, folder: !!f.folder })), count: data.value.length };
        }
        case "uploadFile": {
          if (!siteId) return { success: false, error: "SharePoint uploadFile: 'siteId' required.", skipped: true };
          const fileName = config.fileName || input.fileName || "upload.txt";
          const content = config.content || input.content || "";
          const base = `${GRAPH}/sites/${siteId}/drive`;
          const { data } = await axios.put(`${base}/root:/${fileName}:/content`, content, { headers: { ...h, "Content-Type": "text/plain" }, timeout: 30000 });
          return { id: data.id, name: data.name, webUrl: data.webUrl, size: data.size };
        }
        case "downloadFile": {
          const itemId = config.itemId || input.itemId;
          if (!siteId || !itemId) return { success: false, error: "SharePoint downloadFile: 'siteId' and 'itemId' required.", skipped: true };
          const { data: meta } = await axios.get(`${GRAPH}/sites/${siteId}/drive/items/${itemId}`, { headers: h, timeout: 10000 });
          const { data: content } = await axios.get(meta["@microsoft.graph.downloadUrl"], { responseType: "text", timeout: 30000 });
          return { content, name: meta.name, size: meta.size };
        }
        case "searchFiles": {
          if (!siteId) return { success: false, error: "SharePoint searchFiles: 'siteId' required.", skipped: true };
          const q = config.query || input.query || "";
          const { data } = await axios.get(`${GRAPH}/sites/${siteId}/drive/root/search(q='${encodeURIComponent(q)}')`, { headers: h, timeout: 15000 });
          return { files: data.value.map(f => ({ id: f.id, name: f.name, size: f.size, webUrl: f.webUrl })), count: data.value.length, query: q };
        }
        case "createFolder": {
          if (!siteId) return { success: false, error: "SharePoint createFolder: 'siteId' required.", skipped: true };
          const folderName = config.folderName || input.folderName;
          if (!folderName) return { success: false, error: "SharePoint createFolder: 'folderName' required.", skipped: true };
          const { data } = await axios.post(`${GRAPH}/sites/${siteId}/drive/root/children`,
            { name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "rename" },
            { headers: h, timeout: 15000 });
          return { id: data.id, name: data.name, webUrl: data.webUrl };
        }
        case "deleteFile": {
          const itemId = config.itemId || input.itemId;
          if (!siteId || !itemId) return { success: false, error: "SharePoint deleteFile: 'siteId' and 'itemId' required.", skipped: true };
          await axios.delete(`${GRAPH}/sites/${siteId}/drive/items/${itemId}`, { headers: h, timeout: 15000 });
          return { deleted: true, itemId };
        }
        default:
          return { success: false, error: `SharePoint: Unknown operation "${operation}".`, skipped: true };
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      if (status === 401 || status === 403) throw new Error(`SharePoint: Auth failed — ${msg}. Refresh your Microsoft OAuth token.`);
      if (status === 404) throw new Error(`SharePoint: Resource not found — check siteId/itemId.`);
      if (status === 409) throw new Error(`SharePoint: Conflict — file or folder already exists.`);
      if (status === 429) throw new Error(`SharePoint: Rate limit exceeded. Add a Delay node.`);
      throw new Error(`SharePoint: ${status || "Error"} — ${msg}`);
    }
  },
};
