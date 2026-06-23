/**
 * SALESFORCE NODE
 * CRM operations via Salesforce REST API.
 *
 * Operations:
 *   createRecord     — Create any SObject record (Account, Contact, Lead, Opportunity, etc.)
 *   getRecord        — Retrieve a record by ID
 *   updateRecord     — Update a record by ID
 *   deleteRecord     — Delete a record by ID
 *   queryRecords     — Run a SOQL query
 *   searchRecords    — SOSL search across objects
 *   upsertRecord     — Upsert by external ID field
 *   listObjects      — List all available SObject types
 *   describeObject   — Describe fields of an SObject
 *
 * Auth: OAuth access token stored in vault. The credential must also include
 *       the instance URL — stored as JSON: {"accessToken":"...", "instanceUrl":"https://xxx.my.salesforce.com"}
 *       OR as a plain access token (falls back to config.instanceUrl).
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const API_VERSION = "v59.0";

async function getCredentials(credentialId, workspaceId, configInstanceUrl) {
  const raw = await getOAuthToken(credentialId, workspaceId, "Salesforce");
  if (typeof raw === "object" && raw.accessToken) {
    return { accessToken: raw.accessToken, instanceUrl: raw.instanceUrl };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed.accessToken) return { accessToken: parsed.accessToken, instanceUrl: parsed.instanceUrl };
  } catch {
    // plain token — use instanceUrl from config
  }
  if (!configInstanceUrl) throw new Error("Salesforce credential must include instanceUrl, or set instanceUrl in node config.");
  return { accessToken: raw, instanceUrl: configInstanceUrl };
}

function handleError(err) {
  if (err.message?.startsWith("Salesforce")) throw err;
  const status = err.response?.status;
  const sfErrors = err.response?.data;
  const msg = Array.isArray(sfErrors) ? sfErrors[0]?.message : (sfErrors?.message ?? err.message);
  if (status === 401) throw new Error(`Salesforce: Auth failed — ${msg}. Token may be expired or invalid.`);
  if (status === 403) throw new Error(`Salesforce: Permission denied — ${msg}. Check object/field-level security.`);
  if (status === 404) throw new Error(`Salesforce: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`Salesforce: Bad request — ${msg}.`);
  if (status === 422) throw new Error(`Salesforce: Validation error — ${msg}.`);
  if (status === 429) throw new Error(`Salesforce: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`Salesforce: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`Salesforce: ${status ?? "Error"} — ${msg}`);
}

function parseFields(value, fieldName) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Salesforce ${fieldName}: must be valid JSON.`);
  }
}

export default {
  async run(config, input, context = {}) {
    const { operation = "queryRecords" } = config;

    if (!config.credentialId) {
      return { success: false, error: "Salesforce: No credential selected.", skipped: true };
    }

    let credentials;
    try {
      credentials = await getCredentials(config.credentialId, context.workspaceId, config.instanceUrl);
    } catch (e) {
      return { success: false, error: `Salesforce: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const { accessToken, instanceUrl } = credentials;
    const base = `${instanceUrl}/services/data/${API_VERSION}`;
    const h = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    try {
      switch (operation) {
        case "createRecord": {
          if (!config.objectType) return { success: false, error: "Salesforce createRecord: 'objectType' is required (e.g. Contact, Account).", skipped: true };
          const fields = parseFields(config.fields, "createRecord fields");
          if (!Object.keys(fields).length) return { success: false, error: "Salesforce createRecord: 'fields' (JSON object) is required.", skipped: true };
          const { data } = await axios.post(`${base}/sobjects/${encodeURIComponent(config.objectType)}`, fields, { headers: h, timeout: 15000 });
          return { success: true, id: data.id, created: data.success };
        }

        case "getRecord": {
          if (!config.objectType || !config.recordId) return { success: false, error: "Salesforce getRecord: 'objectType' and 'recordId' are required.", skipped: true };
          const params = config.fields ? { fields: config.fields } : {};
          const { data } = await axios.get(`${base}/sobjects/${encodeURIComponent(config.objectType)}/${encodeURIComponent(config.recordId)}`, { headers: h, timeout: 15000, params });
          return { success: true, ...data };
        }

        case "updateRecord": {
          if (!config.objectType || !config.recordId) return { success: false, error: "Salesforce updateRecord: 'objectType' and 'recordId' are required.", skipped: true };
          const fields = parseFields(config.fields, "updateRecord fields");
          if (!Object.keys(fields).length) return { success: false, error: "Salesforce updateRecord: 'fields' (JSON object) is required.", skipped: true };
          await axios.patch(`${base}/sobjects/${encodeURIComponent(config.objectType)}/${encodeURIComponent(config.recordId)}`, fields, { headers: h, timeout: 15000 });
          return { success: true, updated: true, recordId: config.recordId };
        }

        case "deleteRecord": {
          if (!config.objectType || !config.recordId) return { success: false, error: "Salesforce deleteRecord: 'objectType' and 'recordId' are required.", skipped: true };
          await axios.delete(`${base}/sobjects/${encodeURIComponent(config.objectType)}/${encodeURIComponent(config.recordId)}`, { headers: h, timeout: 15000 });
          return { success: true, deleted: true, recordId: config.recordId };
        }

        case "queryRecords": {
          if (!config.query) return { success: false, error: "Salesforce queryRecords: 'query' (SOQL) is required.", skipped: true };
          const { data } = await axios.get(`${base}/query`, { headers: h, timeout: 20000, params: { q: config.query } });
          return { success: true, records: data.records ?? [], totalSize: data.totalSize, done: data.done };
        }

        case "searchRecords": {
          if (!config.query) return { success: false, error: "Salesforce searchRecords: 'query' (SOSL) is required.", skipped: true };
          const { data } = await axios.get(`${base}/search`, { headers: h, timeout: 20000, params: { q: config.query } });
          return { success: true, searchRecords: data.searchRecords ?? [] };
        }

        case "upsertRecord": {
          if (!config.objectType || !config.externalIdField || !config.externalId) return { success: false, error: "Salesforce upsertRecord: 'objectType', 'externalIdField', and 'externalId' are required.", skipped: true };
          const fields = parseFields(config.fields, "upsertRecord fields");
          const { data } = await axios.patch(`${base}/sobjects/${encodeURIComponent(config.objectType)}/${encodeURIComponent(config.externalIdField)}/${encodeURIComponent(config.externalId)}`, fields, { headers: h, timeout: 15000 });
          return { success: true, id: data?.id, created: data?.created ?? null };
        }

        case "listObjects": {
          const { data } = await axios.get(`${base}/sobjects`, { headers: h, timeout: 20000 });
          const objects = data.sobjects?.map((o) => ({ name: o.name, label: o.label, queryable: o.queryable, createable: o.createable })) ?? [];
          return { success: true, objects, count: objects.length };
        }

        case "describeObject": {
          if (!config.objectType) return { success: false, error: "Salesforce describeObject: 'objectType' is required.", skipped: true };
          const { data } = await axios.get(`${base}/sobjects/${encodeURIComponent(config.objectType)}/describe`, { headers: h, timeout: 20000 });
          const fields = data.fields?.map((f) => ({ name: f.name, label: f.label, type: f.type, required: !f.nillable && !f.defaultedOnCreate })) ?? [];
          return { success: true, name: data.name, label: data.label, fields, fieldCount: fields.length };
        }

        default:
          throw new Error(`Salesforce: Unknown operation "${operation}".`);
      }
    } catch (err) {
      handleError(err);
    }
  },
};
