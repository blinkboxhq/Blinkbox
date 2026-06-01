import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.typeform.com";

function handleError(err) {
  if (err.message?.startsWith("Typeform")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.description ?? err.response?.data?.message ?? err.message;
  if (status === 401) throw new Error(`Typeform: Authentication failed — check your personal access token.`);
  if (status === 403) throw new Error(`Typeform: Permission denied — ${msg}`);
  if (status === 404) throw new Error(`Typeform: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`Typeform: Bad request — ${msg}`);
  if (status === 422) throw new Error(`Typeform: Validation error — ${msg}`);
  if (status === 429) throw new Error(`Typeform: Rate limit exceeded — slow down requests.`);
  throw new Error(`Typeform: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "listResponses" } = config;

    if (!config.credentialId) return { success: false, error: "Typeform: No credential selected.", skipped: true };

    let token;
    try {
      token = await getOAuthToken(config.credentialId, context.workspaceId, "Typeform");
    } catch (e) {
      return { success: false, error: `Typeform: Could not resolve credential — ${e.message}`, skipped: true };
    }
    if (!token) return { success: false, error: "Typeform: personal access token is required.", skipped: true };

    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    try {
      switch (operation) {
        case "listForms": {
          const res = await axios.get(`${BASE}/forms`, { headers, params: { page_size: 200 }, timeout: 15000 });
          return { items: res.data.items ?? [], total_items: res.data.total_items ?? 0, page_count: res.data.page_count ?? 0 };
        }

        case "getForm": {
          if (!config.formId) return { success: false, error: "Typeform getForm: 'formId' is required.", skipped: true };
          const res = await axios.get(`${BASE}/forms/${config.formId}`, { headers, timeout: 15000 });
          return res.data;
        }

        case "listResponses": {
          if (!config.formId) return { success: false, error: "Typeform listResponses: 'formId' is required.", skipped: true };
          const params = { page_size: Math.min(Number(config.pageSize ?? 25), 1000) };
          if (config.since) params.since = config.since;
          if (config.includeHidden) params.fields = "hidden";
          const res = await axios.get(`${BASE}/forms/${config.formId}/responses`, { headers, params, timeout: 20000 });
          return {
            items: res.data.items ?? [],
            total_items: res.data.total_items ?? 0,
            page_count: res.data.page_count ?? 0,
          };
        }

        case "getResponse": {
          if (!config.formId) return { success: false, error: "Typeform getResponse: 'formId' is required.", skipped: true };
          if (!config.responseToken) return { success: false, error: "Typeform getResponse: 'responseToken' is required.", skipped: true };
          const res = await axios.get(`${BASE}/forms/${config.formId}/responses`, {
            headers,
            params: { included_tokens: config.responseToken },
            timeout: 15000,
          });
          const items = res.data.items ?? [];
          const match = items.find((r) => r.token === config.responseToken);
          return match ?? { items, total_items: res.data.total_items };
        }

        case "createForm": {
          if (!config.title) return { success: false, error: "Typeform createForm: 'title' is required.", skipped: true };
          const body = { title: config.title };
          if (config.fields) {
            try {
              body.fields = typeof config.fields === "string" ? JSON.parse(config.fields) : config.fields;
            } catch {
              return { success: false, error: "Typeform createForm: 'fields' must be valid JSON.", skipped: true };
            }
          }
          const res = await axios.post(`${BASE}/forms`, body, { headers, timeout: 15000 });
          return { id: res.data.id, title: res.data.title, _links: res.data._links };
        }

        case "deleteResponse": {
          if (!config.formId) return { success: false, error: "Typeform deleteResponse: 'formId' is required.", skipped: true };
          if (!config.responseToken) return { success: false, error: "Typeform deleteResponse: 'responseToken' is required.", skipped: true };
          await axios.delete(`${BASE}/forms/${config.formId}/responses`, {
            headers,
            params: { included_tokens: config.responseToken },
            timeout: 15000,
          });
          return { deleted: true, formId: config.formId, token: config.responseToken };
        }

        default:
          throw new Error(`Typeform: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
