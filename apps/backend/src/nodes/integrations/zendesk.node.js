/**
 * ZENDESK NODE — slim entry. Auth only; delegates to packages/nodes/zendesk.
 *
 * Auth: API token + agent email stored in vault as JSON { "email": "...", "token": "..." }
 * (or raw token with config.email). Basic auth: `${email}/token` : `${token}`.
 * Per-account base: https://{subdomain}.zendesk.com/api/v2
 */
import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";
import { run as runZendesk, OPERATIONS, DEFAULT_OPERATION } from "../_packaged/zendesk/router.js";

async function getCreds(credentialId, workspaceId) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Zendesk");
  let token, email;
  try {
    const j = JSON.parse(raw);
    token = j.token;
    email = j.email;
  } catch {
    token = raw;
  }
  return { token, email };
}

export default {
  async run(config, input, context = {}) {
    const op = config.operation || DEFAULT_OPERATION;
    if (!OPERATIONS[op]) return { success: false, error: `Zendesk: Unknown operation "${op}".`, skipped: true };

    const subdomain = config.subdomain || input?.subdomain || "";
    if (!subdomain) return { success: false, error: "Zendesk: 'subdomain' is required (e.g. 'mycompany').", skipped: true };
    if (!config.credentialId) return { success: false, error: "Zendesk: No credential selected.", skipped: true };

    let token, email;
    try {
      ({ token, email } = await getCreds(config.credentialId, context.workspaceId));
    } catch (e) {
      return { success: false, error: `Zendesk: Could not resolve credential — ${e.message}`, skipped: true };
    }
    email = email || config.email;
    if (!token) return { success: false, error: "Zendesk: API token missing from credential.", skipped: true };
    if (!email) return { success: false, error: "Zendesk: Agent email missing — store credential as JSON { email, token }.", skipped: true };

    const sub = String(subdomain).replace(/\.zendesk\.com.*$/, "").replace(/^https?:\/\//, "");
    const api = axios.create({
      baseURL: `https://${sub}.zendesk.com/api/v2`,
      auth: { username: `${email}/token`, password: token },
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    return runZendesk(config, { api });
  },
};
