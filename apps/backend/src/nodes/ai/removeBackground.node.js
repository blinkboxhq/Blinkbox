import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const imageUrl = config.imageUrl || config.url || input?.imageUrl || input?.url;
    if (!imageUrl) return { success: false, error: "remove_background: 'imageUrl' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "RemoveBg"));
    if (!apiKey) throw new Error("remove_background: remove.bg API key required.");

    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("image_url", imageUrl);
    form.append("size", config.size || "auto");

    const res = await axios.post("https://api.remove.bg/v1.0/removebg", form, {
      headers: { "X-Api-Key": apiKey, ...form.getHeaders() },
      responseType: "arraybuffer",
      timeout: 60000,
    });
    const base64 = Buffer.from(res.data).toString("base64");
    return { result: `data:image/png;base64,${base64}`, format: "png", originalUrl: imageUrl };
  },
};
