import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.files) return input;
    const token = await getOAuthToken(config.credentialId, config.workspaceId, "OneDrive");
    const headers = { Authorization: `Bearer ${token}` };
    const base = "https://graph.microsoft.com/v1.0/me/drive";
    let endpoint = config.folderId ? `${base}/items/${config.folderId}/children` : `${base}/root/children`;
    const params = { $top: Math.min(config.maxResults || 20, 200), $orderby: "lastModifiedDateTime desc", $select: "id,name,size,file,folder,webUrl,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy,parentReference,@microsoft.graph.downloadUrl" };
    if (config.query) { endpoint = `${base}/root/search(q='${config.query}')`; }
    const { data } = await axios.get(endpoint, { headers, params, timeout: 15000 });
    const files = (data?.value ?? []).map(f => ({
      id: f.id, name: f.name, isFolder: !!f.folder, mimeType: f.file?.mimeType,
      size: f.size, webUrl: f.webUrl, downloadUrl: f["@microsoft.graph.downloadUrl"],
      parentId: f.parentReference?.id, parentPath: f.parentReference?.path,
      createdBy: f.createdBy?.user?.displayName, modifiedBy: f.lastModifiedBy?.user?.displayName,
      createdAt: f.createdDateTime, modifiedAt: f.lastModifiedDateTime,
    }));
    return { folderId: config.folderId || "root", files, count: files.length, latestFile: files[0] ?? null, triggeredAt: new Date().toISOString() };
  },
};
