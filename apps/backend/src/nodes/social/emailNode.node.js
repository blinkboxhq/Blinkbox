import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context) {
    const to = config.to || input?.to;
    const subject = config.subject || input?.subject || "No Subject";
    const body = config.body || config.html || input?.body || input?.html || input?.text || "";
    if (!to) return { success: false, error: "email: 'to' is required.", skipped: true };

    const sgKey = config.apiKey || process.env.SENDGRID_API_KEY || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "SendGrid").catch(() => null));
    if (sgKey) {
      const res = await axios.post("https://api.sendgrid.com/v3/mail/send", {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.from || process.env.FROM_EMAIL || "noreply@blinkbox.io" },
        subject,
        content: [{ type: config.html ? "text/html" : "text/plain", value: body }],
      }, { headers: { Authorization: `Bearer ${sgKey}` }, timeout: 30000 });
      return { sent: true, to, subject, provider: "sendgrid", statusCode: res.status };
    }

    throw new Error("email: Configure an email credential (SendGrid API key) to send emails.");
  },
};
