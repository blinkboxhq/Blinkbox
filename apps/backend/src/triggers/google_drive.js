import axios from "axios";
import { getOAuthToken } from "../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.files || input?.file) {
      const f = input?.file ?? input?.files?.[0] ?? input;
      return normalizeFile(f, input?.changeType);
    }
    const token = await getOAuthToken(config.credentialId, config.workspaceId, "Google Drive");
    const params = {
      pageSize: Math.min(config.maxResults || 10, 100),
      fields: "files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,iconLink,parents,owners,createdTime,modifiedTime,trashed)",
      orderBy: "modifiedTime desc",
    };
    if (config.folderId) params.q = `'${config.folderId}' in parents and trashed=false`;
    else if (config.query) params.q = config.query;
    else params.q = "trashed=false";
    if (config.mimeType) params.q = `${params.q} and mimeType='${config.mimeType}'`;
    const { data } = await axios.get("https://www.googleapis.com/drive/v3/files", { params, headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
    const files = (data?.files ?? []).map(f => normalizeFile(f));
    return { files, count: files.length, latestFile: files[0] ?? null, folderId: config.folderId, triggeredAt: new Date().toISOString() };
  },
};

function normalizeFile(f, changeType) {
  return {
    changeType: changeType || "modified", id: f?.id, name: f?.name, mimeType: f?.mimeType,
    isFolder: f?.mimeType === "application/vnd.google-apps.folder",
    isGoogleDoc: f?.mimeType?.includes("google-apps"),
    size: f?.size ? parseInt(f.size) : null,
    webViewLink: f?.webViewLink, downloadLink: f?.webContentLink,
    thumbnailLink: f?.thumbnailLink, iconLink: f?.iconLink,
    parents: f?.parents ?? [], owner: f?.owners?.[0]?.emailAddress,
    createdAt: f?.createdTime, modifiedAt: f?.modifiedTime, trashed: f?.trashed ?? false,
  };
}
