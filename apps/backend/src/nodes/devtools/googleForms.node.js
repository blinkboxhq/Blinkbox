import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const operation = config.operation || "getResponses";
    const formId = config.formId || input?.formId;
    const token = config.accessToken || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "Google"));
    if (!token) throw new Error("google_forms: Google OAuth access token required.");
    if (!formId) return { success: false, error: "google_forms: 'formId' is required.", skipped: true };

    const headers = { Authorization: `Bearer ${token}` };

    if (operation === "getResponses") {
      const res = await axios.get(`https://forms.googleapis.com/v1/forms/${formId}/responses`, { headers });
      const responses = (res.data.responses || []).map((r) => ({ responseId: r.responseId, createTime: r.createTime, answers: r.answers }));
      return { responses, count: responses.length, formId };
    }
    if (operation === "getForm") {
      const res = await axios.get(`https://forms.googleapis.com/v1/forms/${formId}`, { headers });
      return { formId, title: res.data.info?.title, description: res.data.info?.description, questions: res.data.items?.length || 0 };
    }
    throw new Error(`google_forms: Unknown operation "${operation}".`);
  },
};
