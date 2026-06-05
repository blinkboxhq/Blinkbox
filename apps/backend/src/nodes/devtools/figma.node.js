import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const operation = config.operation || "getFile";
    const fileKey = config.fileKey || input?.fileKey;
    const token = config.apiToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Figma"));
    if (!token) throw new Error("figma: Figma Personal Access Token required.");
    if (!fileKey) return { success: false, error: "figma: 'fileKey' is required.", skipped: true };

    const headers = { "X-Figma-Token": token };
    const base = "https://api.figma.com/v1";

    if (operation === "getFile") {
      const res = await axios.get(`${base}/files/${fileKey}`, { headers, params: { depth: config.depth || 2 } });
      return { name: res.data.name, lastModified: res.data.lastModified, thumbnailUrl: res.data.thumbnailUrl, version: res.data.version, pages: res.data.document?.children?.map((c) => ({ id: c.id, name: c.name })) };
    }
    if (operation === "getComponents") {
      const res = await axios.get(`${base}/files/${fileKey}/components`, { headers });
      return { components: res.data.meta?.components || [], count: (res.data.meta?.components || []).length };
    }
    if (operation === "exportImage") {
      const nodeId = config.nodeId || input?.nodeId;
      if (!nodeId) return { success: false, error: "figma exportImage: 'nodeId' required.", skipped: true };
      const res = await axios.get(`${base}/images/${fileKey}`, { headers, params: { ids: nodeId, format: config.format || "png", scale: config.scale || 2 } });
      return { images: res.data.images, err: res.data.err };
    }
    throw new Error(`figma: Unknown operation "${operation}".`);
  },
};
