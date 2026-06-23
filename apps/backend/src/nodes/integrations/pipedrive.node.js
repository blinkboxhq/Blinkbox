import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE_URL = "https://api.pipedrive.com/v1";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "Pipedrive");
}

function handleError(err) {
  if (err.message?.startsWith("Pipedrive")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.error ?? err.response?.data?.message ?? err.message;
  if (status === 401) throw new Error(`Pipedrive: Auth failed — ${msg}. Check your API token.`);
  if (status === 403) throw new Error(`Pipedrive: Permission denied — ${msg}.`);
  if (status === 404) throw new Error(`Pipedrive: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`Pipedrive: Bad request — ${msg}.`);
  if (status === 422) throw new Error(`Pipedrive: Validation error — ${msg}.`);
  if (status === 429) throw new Error(`Pipedrive: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`Pipedrive: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`Pipedrive: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "createDeal";

    if (!config.credentialId) {
      return { success: false, error: "Pipedrive: No credential selected.", skipped: true };
    }

    let apiToken;
    try {
      apiToken = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `Pipedrive: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const api = axios.create({
      baseURL: BASE_URL,
      params: { api_token: apiToken },
      timeout: 15000,
    });

    try {
      switch (operation) {
        case "listDeals": {
          const { data } = await api.get("/deals", {
            params: { limit: Math.min(Number(config.limit) || 25, 500), status: config.status || "all_not_deleted" },
          });
          return { success: true, deals: data.data ?? [], total: data.additional_data?.pagination?.more_items_in_collection };
        }

        case "getDeal": {
          if (!config.dealId) return { success: false, error: "Pipedrive getDeal: dealId required.", skipped: true };
          const { data } = await api.get(`/deals/${config.dealId}`);
          if (!data.data) return { success: false, error: `Pipedrive: Deal ${config.dealId} not found.`, skipped: true };
          return { success: true, ...data.data };
        }

        case "createDeal": {
          if (!config.title) return { success: false, error: "Pipedrive createDeal: title required.", skipped: true };
          const body = { title: config.title };
          if (config.value) body.value = Number(config.value) || config.value;
          if (config.currency) body.currency = config.currency;
          if (config.closeTime) body.close_time = config.closeTime;
          if (config.personId) body.person_id = Number(config.personId);
          if (config.orgId) body.org_id = Number(config.orgId);
          if (config.stageId) body.stage_id = Number(config.stageId);
          const { data } = await api.post("/deals", body);
          return { success: true, id: data.data?.id, title: data.data?.title, status: data.data?.status, value: data.data?.value };
        }

        case "updateDeal": {
          if (!config.dealId) return { success: false, error: "Pipedrive updateDeal: dealId required.", skipped: true };
          const body = {};
          if (config.title) body.title = config.title;
          if (config.value != null) body.value = Number(config.value) || config.value;
          if (config.currency) body.currency = config.currency;
          if (config.closeTime) body.close_time = config.closeTime;
          if (config.status) body.status = config.status;
          if (config.stageId) body.stage_id = Number(config.stageId);
          const { data } = await api.put(`/deals/${config.dealId}`, body);
          return { success: true, id: data.data?.id, title: data.data?.title, status: data.data?.status, value: data.data?.value };
        }

        case "listPersons": {
          const { data } = await api.get("/persons", {
            params: { limit: Math.min(Number(config.limit) || 25, 500) },
          });
          return { success: true, persons: data.data ?? [] };
        }

        case "createPerson": {
          if (!config.name) return { success: false, error: "Pipedrive createPerson: name required.", skipped: true };
          const body = { name: config.name };
          if (config.email) body.email = [{ value: config.email, primary: true }];
          if (config.phone) body.phone = [{ value: config.phone, primary: true }];
          if (config.orgId) body.org_id = Number(config.orgId);
          const { data } = await api.post("/persons", body);
          return { success: true, id: data.data?.id, name: data.data?.name, email: data.data?.email?.[0]?.value };
        }

        case "updatePerson": {
          if (!config.personId) return { success: false, error: "Pipedrive updatePerson: personId required.", skipped: true };
          const body = {};
          if (config.name) body.name = config.name;
          if (config.email) body.email = [{ value: config.email, primary: true }];
          if (config.phone) body.phone = [{ value: config.phone, primary: true }];
          const { data } = await api.put(`/persons/${config.personId}`, body);
          return { success: true, id: data.data?.id, name: data.data?.name };
        }

        case "listActivities": {
          const { data } = await api.get("/activities", {
            params: { limit: Math.min(Number(config.limit) || 25, 500), done: config.done ? 1 : 0 },
          });
          return { success: true, activities: data.data ?? [] };
        }

        case "createActivity": {
          if (!config.subject) return { success: false, error: "Pipedrive createActivity: subject required.", skipped: true };
          const body = {
            subject: config.subject,
            type: config.type || "call",
          };
          if (config.dueDate) body.due_date = config.dueDate;
          if (config.dueTime) body.due_time = config.dueTime;
          if (config.dealId) body.deal_id = Number(config.dealId);
          if (config.personId) body.person_id = Number(config.personId);
          if (config.note) body.note = config.note;
          const { data } = await api.post("/activities", body);
          return { success: true, id: data.data?.id, subject: data.data?.subject, type: data.data?.type };
        }

        case "createNote": {
          if (!config.content) return { success: false, error: "Pipedrive createNote: content required.", skipped: true };
          const body = { content: config.content };
          if (config.dealId) body.deal_id = Number(config.dealId);
          if (config.personId) body.person_id = Number(config.personId);
          const { data } = await api.post("/notes", body);
          return { success: true, id: data.data?.id, content: data.data?.content };
        }

        case "searchDeals": {
          if (!config.term) return { success: false, error: "Pipedrive searchDeals: term required.", skipped: true };
          const { data } = await api.get("/deals/search", {
            params: { term: config.term, limit: Math.min(Number(config.limit) || 25, 500) },
          });
          return { success: true, items: data.data?.items ?? [], total: data.data?.items?.length ?? 0 };
        }

        default:
          throw new Error(`Pipedrive: Unknown operation "${operation}".`);
      }
    } catch (err) {
      handleError(err);
    }
  },
};
