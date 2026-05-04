/**
 * HUBSPOT NODE
 * CRM operations via HubSpot API v3.
 *
 * Operations:
 *   createContact  — Create a new contact
 *   getContact     — Get contact by ID or email
 *   updateContact  — Update contact properties
 *   searchContacts — Search contacts by property filter
 *   createDeal     — Create a deal
 *   getDeal        — Get deal by ID
 *   updateDeal     — Update deal properties
 *   createNote     — Create an engagement note
 *   listOwners     — List all HubSpot owners
 *
 * Auth: HubSpot Private App access token stored in vault (pat-...)
 */

import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

const BASE = "https://api.hubapi.com";

async function getToken(credentialId, workspaceId) {
  const cred = await resolveCredential(credentialId, workspaceId, "HubSpot");
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function handleError(err) {
  if (err.message?.startsWith("HubSpot")) throw err;
  const status = err.response?.status;
  const msg = err.response?.data?.message ?? err.message;
  if (status === 401 || status === 403) throw new Error(`HubSpot: Auth failed — ${msg}. Check your Private App token.`);
  if (status === 404) throw new Error(`HubSpot: Resource not found — ${msg}`);
  if (status === 400) throw new Error(`HubSpot: Bad request — ${msg}`);
  throw new Error(`HubSpot: ${status ?? "Error"} — ${msg}`);
}

export default {
  async run(config, input, context = {}) {
    const { operation = "createContact" } = config;
    const token = await getToken(config.credentialId, context.workspaceId);
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
          if (config.extraProperties) Object.assign(properties, typeof config.extraProperties === "string" ? JSON.parse(config.extraProperties) : config.extraProperties);
          const res = await axios.post(`${BASE}/crm/v3/objects/contacts`, { properties }, { headers: h, timeout: 15000 });
          return { id: res.data.id, email: res.data.properties?.email, createdAt: res.data.createdAt };
        }

        case "getContact": {
          if (!config.contactId && !config.email) return { success: false, error: "HubSpot getContact: 'contactId' or 'email' is required — configure this field.", skipped: true };
          if (config.email) {
            const res = await axios.post(`${BASE}/crm/v3/objects/contacts/search`, {
              filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: config.email }] }],
              properties: ["email", "firstname", "lastname", "phone", "company"],
            }, { headers: h, timeout: 15000 });
            const contact = res.data.results?.[0];
            if (!contact) return { found: false };
            return { id: contact.id, ...contact.properties, found: true };
          }
          const res = await axios.get(`${BASE}/crm/v3/objects/contacts/${config.contactId}`, { headers: h, timeout: 15000, params: { properties: "email,firstname,lastname,phone,company" } });
          return { id: res.data.id, ...res.data.properties };
        }

        case "updateContact": {
          if (!config.contactId) return { success: false, error: "HubSpot updateContact: 'contactId' is required — configure this field.", skipped: true };
          const properties = {};
          if (config.email) properties.email = config.email;
          if (config.firstName) properties.firstname = config.firstName;
          if (config.lastName) properties.lastname = config.lastName;
          if (config.phone) properties.phone = config.phone;
          if (config.company) properties.company = config.company;
          if (config.extraProperties) Object.assign(properties, typeof config.extraProperties === "string" ? JSON.parse(config.extraProperties) : config.extraProperties);
          await axios.patch(`${BASE}/crm/v3/objects/contacts/${config.contactId}`, { properties }, { headers: h, timeout: 15000 });
          return { updated: true, contactId: config.contactId };
        }

        case "searchContacts": {
          const body = {
            filterGroups: config.filterGroups ? (typeof config.filterGroups === "string" ? JSON.parse(config.filterGroups) : config.filterGroups) : [],
            query: config.query,
            limit: Math.min(Number(config.limit ?? 20), 100),
            properties: ["email", "firstname", "lastname", "phone", "company"],
          };
          const res = await axios.post(`${BASE}/crm/v3/objects/contacts/search`, body, { headers: h, timeout: 15000 });
          return { contacts: res.data.results?.map((c) => ({ id: c.id, ...c.properties })) ?? [], total: res.data.total };
        }

        case "createDeal": {
          if (!config.dealName) return { success: false, error: "HubSpot createDeal: 'dealName' is required — configure this field.", skipped: true };
          const properties = { dealname: config.dealName };
          if (config.amount) properties.amount = String(config.amount);
          if (config.stage) properties.dealstage = config.stage;
          if (config.closeDate) properties.closedate = config.closeDate;
          if (config.ownerId) properties.hubspot_owner_id = config.ownerId;
          const res = await axios.post(`${BASE}/crm/v3/objects/deals`, { properties }, { headers: h, timeout: 15000 });
          return { id: res.data.id, dealName: res.data.properties?.dealname, stage: res.data.properties?.dealstage, createdAt: res.data.createdAt };
        }

        case "getDeal": {
          if (!config.dealId) throw new Error("HubSpot getDeal: 'dealId' is required.");
          const res = await axios.get(`${BASE}/crm/v3/objects/deals/${config.dealId}`, { headers: h, timeout: 15000, params: { properties: "dealname,amount,dealstage,closedate,hubspot_owner_id" } });
          return { id: res.data.id, ...res.data.properties };
        }

        case "updateDeal": {
          if (!config.dealId) throw new Error("HubSpot updateDeal: 'dealId' is required.");
          const properties = {};
          if (config.dealName) properties.dealname = config.dealName;
          if (config.amount) properties.amount = String(config.amount);
          if (config.stage) properties.dealstage = config.stage;
          if (config.closeDate) properties.closedate = config.closeDate;
          await axios.patch(`${BASE}/crm/v3/objects/deals/${config.dealId}`, { properties }, { headers: h, timeout: 15000 });
          return { updated: true, dealId: config.dealId };
        }

        case "createNote": {
          if (!config.body) throw new Error("HubSpot createNote: 'body' is required.");
          const properties = { hs_note_body: config.body, hs_timestamp: new Date().toISOString() };
          const res = await axios.post(`${BASE}/crm/v3/objects/notes`, { properties }, { headers: h, timeout: 15000 });
          return { id: res.data.id, createdAt: res.data.createdAt };
        }

        case "listOwners": {
          const res = await axios.get(`${BASE}/crm/v3/owners`, { headers: h, timeout: 15000 });
          return { owners: res.data.results?.map((o) => ({ id: o.id, email: o.email, firstName: o.firstName, lastName: o.lastName })) ?? [], count: res.data.results?.length ?? 0 };
        }

        default:
          throw new Error(`HubSpot: Unknown operation "${operation}".`);
      }
    } catch (err) { handleError(err); }
  },
};
