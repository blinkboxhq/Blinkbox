/**
 * HUBSPOT NODE
 * CRM operations via HubSpot API v3.
 *
 * Operations:
 *   createContact      — Create a new contact
 *   getContact         — Get contact by ID or email
 *   updateContact      — Update contact properties
 *   searchContacts     — Search contacts by property filter
 *   createDeal         — Create a deal
 *   getDeal            — Get deal by ID
 *   updateDeal         — Update deal properties
 *   createNote         — Create an engagement note (with optional associations)
 *   associateObjects   — Associate two CRM objects (e.g. contact → deal)
 *   listOwners         — List all HubSpot owners
 *
 * Auth: HubSpot Private App access token stored in vault (pat-...)
 */

import axios from "axios";
import { getOAuthToken } from "../../utils/getOAuthToken.js";

const BASE = "https://api.hubapi.com";

async function getToken(credentialId, workspaceId) {
  return getOAuthToken(credentialId, workspaceId, "HubSpot");
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function handleError(err) {
  if (err.message?.startsWith("HubSpot")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.response?.data?.errors?.[0]?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`HubSpot: Auth failed — ${msg}. Check your Private App token.`);
  if (status === 404) throw new Error(`HubSpot: Resource not found — ${msg}.`);
  if (status === 400) throw new Error(`HubSpot: Bad request — ${msg}.`);
  if (status === 409) throw new Error(`HubSpot: Conflict — ${msg}. A contact with this email may already exist.`);
  if (status === 429) throw new Error(`HubSpot: Rate limit exceeded — slow down requests.`);
  if (status >= 500) throw new Error(`HubSpot: Server error (${status}) — ${msg}. Try again later.`);
  throw new Error(`HubSpot: ${status ?? "Error"} — ${msg}`);
}

function parseExtra(value, fieldName) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`HubSpot ${fieldName}: must be valid JSON.`);
  }
}

export default {
  async run(config, input, context = {}) {
    const { operation = "createContact" } = config;

    if (!config.credentialId) {
      return { success: false, error: "HubSpot: No credential selected.", skipped: true };
    }

    let token;
    try {
      token = await getToken(config.credentialId, context.workspaceId);
    } catch (e) {
      return { success: false, error: `HubSpot: Could not resolve credential — ${e.message}`, skipped: true };
    }

    const h = headers(token);

    try {
      switch (operation) {
        case "createContact": {
          const properties = {};
          if (config.email) properties.email = config.email;
          if (config.firstName) properties.firstname = config.firstName;
          if (config.lastName) properties.lastname = config.lastName;
          if (config.phone) properties.phone = config.phone;
          if (config.company) properties.company = config.company;
          if (config.website) properties.website = config.website;
          if (config.jobTitle) properties.jobtitle = config.jobTitle;
          Object.assign(properties, parseExtra(config.extraProperties, "createContact extraProperties"));
          const res = await axios.post(`${BASE}/crm/v3/objects/contacts`, { properties }, { headers: h, timeout: 15000 });
          return { id: res.data.id, email: res.data.properties?.email, firstName: res.data.properties?.firstname, lastName: res.data.properties?.lastname, createdAt: res.data.createdAt };
        }

        case "getContact": {
          if (!config.contactId && !config.email) return { success: false, error: "HubSpot getContact: contactId or email is required.", skipped: true };
          const props = "email,firstname,lastname,phone,company,website,jobtitle,hubspot_owner_id";
          if (config.email && !config.contactId) {
            const res = await axios.post(`${BASE}/crm/v3/objects/contacts/search`, {
              filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: config.email }] }],
              properties: props.split(","),
            }, { headers: h, timeout: 15000 });
            const contact = res.data.results?.[0];
            if (!contact) return { found: false };
            return { id: contact.id, ...contact.properties, found: true };
          }
          const res = await axios.get(`${BASE}/crm/v3/objects/contacts/${config.contactId}`, { headers: h, timeout: 15000, params: { properties: props } });
          return { id: res.data.id, ...res.data.properties };
        }

        case "updateContact": {
          if (!config.contactId) return { success: false, error: "HubSpot updateContact: contactId is required.", skipped: true };
          const properties = {};
          if (config.email) properties.email = config.email;
          if (config.firstName) properties.firstname = config.firstName;
          if (config.lastName) properties.lastname = config.lastName;
          if (config.phone) properties.phone = config.phone;
          if (config.company) properties.company = config.company;
          if (config.website) properties.website = config.website;
          if (config.jobTitle) properties.jobtitle = config.jobTitle;
          Object.assign(properties, parseExtra(config.extraProperties, "updateContact extraProperties"));
          await axios.patch(`${BASE}/crm/v3/objects/contacts/${config.contactId}`, { properties }, { headers: h, timeout: 15000 });
          return { updated: true, contactId: config.contactId };
        }

        case "deleteContact": {
          if (!config.contactId) return { success: false, error: "HubSpot deleteContact: contactId is required.", skipped: true };
          await axios.delete(`${BASE}/crm/v3/objects/contacts/${config.contactId}`, { headers: h, timeout: 15000 });
          return { deleted: true, contactId: config.contactId };
        }

        case "searchContacts": {
          const filterGroups = parseExtra(config.filterGroups, "searchContacts filterGroups");
          const body = {
            filterGroups: Array.isArray(filterGroups) ? filterGroups : [],
            query: config.query || undefined,
            limit: Math.min(Number(config.limit ?? 20), 100),
            properties: ["email", "firstname", "lastname", "phone", "company", "hubspot_owner_id"],
          };
          const res = await axios.post(`${BASE}/crm/v3/objects/contacts/search`, body, { headers: h, timeout: 15000 });
          return { contacts: res.data.results?.map((c) => ({ id: c.id, ...c.properties })) ?? [], total: res.data.total };
        }

        case "createDeal": {
          if (!config.dealName) return { success: false, error: "HubSpot createDeal: dealName is required.", skipped: true };
          const properties = { dealname: config.dealName };
          if (config.amount) properties.amount = String(config.amount);
          if (config.stage) properties.dealstage = config.stage;
          if (config.closeDate) properties.closedate = config.closeDate;
          if (config.ownerId) properties.hubspot_owner_id = String(config.ownerId);
          if (config.pipeline) properties.pipeline = config.pipeline;
          const res = await axios.post(`${BASE}/crm/v3/objects/deals`, { properties }, { headers: h, timeout: 15000 });
          return { id: res.data.id, dealName: res.data.properties?.dealname, stage: res.data.properties?.dealstage, amount: res.data.properties?.amount, createdAt: res.data.createdAt };
        }

        case "getDeal": {
          if (!config.dealId) return { success: false, error: "HubSpot getDeal: dealId is required.", skipped: true };
          const res = await axios.get(`${BASE}/crm/v3/objects/deals/${config.dealId}`, { headers: h, timeout: 15000, params: { properties: "dealname,amount,dealstage,closedate,hubspot_owner_id,pipeline" } });
          return { id: res.data.id, ...res.data.properties };
        }

        case "updateDeal": {
          if (!config.dealId) return { success: false, error: "HubSpot updateDeal: dealId is required.", skipped: true };
          const properties = {};
          if (config.dealName) properties.dealname = config.dealName;
          if (config.amount) properties.amount = String(config.amount);
          if (config.stage) properties.dealstage = config.stage;
          if (config.closeDate) properties.closedate = config.closeDate;
          if (config.ownerId) properties.hubspot_owner_id = String(config.ownerId);
          await axios.patch(`${BASE}/crm/v3/objects/deals/${config.dealId}`, { properties }, { headers: h, timeout: 15000 });
          return { updated: true, dealId: config.dealId };
        }

        case "createNote": {
          if (!config.body) return { success: false, error: "HubSpot createNote: body is required.", skipped: true };
          const properties = { hs_note_body: config.body, hs_timestamp: new Date().toISOString() };
          const payload = { properties };
          const associations = [];
          if (config.contactId) associations.push({ to: { id: config.contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] });
          if (config.dealId) associations.push({ to: { id: config.dealId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }] });
          if (associations.length) payload.associations = associations;
          const res = await axios.post(`${BASE}/crm/v3/objects/notes`, payload, { headers: h, timeout: 15000 });
          return { id: res.data.id, createdAt: res.data.createdAt };
        }

        case "associateObjects": {
          const { fromType, fromId, toType, toId, associationTypeId } = config;
          if (!fromType || !fromId || !toType || !toId) return { success: false, error: "HubSpot associateObjects: fromType, fromId, toType, toId are required.", skipped: true };
          await axios.put(
            `${BASE}/crm/v3/objects/${fromType}/${fromId}/associations/${toType}/${toId}/${associationTypeId || "contact_to_deal"}`,
            {},
            { headers: h, timeout: 15000 }
          );
          return { associated: true, from: `${fromType}/${fromId}`, to: `${toType}/${toId}` };
        }

        case "listOwners": {
          const res = await axios.get(`${BASE}/crm/v3/owners`, { headers: h, timeout: 15000, params: { limit: 100 } });
          return { owners: res.data.results?.map((o) => ({ id: o.id, email: o.email, firstName: o.firstName, lastName: o.lastName })) ?? [], count: res.data.results?.length ?? 0 };
        }

        default:
          throw new Error(`HubSpot: Unknown operation "${operation}".`);
      }
    } catch (err) {
      handleError(err);
    }
  },
};
