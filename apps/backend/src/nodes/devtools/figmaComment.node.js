import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const mode = config.mode || "post";
    const fileKey = config.fileKey || input?.fileKey;
    const token = config.apiToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Figma"));
    if (!token) throw new Error("figma_comment: Figma Personal Access Token required.");
    if (!fileKey) return { success: false, error: "figma_comment: 'fileKey' is required.", skipped: true };

    const headers = { "X-Figma-Token": token, "Content-Type": "application/json" };
    const base = `https://api.figma.com/v1/files/${fileKey}/comments`;

    if (mode === "list") {
      const res = await axios.get(base, { headers });
      const comments = (res.data.comments || []).map((c) => ({ id: c.id, message: c.message, author: c.user?.handle, resolved: !!c.resolved_at, createdAt: c.created_at }));
      return { comments, count: comments.length };
    }
    if (mode === "post") {
      const body = { message: config.message || input?.message };
      if (config.nodeId) body.client_meta = { node_id: config.nodeId, node_offset: { x: parseFloat(config.x || 0), y: parseFloat(config.y || 0) } };
      const res = await axios.post(base, body, { headers });
      return { commentId: res.data.id, message: res.data.message, createdAt: res.data.created_at, fileKey };
    }
    if (mode === "reply") {
      const res = await axios.post(base, { message: config.message, comment_id: config.commentId }, { headers });
      return { commentId: res.data.id, parentId: config.commentId, message: res.data.message, createdAt: res.data.created_at };
    }
    if (mode === "resolve") {
      await axios.delete(`${base}/${config.commentId}`, { headers });
      return { commentId: config.commentId, resolved: true };
    }
    throw new Error(`figma_comment: Unknown mode "${mode}".`);
  },
};
