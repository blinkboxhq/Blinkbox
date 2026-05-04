import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE_URL = "https://api.pipedrive.com/v1";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "Pipedrive");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "createDeal";

    if (!config.credentialId) {
      return { success: false, error: "Pipedrive: credential required.", skipped: true };
    }

    const apiToken = await getToken(config.credentialId, context.workspaceId);

    const api = axios.create({
      baseURL: BASE_URL,
      params: { api_token: apiToken },
    });

    switch (operation) {
      case "listDeals": {
        const { data } = await api.get("/deals", {
          params: { limit: Number(config.limit) || 25, status: config.status || "all_not_deleted" },
        });
        return { success: true, deals: data.data, total: data.additional_data?.pagination?.more_items_in_collection };
      }

      case "getDeal": {
        if (!config.dealId) return { success: false, error: "Pipedrive: dealId required.", skipped: true };
        const { data } = await api.get(`/deals/${config.dealId}`);
        return { success: true, ...data.data };
      }

      case "createDeal": {
        if (!config.title) return { success: false, error: "Pipedrive: title required.", skipped: true };
        const body = { title: config.title };
        if (config.value) body.value = config.value;
        if (config.currency) body.currency = config.currency;
        if (config.closeTime) body.close_time = config.closeTime;
        const { data } = await api.post("/deals", body);
        return { success: true, ...data.data };
      }

      case "updateDeal": {
        if (!config.dealId) return { success: false, error: "Pipedrive: dealId required.", skipped: true };
        const body = {};
        if (config.title) body.title = config.title;
        if (config.value) body.value = config.value;
        if (config.currency) body.currency = config.currency;
        if (config.closeTime) body.close_time = config.closeTime;
        if (config.status) body.status = config.status;
        const { data } = await api.put(`/deals/${config.dealId}`, body);
        return { success: true, ...data.data };
      }

      case "listPersons": {
        const { data } = await api.get("/persons", {
          params: { limit: Number(config.limit) || 25 },
        });
        return { success: true, persons: data.data };
      }

      case "createPerson": {
        if (!config.name) return { success: false, error: "Pipedrive: name required.", skipped: true };
        const body = { name: config.name };
        if (config.email) body.email = [{ value: config.email, primary: true }];
        if (config.phone) body.phone = [{ value: config.phone, primary: true }];
        const { data } = await api.post("/persons", body);
        return { success: true, ...data.data };
      }

      case "updatePerson": {
        if (!config.personId) return { success: false, error: "Pipedrive: personId required.", skipped: true };
        const body = {};
        if (config.name) body.name = config.name;
        if (config.email) body.email = [{ value: config.email, primary: true }];
        if (config.phone) body.phone = [{ value: config.phone, primary: true }];
        const { data } = await api.put(`/persons/${config.personId}`, body);
        return { success: true, ...data.data };
      }

      case "listActivities": {
        const { data } = await api.get("/activities", {
          params: { limit: Number(config.limit) || 25, done: config.done || 0 },
        });
        return { success: true, activities: data.data };
      }

      case "createActivity": {
        if (!config.subject) return { success: false, error: "Pipedrive: subject required.", skipped: true };
        const body = {
          subject: config.subject,
          type: config.type || "call",
        };
        if (config.dueDate) body.due_date = config.dueDate;
        if (config.dealId) body.deal_id = config.dealId;
        const { data } = await api.post("/activities", body);
        return { success: true, ...data.data };
      }

      case "createNote": {
        if (!config.content) return { success: false, error: "Pipedrive: content required.", skipped: true };
        const body = { content: config.content };
        if (config.dealId) body.deal_id = config.dealId;
        const { data } = await api.post("/notes", body);
        return { success: true, ...data.data };
      }

      case "searchDeals": {
        if (!config.term) return { success: false, error: "Pipedrive: term required.", skipped: true };
        const { data } = await api.get("/deals/search", {
          params: { term: config.term, limit: Number(config.limit) || 25 },
        });
        return { success: true, items: data.data?.items };
      }

      default:
        return { success: false, error: `Pipedrive: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
