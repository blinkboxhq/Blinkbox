import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const operation = config.operation || "read";
    const docId = config.docId || input?.docId;
    const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Google"));
    if (!token) throw new Error("google_docs: Google OAuth access token required.");

    const headers = { Authorization: `Bearer ${token}` };

    if (operation === "read") {
      if (!docId) return { success: false, error: "google_docs: 'docId' is required.", skipped: true };
      const res = await axios.get(`https://docs.googleapis.com/v1/documents/${docId}`, { headers });
      const body = res.data.body?.content || [];
      const text = body.flatMap((el) => el.paragraph?.elements?.map((e) => e.textRun?.content || "") || []).join("");
      return { docId, title: res.data.title, text, content: res.data.body };
    }
    if (operation === "create") {
      const res = await axios.post("https://docs.googleapis.com/v1/documents", { title: config.title || "New Document" }, { headers });
      return { docId: res.data.documentId, title: res.data.title, url: `https://docs.google.com/document/d/${res.data.documentId}` };
    }
    if (operation === "append") {
      if (!docId) return { success: false, error: "google_docs: 'docId' is required.", skipped: true };
      const text = config.text || input?.text || "";
      const res = await axios.post(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        requests: [{ insertText: { location: { index: 1 }, text } }],
      }, { headers });
      return { docId, revised: res.data.documentId };
    }
    throw new Error(`google_docs: Unknown operation "${operation}".`);
  },
};
